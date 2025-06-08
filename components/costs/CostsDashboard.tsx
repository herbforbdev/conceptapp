import React, { useMemo } from 'react';
import { HiCurrencyDollar, HiCalculator, HiTag, HiTrendingUp } from 'react-icons/hi';
import TopCard from '@/components/shared/TopCard';
import { Cost, ExpenseType } from '@/types';
import {
  calculateTotalCosts,
  calculateDailyAverage,
  getTopExpenseType,
  calculateMonthOverMonthGrowth
} from '@/lib/analysis/costsAnalysis';

interface CostsDashboardProps {
  costs: Cost[];
  expenseTypes: Map<string, ExpenseType> | Record<string, ExpenseType>;
  startDate: Date;
  endDate: Date;
}

export default function CostsDashboard({
  costs,
  expenseTypes,
  startDate,
  endDate
}: CostsDashboardProps) {
  // Convert expenseTypes to Map if it's a Record
  const expenseTypeMap = useMemo(() => {
    if (expenseTypes instanceof Map) return expenseTypes;
    return new Map(Object.entries(expenseTypes));
  }, [expenseTypes]);

  // Debug logging
  console.log('CostsDashboard Props:', {
    costs: costs?.length,
    expenseTypesSize: expenseTypeMap.size,
    startDate,
    endDate
  });

  // Calculate metrics using memoization to avoid unnecessary recalculations
  const totalCosts = useMemo(() => calculateTotalCosts(costs), [costs]);
  
  const dailyAverage = useMemo(() => 
    calculateDailyAverage(costs, startDate, endDate),
    [costs, startDate, endDate]
  );
  
  const topExpense = useMemo(() => {
    const result = getTopExpenseType(costs, expenseTypeMap);
    console.log('Top Expense Result:', result);
    return result;
  }, [costs, expenseTypeMap]);
  
  const growth = useMemo(() => 
    calculateMonthOverMonthGrowth(costs),
    [costs]
  );

  // Format numbers for display
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  const formatPercent = (value: number) =>
    `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Costs Card */}
      <TopCard
        title="Total Costs"
        value={formatCurrency(totalCosts)}
        icon={<HiCurrencyDollar className="h-4 w-4" />}
        type="Total Costs"
        className="bg-purple-50"
      />

      {/* Daily Average Card */}
      <TopCard
        title="Daily Average"
        value={formatCurrency(dailyAverage)}
        icon={<HiCalculator className="h-4 w-4" />}
        type="Monthly Costs"
        className="bg-blue-50"
      />

      {/* Top Expense Type Card */}
      <TopCard
        title="Top Expense Type"
        value={topExpense.type}
        subValue={formatCurrency(topExpense.amount)}
        icon={<HiTag className="h-4 w-4" />}
        type="Best Selling"
        className="bg-amber-50"
      />

      {/* Cost Growth Card */}
      <TopCard
        title="Cost Growth"
        value={formatPercent(growth.growth)}
        icon={<HiTrendingUp className="h-4 w-4" />}
        type="Cost Growth"
        trend={growth.trend}
        className={growth.trend === 'up' ? 'bg-red-50' : 'bg-green-50'}
      />
    </div>
  );
} 