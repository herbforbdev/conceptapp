export const TIME_PERIODS = {
  YEAR: 'YEAR',
  MONTH: 'MONTH',
  WEEK: 'WEEK',
  CUSTOM: 'CUSTOM'
} as const;

export const CARD_TYPES = {
  // Sales
  TOTAL_SALES: 'Total Sales',
  AVERAGE_SALE: 'Average Sale',
  BEST_SELLING: 'Best Selling',
  SALES_GROWTH: 'Sales Growth',
  
  // Costs
  TOTAL_COSTS: 'Total Costs',
  MONTHLY_COSTS: 'Monthly Costs',
  COST_GROWTH: 'Cost Growth',
  
  // Inventory
  TOTAL_INVENTORY: 'Total Inventory',
  STOCK_LEVEL: 'Stock Level',
  MONTHLY_MOVEMENT: 'Monthly Movement',
  BLOCK_ICE: 'Block Ice',
  CUBE_ICE: 'Cube Ice',
  WATER_BOTTLING: 'Water Bottling',
  PACKAGING: 'Packaging'
} as const;

export type TimePeriod = typeof TIME_PERIODS[keyof typeof TIME_PERIODS];
export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES]; 