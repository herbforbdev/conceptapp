import { Sale, Cost, Production, Inventory, Product, ActivityType, ExpenseType, PeriodSummary, DistributionSummary } from '../../types/index';
import { Timestamp } from 'firebase/firestore';

interface BaseEntity {
  id: string;
  date: Timestamp;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface TimePeriodFilter {
  timePeriod: string;
  month?: number;
  year?: number;
  week?: number;
  startDate?: string;
  endDate?: string;
}

// Helper function to safely get a date from various formats
const getDateFromField = (date: any): Date => {
  if (!date) return new Date();
  if (date.toDate) return date.toDate();
  if (date instanceof Date) return date;
  return new Date(date);
};

// Process data by time period with improved date handling
export const groupByPeriod = <T extends { date: any }>(
  data: T[],
  period: 'day' | 'month' | 'year'
): Record<string, T[]> => {
  return data.reduce((acc, item) => {
    const date = getDateFromField(item.date);
    let key: string;
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
    }
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

// Calculate period-over-period growth
export const calculateGrowth = (current: number, previous: number): number => {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Process sales distribution with improved relationship handling
export const analyzeSalesDistribution = (
  sales: Sale[],
  dimension: 'product' | 'channel' | 'activityType',
  masterData: {
    productMap: Map<string, Product>,
    activityTypeMap: Map<string, ActivityType>
  }
): DistributionSummary => {
  const distribution: Record<string, number> = {};
  let total = 0;

  sales.forEach(sale => {
    let key = '';
    switch (dimension) {
      case 'product':
        const product = masterData.productMap.get(sale.productId);
        key = product?.productid || 'Unknown Product';
        break;
      case 'channel':
        key = sale.channel || 'Unknown Channel';
        break;
      case 'activityType':
        const activity = masterData.activityTypeMap.get(sale.activityTypeId);
        key = activity?.name || 'Unknown Activity';
        break;
    }
    
    distribution[key] = (distribution[key] || 0) + sale.amountUSD;
    total += sale.amountUSD;
  });

  const sortedEntries = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a);

  return {
    labels: sortedEntries.map(([label]) => label),
    values: sortedEntries.map(([, value]) => value),
    percentages: sortedEntries.map(([, value]) => (value / total) * 100),
    total
  };
};

// Process costs distribution with improved expense type handling
export const analyzeCostsDistribution = (
  costs: Cost[],
  expenseTypeMap: Map<string, ExpenseType>
): DistributionSummary => {
  const distribution: Record<string, number> = {};
  let total = 0;

  costs.forEach(cost => {
    const expenseType = expenseTypeMap.get(cost.expenseTypeId);
    const key = expenseType?.name || 'Unknown Expense';
    distribution[key] = (distribution[key] || 0) + cost.amountUSD;
    total += cost.amountUSD;
  });

  const sortedEntries = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a);

  return {
    labels: sortedEntries.map(([label]) => label),
    values: sortedEntries.map(([, value]) => value),
    percentages: sortedEntries.map(([, value]) => (value / total) * 100),
    total
  };
};

// Process production data with improved product type handling
export const analyzeProduction = (
  productions: Production[],
  productMap: Map<string, Product>,
  activityTypeMap: Map<string, ActivityType>
): DistributionSummary => {
  const distribution: Record<string, number> = {};
  let total = 0;

  productions.forEach(prod => {
    const product = productMap.get(prod.productId);
    const activityType = activityTypeMap.get(prod.activityTypeId);
    
    // Use activity type name if available, otherwise use product type
    const category = activityType?.name || product?.producttype || 'Unknown Type';
    distribution[category] = (distribution[category] || 0) + prod.quantityProduced;
    total += prod.quantityProduced;
  });

  const sortedEntries = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a);

  return {
    labels: sortedEntries.map(([label]) => label),
    values: sortedEntries.map(([, value]) => value),
    percentages: sortedEntries.map(([, value]) => (value / total) * 100),
    total
  };
};

// New function to analyze packaging usage
export const analyzePackagingUsage = (
  productions: Production[],
  productMap: Map<string, Product>
): DistributionSummary => {
  const distribution: Record<string, number> = {};
  let total = 0;

  productions.forEach(prod => {
    if (prod.packagingUsed && prod.packagingQuantity) {
      const packaging = productMap.get(prod.packagingUsed);
      const packagingName = packaging?.productid || 'Unknown Packaging';
      distribution[packagingName] = (distribution[packagingName] || 0) + prod.packagingQuantity;
      total += prod.packagingQuantity;
    }
  });

  const sortedEntries = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a);

  return {
    labels: sortedEntries.map(([label]) => label),
    values: sortedEntries.map(([, value]) => value),
    percentages: sortedEntries.map(([, value]) => (value / total) * 100),
    total
  };
};

