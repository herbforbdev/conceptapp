import { Cost, ChartData } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { ExpenseType } from '@/types';

export interface CostsFilters {
  month?: number;       // 0-11 (JavaScript Date.getMonth())
  activityType?: string;
  expenseType?: string;
}

// Helper to parse Firestore Timestamp or JS Date to Date
const toDateObj = (d: Timestamp | Date | string): Date => {
  if (d instanceof Timestamp) return d.toDate();
  if (d instanceof Date) return d;
  return new Date(d);
};

// Filter costs based on month, activity type, and expense type
export function filterCosts(costs: Cost[], filters: CostsFilters): Cost[] {
  return costs.filter(cost => {
    // Date filter: month
    if (filters.month !== undefined && cost.date) {
      const date = toDateObj(cost.date);
      if (date.getMonth() !== filters.month) {
        return false;
      }
    }
    // Activity type filter
    if (filters.activityType && cost.activityTypeId !== filters.activityType) {
      return false;
    }
    // Expense type filter
    if (filters.expenseType && cost.expenseTypeId !== filters.expenseType) {
      return false;
    }
    return true;
  });
}

// Metrics summary for top cards
export interface CostsMetrics {
  dailyCDF: number;
  dailyUSD: number;
  monthlyCDF: number;
  monthlyUSD: number;
  monthlyGrowth: number; // percentage
}

