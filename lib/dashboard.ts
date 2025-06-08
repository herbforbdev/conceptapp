import { Sale, Cost, Production, Inventory, ChartData } from '@/types/index';

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export function getTopProducts(sales: Sale[], topN = 3) {
  const productSales: Record<string, { usd: number; cdf: number; count: number }> = {};
  sales.forEach(sale => {
    if (!sale.productId) return;
    productSales[sale.productId] = productSales[sale.productId] || { usd: 0, cdf: 0, count: 0 };
    productSales[sale.productId].usd += sale.amountUSD || 0;
    productSales[sale.productId].cdf += sale.amountFC || 0;
    productSales[sale.productId].count += 1;
  });
  return Object.entries(productSales)
    .map(([productId, vals]) => ({ productId, ...vals }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, topN);
}

export function getTopExpenses(costs: Cost[], topN = 3) {
  const expenseTypes: Record<string, { usd: number; cdf: number; count: number }> = {};
  costs.forEach(cost => {
    if (!cost.expenseTypeName) return;
    expenseTypes[cost.expenseTypeName] = expenseTypes[cost.expenseTypeName] || { usd: 0, cdf: 0, count: 0 };
    expenseTypes[cost.expenseTypeName].usd += cost.amountUSD || 0;
    expenseTypes[cost.expenseTypeName].cdf += cost.amountFC || 0;
    expenseTypes[cost.expenseTypeName].count += 1;
  });
  return Object.entries(expenseTypes)
    .map(([expenseType, vals]) => ({ expenseType, ...vals }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, topN);
}

export function calculateProductivity(productions: Production[], target: number): number {
  const totalProduction = productions.reduce((sum, prod) => sum + (prod.quantityProduced || 0), 0);
  return (totalProduction / target) * 100;
}

// Add more aggregation/chart helpers as needed 