/**
 * Cash Book Service
 * Aggregates Sales and Costs data into a unified cash book ledger
 */

import { ExchangeRateService } from '@/lib/exchangeRates';

/**
 * Helper to parse Firestore dates consistently
 */
function parseDate(date) {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (date.seconds) return new Date(date.seconds * 1000);
  return new Date(date);
}

/**
 * Generate cash book entries from Sales, Costs, and Manual entries for a specific month
 * @param {Array} sales - Sales records
 * @param {Array} costs - Costs records
 * @param {Array} manualEntries - Manual cash book entries
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {string} currency - 'FC' or 'USD'
 * @param {number} openingBalance - Opening balance for the month
 * @param {Object} masterData - { productMap, activityTypeMap, expenseTypeMap }
 * @returns {Array} Cash book entries
 */
export function generateCashBook(sales, costs, manualEntries = [], year, month, currency = 'FC', openingBalance = 0, masterData = {}) {
  const { productMap = new Map(), activityTypeMap = new Map(), expenseTypeMap = new Map() } = masterData;
  const entries = [];
  
  // Ensure we have arrays
  const salesArray = Array.isArray(sales) ? sales : [];
  const costsArray = Array.isArray(costs) ? costs : [];
  const manualEntriesArray = Array.isArray(manualEntries) ? manualEntries : [];
  
  // Process Sales (Cash In)
  let salesProcessed = 0;
  let salesFiltered = 0;
  salesArray.forEach(sale => {
    if (!sale || !sale.id) return;
    salesProcessed++;
    const saleDate = parseDate(sale.date);
    if (!saleDate || isNaN(saleDate.getTime())) {
      console.log('⚠️ Invalid sale date:', sale.date, sale.id);
      return;
    }
    
    // Filter by month/year
    if (saleDate.getFullYear() !== year || saleDate.getMonth() !== month) {
      salesFiltered++;
      return;
    }
    
    const product = productMap.get(sale.productId);
    const activityType = activityTypeMap.get(sale.activityTypeId);
    const productName = product?.productid || product?.name || 'Unknown Product';
    const activityName = activityType?.name || 'Unknown Activity';
    
    entries.push({
      date: saleDate,
      transactionType: 'SALE',
      reference: sale.id,
      description: `${productName} - ${activityName}${sale.channel ? ` (${sale.channel})` : ''}`,
      cashIn: currency === 'FC' ? (Number(sale.amountFC) || 0) : (Number(sale.amountUSD) || 0),
      cashOut: 0,
      exchangeRate: sale.exchangeRate || null,
      amountUSD: Number(sale.amountUSD) || 0,
      amountFC: Number(sale.amountFC) || 0
    });
  });
  
  // Process Costs (Cash Out)
  let costsProcessed = 0;
  let costsFiltered = 0;
  costsArray.forEach(cost => {
    if (!cost || !cost.id) return;
    costsProcessed++;
    const costDate = parseDate(cost.date);
    if (!costDate || isNaN(costDate.getTime())) {
      console.log('⚠️ Invalid cost date:', cost.date, cost.id);
      return;
    }
    
    // Filter by month/year
    if (costDate.getFullYear() !== year || costDate.getMonth() !== month) {
      costsFiltered++;
      return;
    }
    
    const expenseType = expenseTypeMap.get(cost.expenseTypeId);
    const activityType = activityTypeMap.get(cost.activityTypeId);
    const expenseName = expenseType?.name || 'Unknown Expense';
    const activityName = activityType?.name || 'Unknown Activity';
    
    entries.push({
      date: costDate,
      transactionType: 'COST',
      reference: cost.id,
      description: `${expenseName} - ${activityName}`,
      cashIn: 0,
      cashOut: currency === 'FC' ? (Number(cost.amountFC) || 0) : (Number(cost.amountUSD) || 0),
      exchangeRate: cost.exchangeRate || null,
      amountUSD: Number(cost.amountUSD) || 0,
      amountFC: Number(cost.amountFC) || 0
    });
  });
  
  // Process Manual Entries
  manualEntriesArray.forEach(entry => {
    if (!entry || !entry.id) return;
    const entryDate = parseDate(entry.date);
    if (!entryDate || isNaN(entryDate.getTime())) {
      console.log('⚠️ Invalid manual entry date:', entry.date, entry.id);
      return;
    }
    
    // Filter by month/year
    if (entryDate.getFullYear() !== year || entryDate.getMonth() !== month) {
      return;
    }
    
    const amount = currency === 'FC' 
      ? (Number(entry.amountFC) || 0) 
      : (Number(entry.amountUSD) || 0);
    
    entries.push({
      date: entryDate,
      transactionType: 'MANUAL',
      reference: entry.id,
      description: entry.description || 'Manual Entry',
      cashIn: entry.type === 'CREDIT' ? amount : 0,
      cashOut: entry.type === 'DEBIT' ? amount : 0,
      exchangeRate: Number(entry.exchangeRate) || null,
      amountUSD: Number(entry.amountUSD) || 0,
      amountFC: Number(entry.amountFC) || 0
    });
  });
  
  // Sort by date (and time if available)
  entries.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    // If same date, prioritize sales over costs, then manual entries
    if (a.transactionType === 'SALE' && b.transactionType !== 'SALE') return -1;
    if (a.transactionType === 'COST' && b.transactionType === 'MANUAL') return -1;
    if (a.transactionType === 'MANUAL' && b.transactionType === 'SALE') return 1;
    return 0;
  });
  
  // Calculate running balance (start with opening balance)
  let runningBalance = openingBalance;
  entries.forEach(entry => {
    runningBalance = runningBalance + entry.cashIn - entry.cashOut;
    entry.balance = runningBalance;
  });
  
  console.log('📈 Cash Book Generation Summary:', {
    totalSales: salesArray.length,
    salesProcessed,
    salesFiltered,
    salesInMonth: entries.filter(e => e.transactionType === 'SALE').length,
    totalCosts: costsArray.length,
    costsProcessed,
    costsFiltered,
    costsInMonth: entries.filter(e => e.transactionType === 'COST').length,
    totalEntries: entries.length,
    year,
    month
  });
  
  return entries;
}