export function calculateCostsMetrics(
  costs: Cost[],
  month?: number
): CostsMetrics {
  const now = new Date();
  const todayStr = now.toDateString();
  // Filter today's costs
  const todayCosts = costs.filter(cost => {
    const date = toDateObj(cost.date);
    return date.toDateString() === todayStr;
  });
  // Filter this month's costs
  const thisMonthCosts = costs.filter(cost => {
    const date = toDateObj(cost.date);
    const m = month !== undefined ? month : now.getMonth();
    return date.getMonth() === m && date.getFullYear() === now.getFullYear();
  });
  // Filter last month's costs
  const lastMonth = month !== undefined ? (month === 0 ? 11 : month - 1) : (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const lastMonthYear = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthCosts = costs.filter(cost => {
    const date = toDateObj(cost.date);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  });

  const sumCDF = (arr: Cost[]) => arr.reduce((sum, c) => sum + (c.amountFC || 0), 0);
  const sumUSD = (arr: Cost[]) => arr.reduce((sum, c) => sum + (c.amountUSD || 0), 0);

  const dailyCDF = sumCDF(todayCosts);
  const dailyUSD = sumUSD(todayCosts);
  const monthlyCDF = sumCDF(thisMonthCosts);
  const monthlyUSD = sumUSD(thisMonthCosts);
  const lastCDF = sumCDF(lastMonthCosts);

  const monthlyGrowth = lastCDF > 0 ? ((monthlyCDF - lastCDF) / lastCDF) * 100 : 0;

  return {
    dailyCDF,
    dailyUSD,
    monthlyCDF,
    monthlyUSD,
    monthlyGrowth,
  };
}

// Summary table data
export interface SummaryRow {
  label: string;
  amountCDF: number;
  amountUSD: number;
  percentage: number;
}

export function getCostSummaryTables(costs: Cost[]): {
  expenseSummary: SummaryRow[];
  activitySummary: SummaryRow[];
} {
  const totalUSD = costs.reduce((sum, c) => sum + (c.amountUSD || 0), 0);
  // Group by expense type
  const expenseMap: Record<string, { amountCDF: number; amountUSD: number }> = {};
  costs.forEach(c => {
    const key = c.expenseTypeId || 'Unknown';
    if (!expenseMap[key]) expenseMap[key] = { amountCDF: 0, amountUSD: 0 };
    expenseMap[key].amountCDF += c.amountFC || 0;
    expenseMap[key].amountUSD += c.amountUSD || 0;
  });
  const expenseSummary = Object.entries(expenseMap).map(([key, val]) => ({
    label: key,
    amountCDF: val.amountCDF,
    amountUSD: val.amountUSD,
    percentage: totalUSD > 0 ? (val.amountUSD / totalUSD) * 100 : 0
  })).sort((a, b) => b.amountUSD - a.amountUSD);

  // Group by activity type
  const activityMap: Record<string, { amountCDF: number; amountUSD: number }> = {};
  costs.forEach(c => {
    const key = c.activityTypeId || 'Unknown';
    if (!activityMap[key]) activityMap[key] = { amountCDF: 0, amountUSD: 0 };
    activityMap[key].amountCDF += c.amountFC || 0;
    activityMap[key].amountUSD += c.amountUSD || 0;
  });
  const activitySummary = Object.entries(activityMap).map(([key, val]) => ({
    label: key,
    amountCDF: val.amountCDF,
    amountUSD: val.amountUSD,
    percentage: totalUSD > 0 ? (val.amountUSD / totalUSD) * 100 : 0
  })).sort((a, b) => b.amountUSD - a.amountUSD);

  return { expenseSummary, activitySummary };
}

// Chart data for cost distribution and trend
export function getCostChartData(costs: Cost[]): {
  expenseDistribution: ChartData;
  activityDistribution: ChartData;
  monthlyTrend: ChartData;
} {
  // expense distribution data
  const { expenseSummary, activitySummary } = getCostSummaryTables(costs);

  const expenseDistribution: ChartData = {
    labels: expenseSummary.map(r => r.label),
    datasets: [{
      data: expenseSummary.map(r => r.amountUSD),
      backgroundColor: [] // optional colors can be set
    }]
  };

  const activityDistribution: ChartData = {
    labels: activitySummary.map(r => r.label),
    datasets: [{
      data: activitySummary.map(r => r.amountUSD),
      backgroundColor: []
    }]
  };

  // monthly trend by date
  const trendMap: Record<string, number> = {};
  costs.forEach(c => {
    const date = toDateObj(c.date);
    const key = date.toISOString().split('T')[0];
    trendMap[key] = (trendMap[key] || 0) + (c.amountUSD || 0);
  });
  const labels = Object.keys(trendMap).sort();
  const monthlyTrend: ChartData = {
    labels,
    datasets: [{ label: 'Amount (USD)', data: labels.map(d => trendMap[d]) }]
  };

  return { expenseDistribution, activityDistribution, monthlyTrend };
}

export const calculateTotalCosts = (costs: Cost[]): number => {
  return costs.reduce((total, cost) => total + (cost.amountUSD || 0), 0);
};

export const calculateDailyAverage = (
  costs: Cost[],
  startDate: Date | Timestamp,
  endDate: Date | Timestamp
): number => {
  const total = calculateTotalCosts(costs);
  const start = toDateObj(startDate);
  const end = toDateObj(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return total / days;
};

export const getTopExpenseType = (
  costs: Cost[],
  expenseTypeMap: Map<string, ExpenseType>
): { type: string; amount: number } => {
  const expenseTypeTotals = costs.reduce((acc, cost) => {
    const typeId = cost.expenseTypeId;
    const expenseType = expenseTypeMap.get(typeId);
    const key = expenseType?.name || 'Unknown';
    acc[key] = (acc[key] || 0) + (cost.amountUSD || 0);
    return acc;
  }, {} as Record<string, number>);

  const [topType, amount] = Object.entries(expenseTypeTotals)
    .sort(([, a], [, b]) => b - a)[0] || ['Unknown', 0];

  return {
    type: topType,
    amount
  };
};

export const calculateMonthOverMonthGrowth = (costs: Cost[]): {
  growth: number;
  trend: 'up' | 'down' | 'neutral';
} => {
  const now = new Date();
  const thisMonth = costs.filter(cost => {
    const date = toDateObj(cost.date);
    return date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear();
  });

  const lastMonth = costs.filter(cost => {
    const date = toDateObj(cost.date);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    return date.getMonth() === lastMonthDate.getMonth() && 
           date.getFullYear() === lastMonthDate.getFullYear();
  });

  const thisMonthTotal = calculateTotalCosts(thisMonth);
  const lastMonthTotal = calculateTotalCosts(lastMonth);

  if (lastMonthTotal === 0) {
    return { growth: 0, trend: 'neutral' };
  }

  const growth = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  return {
    growth: Math.round(growth * 10) / 10,
    trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
  };
}; 