// New function to calculate production efficiency
export const calculateProductionEfficiency = (
  productions: Production[],
  productMap: Map<string, Product>
): Record<string, number> => {
  const efficiency: Record<string, number> = {};
  
  // Group productions by product
  const productionsByProduct = productions.reduce((acc, prod) => {
    if (!acc[prod.productId]) acc[prod.productId] = [];
    acc[prod.productId].push(prod);
    return acc;
  }, {} as Record<string, Production[]>);

  // Calculate average production quantity per product
  Object.entries(productionsByProduct).forEach(([productId, prods]) => {
    const product = productMap.get(productId);
    if (product) {
      const avgQuantity = prods.reduce((sum, p) => sum + p.quantityProduced, 0) / prods.length;
      efficiency[product.productid] = avgQuantity;
    }
  });

  return efficiency;
};

// Calculate period summary with improved currency handling
export const calculatePeriodSummary = <T extends { amountUSD?: number; amountFC?: number; date: any }>(
  data: T[],
  period: 'current' | 'previous'
): PeriodSummary => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isCurrentPeriod = (date: Date) => {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const isPreviousPeriod = (date: Date) => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  };

  const currentPeriodData = data.filter(item => 
    isCurrentPeriod(getDateFromField(item.date))
  );

  const previousPeriodData = data.filter(item => 
    isPreviousPeriod(getDateFromField(item.date))
  );

  const currentTotalUSD = currentPeriodData.reduce((sum, item) => sum + (item.amountUSD || 0), 0);
  const currentTotalCDF = currentPeriodData.reduce((sum, item) => sum + (item.amountFC || 0), 0);
  const previousTotalUSD = previousPeriodData.reduce((sum, item) => sum + (item.amountUSD || 0), 0);
  const previousTotalCDF = previousPeriodData.reduce((sum, item) => sum + (item.amountFC || 0), 0);

  return {
    current: {
      totalUSD: currentTotalUSD,
      totalCDF: currentTotalCDF,
      count: currentPeriodData.length
    },
    previous: {
      totalUSD: previousTotalUSD,
      totalCDF: previousTotalCDF,
      count: previousPeriodData.length
    },
    growth: calculateGrowth(currentTotalUSD, previousTotalUSD)
  };
};