/**
 * Calculate opening balance (sum of all transactions before the selected month)
 * @param {Array} sales - Sales records
 * @param {Array} costs - Costs records
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {string} currency - 'FC' or 'USD'
 * @returns {number} Opening balance
 */
export function calculateOpeningBalance(sales, costs, manualEntries = [], year, month, currency = 'FC') {
  const cutoffDate = new Date(year, month, 1);
  
  let balance = 0;
  
  const salesArray = Array.isArray(sales) ? sales : [];
  const costsArray = Array.isArray(costs) ? costs : [];
  const manualEntriesArray = Array.isArray(manualEntries) ? manualEntries : [];
  
  // Sum all sales before the month
  salesArray.forEach(sale => {
    if (!sale) return;
    const saleDate = parseDate(sale.date);
    if (!saleDate || isNaN(saleDate.getTime())) return;
    if (saleDate < cutoffDate) {
      balance += currency === 'FC' ? (Number(sale.amountFC) || 0) : (Number(sale.amountUSD) || 0);
    }
  });
  
  // Subtract all costs before the month
  costsArray.forEach(cost => {
    if (!cost) return;
    const costDate = parseDate(cost.date);
    if (!costDate || isNaN(costDate.getTime())) return;
    if (costDate < cutoffDate) {
      balance -= currency === 'FC' ? (Number(cost.amountFC) || 0) : (Number(cost.amountUSD) || 0);
    }
  });
  
  // Process manual entries before the month
  manualEntriesArray.forEach(entry => {
    if (!entry) return;
    const entryDate = parseDate(entry.date);
    if (!entryDate || isNaN(entryDate.getTime())) return;
    if (entryDate < cutoffDate) {
      const amount = currency === 'FC' 
        ? (Number(entry.amountFC) || 0) 
        : (Number(entry.amountUSD) || 0);
      if (entry.type === 'CREDIT') {
        balance += amount;
      } else if (entry.type === 'DEBIT') {
        balance -= amount;
      }
    }
  });
  
  return balance;
}

/**
 * Get summary statistics for the cash book
 * @param {Array} entries - Cash book entries
 * @returns {Object} Summary stats
 */
export function getCashBookSummary(entries) {
  const totalCashIn = entries.reduce((sum, entry) => sum + entry.cashIn, 0);
  const totalCashOut = entries.reduce((sum, entry) => sum + entry.cashOut, 0);
  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
  const openingBalance = entries.length > 0 ? entries[0].balance - entries[0].cashIn + entries[0].cashOut : 0;
  
  return {
    openingBalance,
    totalCashIn,
    totalCashOut,
    closingBalance,
    netFlow: totalCashIn - totalCashOut
  };
}

