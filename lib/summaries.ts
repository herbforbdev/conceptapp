import { Sale, Cost, Production, Inventory, SummaryData } from '../types';

export const calculateSalesSummary = (sales: Sale[]): SummaryData => {
  if (!sales.length) {
    return {
      totalUSD: 0,
      totalCDF: 0,
      count: 0,
      average: 0,
      growth: 0
    };
  }

  const totalUSD = sales.reduce((sum, sale) => sum + sale.amountUSD, 0);
  const totalCDF = sales.reduce((sum, sale) => sum + sale.amountFC, 0);
  const count = sales.length;
  const average = totalUSD / count;

  // Calculate growth compared to previous period
  const sortedSales = [...sales].sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentPeriodSales = sortedSales.slice(0, Math.floor(sortedSales.length / 2));
  const previousPeriodSales = sortedSales.slice(Math.floor(sortedSales.length / 2));

  const currentTotal = currentPeriodSales.reduce((sum, sale) => sum + sale.amountUSD, 0);
  const previousTotal = previousPeriodSales.reduce((sum, sale) => sum + sale.amountUSD, 0);
  
  const growth = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  return {
    totalUSD,
    totalCDF,
    count,
    average,
    growth
  };
};

export const calculateCostSummary = (costs: Cost[]): SummaryData => {
  if (!costs.length) {
    return {
      totalUSD: 0,
      totalCDF: 0,
      count: 0,
      average: 0,
      growth: 0
    };
  }

  const totalUSD = costs.reduce((sum, cost) => sum + cost.amountUSD, 0);
  const totalCDF = costs.reduce((sum, cost) => sum + cost.amountFC, 0);
  const count = costs.length;
  const average = totalUSD / count;

  // Calculate growth compared to previous period
  const sortedCosts = [...costs].sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentPeriodCosts = sortedCosts.slice(0, Math.floor(sortedCosts.length / 2));
  const previousPeriodCosts = sortedCosts.slice(Math.floor(sortedCosts.length / 2));

  const currentTotal = currentPeriodCosts.reduce((sum, cost) => sum + cost.amountUSD, 0);
  const previousTotal = previousPeriodCosts.reduce((sum, cost) => sum + cost.amountUSD, 0);
  
  const growth = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  return {
    totalUSD,
    totalCDF,
    count,
    average,
    growth
  };
};

export const calculateProductionSummary = (productions: Production[]): SummaryData => {
  if (!productions.length) {
    return {
      totalUSD: 0,
      totalCDF: 0,
      count: 0,
      average: 0,
      growth: 0
    };
  }

  const totalQuantity = productions.reduce((sum, prod) => sum + prod.quantityProduced, 0);
  const count = productions.length;
  const average = totalQuantity / count;

  // Calculate growth compared to previous period
  const sortedProductions = [...productions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentPeriodProds = sortedProductions.slice(0, Math.floor(sortedProductions.length / 2));
  const previousPeriodProds = sortedProductions.slice(Math.floor(sortedProductions.length / 2));

  const currentTotal = currentPeriodProds.reduce((sum, prod) => sum + prod.quantityProduced, 0);
  const previousTotal = previousPeriodProds.reduce((sum, prod) => sum + prod.quantityProduced, 0);
  
  const growth = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  return {
    totalUSD: 0, // Not applicable for production
    totalCDF: 0, // Not applicable for production
    count,
    average,
    growth
  };
};

export const calculateInventorySummary = (inventory: Inventory[]): SummaryData => {
  if (!inventory.length) {
    return {
      totalUSD: 0,
      totalCDF: 0,
      count: 0,
      average: 0,
      growth: 0
    };
  }

  const totalQuantity = inventory.reduce((sum, inv) => sum + inv.remainingQuantity, 0);
  const count = inventory.length;
  const average = totalQuantity / count;

  // Calculate growth compared to previous period
  const sortedInventory = [...inventory].sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentPeriodInv = sortedInventory.slice(0, Math.floor(sortedInventory.length / 2));
  const previousPeriodInv = sortedInventory.slice(Math.floor(sortedInventory.length / 2));

  const currentTotal = currentPeriodInv.reduce((sum, inv) => sum + inv.remainingQuantity, 0);
  const previousTotal = previousPeriodInv.reduce((sum, inv) => sum + inv.remainingQuantity, 0);
  
  const growth = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  return {
    totalUSD: 0, // Not applicable for inventory
    totalCDF: 0, // Not applicable for inventory
    count,
    average,
    growth
  };
}; 