export function filterByDateRange<T extends BaseEntity>(data: T[], dateRange: DateRange): T[] {
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  return data.filter(item => {
    const itemDate = item.date.toDate();
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function filterByTimePeriod<T extends BaseEntity>(data: T[], filter: TimePeriodFilter): T[] {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (filter.timePeriod) {
    case 'YEAR':
      startDate = new Date(filter.year || now.getFullYear(), 0, 1);
      endDate = new Date(filter.year || now.getFullYear(), 11, 31);
      break;
    case 'MONTH':
      startDate = new Date(filter.year || now.getFullYear(), filter.month || now.getMonth(), 1);
      endDate = new Date(filter.year || now.getFullYear(), (filter.month || now.getMonth()) + 1, 0);
      break;
    case 'WEEK':
      const currentDay = now.getDay();
      startDate = new Date(now.getTime() - currentDay * 24 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      break;
    case 'CUSTOM':
      if (filter.startDate && filter.endDate) {
        startDate = new Date(filter.startDate);
        endDate = new Date(filter.endDate);
      } else {
        return data;
      }
      break;
    default:
      return data;
  }

  return data.filter(item => {
    const itemDate = item.date.toDate();
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function groupByDate<T extends BaseEntity>(data: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  data.forEach(item => {
    const dateKey = item.date.toDate().toISOString().split('T')[0];
    const group = groups.get(dateKey) || [];
    group.push(item);
    groups.set(dateKey, group);
  });

  return groups;
}

export function calculateDailyAverage<T extends BaseEntity & { amount: number }>(data: T[]): number {
  if (data.length === 0) return 0;

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const uniqueDates = new Set(data.map(item => item.date.toDate().toISOString().split('T')[0]));

  return totalAmount / uniqueDates.size;
}

export function calculateMonthlyGrowth<T extends BaseEntity & { amount: number }>(data: T[]): number {
  if (data.length === 0) return 0;

  const monthlyTotals = new Map<string, number>();

  data.forEach(item => {
    const date = item.date.toDate();
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const currentTotal = monthlyTotals.get(monthKey) || 0;
    monthlyTotals.set(monthKey, currentTotal + item.amount);
  });

  const sortedMonths = Array.from(monthlyTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedMonths.length < 2) return 0;

  const currentMonth = sortedMonths[sortedMonths.length - 1][1];
  const previousMonth = sortedMonths[sortedMonths.length - 2][1];

  if (previousMonth === 0) return 100;

  return ((currentMonth - previousMonth) / previousMonth) * 100;
}

/**
 * Returns a grouped, deduped, and matched summary for the inventory summary table.
 * @param inventory Array of inventory movements
 * @param products Array of all products
 * @param productMap Map of productid to product
 * @param activityTypeMap Map of activityTypeId to activityType
 * @param getCurrentTotalStock Function to get current stock for a productid
 * @returns Array of sections for the summary table
 */
export function getInventorySummaryTableData({
  inventory,
  products,
  productMap,
  activityTypeMap,
  getCurrentTotalStock
}: {
  inventory: any[],
  products: any[],
  productMap: Map<string, any>,
  activityTypeMap: Map<string, any>,
  getCurrentTotalStock: (productid: string) => number
}): Array<{ section: string, rows: any[] }> {
  // Helper: group products by type
  const groupByType = (type: string) => products.filter(p => p.producttype === type);
  // Helper: get all packaging products
  const isPackaging = (p: any) => p.producttype?.toLowerCase().includes('packaging');
  const packagingProducts = products.filter(isPackaging);

  // Helper: match packaging to product by type, size, and activityType
  function matchPackaging(mainProduct: any) {
    if (!mainProduct || !mainProduct.productid) return null;
    const mainType = mainProduct.producttype;
    let mainSize = '';
    if (typeof mainProduct.productid === 'string') {
      const match = mainProduct.productid.match(/\d+[,.]?\d*\s*(kg|l|ml)/i);
      mainSize = match && match[0] ? match[0].replace(' ', '').toLowerCase() : '';
    }
    const mainActivity = mainProduct.activitytypeid;
    return packagingProducts.find(pack => {
      if (!pack || !pack.productid) return false;
      const packType = pack.producttype;
      let packSize = '';
      if (typeof pack.productid === 'string') {
        const match = pack.productid.match(/\d+[,.]?\d*\s*(kg|l|ml)/i);
        packSize = match && match[0] ? match[0].replace(' ', '').toLowerCase() : '';
      }
      const packActivity = pack.activitytypeid;
      return (
        packType && mainType && packType.toLowerCase().includes(mainType.toLowerCase()) &&
        packSize && mainSize && packSize === mainSize &&
        packActivity && mainActivity && packActivity === mainActivity
      );
    });
  }

  // Track rendered packaging IDs to avoid duplicates
  const renderedPackagingIds = new Set();
  const renderedProductIds = new Set();

  // Build sections
  const sections = [];
  // Block Ice
  const blockIceRows = groupByType('Block Ice').map(product => {
    renderedProductIds.add(product.productid);
    return {
      key: `block-ice-${product.productid}`,
      product,
      productStock: getCurrentTotalStock(product.productid),
      packaging: null,
      packagingStock: null
    };
  });
  if (blockIceRows.length) sections.push({ section: 'Block Ice', rows: blockIceRows });

  // Cube Ice
  const cubeIceRows = groupByType('Cube Ice').map(product => {
    renderedProductIds.add(product.productid);
    const packaging = matchPackaging(product);
    let packagingStock = null;
    if (packaging) {
      packagingStock = getCurrentTotalStock(packaging.productid);
      renderedPackagingIds.add(packaging.productid);
    }
    return {
      key: `cube-ice-${product.productid}` + (packaging ? `-${product.productid}` : ''),
      product,
      productStock: getCurrentTotalStock(product.productid),
      packaging: packaging || null,
      packagingStock: packagingStock
    };
  });
  if (cubeIceRows.length) sections.push({ section: 'Cube Ice', rows: cubeIceRows });

  // Water Bottling
  const waterBottlingRows = groupByType('Water Bottling').map(product => {
    renderedProductIds.add(product.productid);
    const packaging = matchPackaging(product);
    let packagingStock = null;
    if (packaging) {
      packagingStock = getCurrentTotalStock(packaging.productid);
      renderedPackagingIds.add(packaging.productid);
    }
    return {
      key: `water-bottling-${product.productid}` + (packaging ? `-${product.productid}` : ''),
      product,
      productStock: getCurrentTotalStock(product.productid),
      packaging: packaging || null,
      packagingStock: packagingStock
    };
  });
  if (waterBottlingRows.length) sections.push({ section: 'Water Bottling', rows: waterBottlingRows });

  // Packaging Only (not matched to any product, stock > 0)
  const packagingOnlyRows = packagingProducts
    .filter(pack => !renderedPackagingIds.has(pack.productid) && getCurrentTotalStock(pack.productid) > 0)
    .map(packaging => ({
      key: `packaging-only-${packaging.productid}`,
      product: null,
      productStock: null,
      packaging,
      packagingStock: getCurrentTotalStock(packaging.productid)
    }));
  if (packagingOnlyRows.length) sections.push({ section: 'Packaging Only', rows: packagingOnlyRows });

  return sections;
} 