"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Button } from 'flowbite-react';
import { useLanguage } from '@/context/LanguageContext';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/context/AuthContext';
import AdminOnly from '@/components/AdminOnly';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  HiArrowNarrowLeft, 
  HiDocumentDownload,
  HiCurrencyDollar,
  HiTrendingUp,
  HiTrendingDown,
  HiPencil,
  HiTrash,
  HiCheck,
  HiX
} from 'react-icons/hi';
import Link from 'next/link';
import { generateCashBook, calculateOpeningBalance, getCashBookSummary } from '@/services/firestore/cashBookService';
import { useReactToPrint } from 'react-to-print';
import { addManualCashBookEntry, getManualCashBookEntries, updateManualCashBookEntry, deleteManualCashBookEntry } from '@/services/firestore/manualCashBookService';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { Modal, TextInput, Label, Select } from 'flowbite-react';
import { HiPlus } from 'react-icons/hi';

// PDF Print Configuration - Customize these settings
const PDF_CONFIG = {
  // Page Settings
  page: {
    size: 'A4', // Options: 'A4', 'A3', 'Letter', 'Legal', or custom like '210mm 297mm'
    orientation: 'portrait', // 'portrait' or 'landscape'
    margin: {
      top: '15mm',
      right: '10mm',
      bottom: '15mm',
      left: '10mm'
    }
  },
  
  // Header Settings
  header: {
    enabled: true,
    fontSize: '10pt',
    color: '#666',
    // Customize header content in the handlePrint function below
  },
  
  // Footer Settings
  footer: {
    enabled: true,
    showPageNumbers: true, // Shows "Page X of Y"
    fontSize: '9pt',
    color: '#666'
  },
  
  // Typography
  typography: {
    bodyFontSize: '11pt',
    tableFontSize: '10pt',
    lineHeight: '1.4'
  },
  
  // Table Settings
  table: {
    borderCollapse: true,
    repeatHeader: true, // Repeat table headers on each page
    avoidRowBreak: true // Prevent rows from breaking across pages
  },
  
  // Colors
  colors: {
    preserveColors: true // Keep background colors in PDF
  }
};

// Helper function to parse Firestore dates
function parseDate(date) {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (date.seconds) return new Date(date.seconds * 1000);
  return new Date(date);
}

// Helper function to get translated expense type names
function getTranslatedExpenseTypeName(expenseType, t) {
  if (!expenseType) return 'N/A';
  const name = expenseType.name || expenseType;
  if (!name) return 'N/A';
  
  const expenseTypeTranslationMap = {
    "Generator Fuel": "generator_fuel",
    "Maintenance & Repairs of Machines": "maintenance_&_repairs_of_machines",
    "Maintenance et réparations des machines": "entretien_&_réparations_des_machines",
    "Electricity": "electricity",
    "Water": "water",
    "Salaries": "salaries",
    "Transport": "transport",
    "Office Supplies": "office_supplies",
    "Marketing": "marketing",
    "Insurance": "insurance",
    "Rent": "rent",
    "Other": "other"
  };
  
  if (expenseTypeTranslationMap[name]) {
    const translated = t(`masterData.expenses.types.${expenseTypeTranslationMap[name]}`, '');
    if (translated && translated !== `masterData.expenses.types.${expenseTypeTranslationMap[name]}`) {
      return translated;
    }
  }
  
  const keyVariations = [
    name.replace(/\s+/g, '_').replace(/&/g, '&').toLowerCase(),
    name.replace(/\s+/g, '_').replace(/&/g, '_&_').toLowerCase(),
    name.replace(/\s+/g, '_').replace(/&/g, '').toLowerCase(),
    name.replace(/\s+/g, '').replace(/&/g, ''),
    name.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/à/g, 'a').replace(/ç/g, 'c')
  ];
  
  for (const key of keyVariations) {
    const translated = t(`masterData.expenses.types.${key}`, '');
    if (translated && translated !== `masterData.expenses.types.${key}`) {
      return translated;
    }
  }
  
  return name;
}

// Helper function to get translated activity type names
function getTranslatedActivityTypeName(activityType, t) {
  if (!activityType) return 'N/A';
  const name = activityType.name || activityType;
  if (!name) return 'N/A';
  
  const activityTypeTranslationMap = {
    "Block Ice": "block_ice",
    "Cube Ice & Water Bottling": "cube_ice_water_bottling"
  };
  
  if (activityTypeTranslationMap[name]) {
    const translated = t(`masterData.activities.${activityTypeTranslationMap[name]}`, '');
    if (translated && translated !== `masterData.activities.${activityTypeTranslationMap[name]}`) {
      return translated;
    }
  }
  
  const keyVariations = [
    name.replace(/\s+/g, '_').replace(/&/g, '_').toLowerCase(),
    name.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/à/g, 'a').replace(/ç/g, 'c'),
    name.replace(/\s+/g, '_').toLowerCase(),
    name.replace(/\s+/g, '').replace(/&/g, ''),
    name.replace(/\s+/g, '').toLowerCase()
  ];
  
  for (const key of keyVariations) {
    const translated = t(`masterData.activities.${key}`, '');
    if (translated && translated !== `masterData.activities.${key}`) {
      return translated;
    }
  }
  
  for (const key of keyVariations) {
    const translated = t(`masterData.activities.types.${key}`, '');
    if (translated && translated !== `masterData.activities.types.${key}`) {
      return translated;
    }
  }
  
  return name;
}

// Helper function to get translated product names
function getTranslatedProductName(product, t) {
  if (!product) return 'Unknown Product';
  const name = product.productid || product.name || 'Unknown Product';
  return name; // Products are typically not translated in the same way
}

// Safe translation function
function safeT(t, key, fallback) {
  try {
    const value = t(key);
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return String(fallback || key);
  } catch (error) {
    return String(fallback || key);
  }
}

// Format currency
function formatCurrency(amount, currency = 'FC') {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  // Format CDF with spaces as thousands separators (e.g., 55 000 550 CDF)
  // Use 'fr-FR' locale which uses non-breaking spaces, then ensure regular spaces
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  // Replace any non-breaking spaces or other whitespace with regular spaces
  return formatted.replace(/\s/g, ' ') + ' CDF';
}

export default function CashBookPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: sales, loading: salesLoading } = useFirestoreCollection("Sales");
  const { data: costs, loading: costsLoading } = useFirestoreCollection("Costs");
  const { data: manualEntries = [], loading: manualEntriesLoading } = useFirestoreCollection("ManualCashBookEntries");
  const { productMap, activityTypeMap, expenseTypeMap } = useMasterData();
  const { getPrintStyles } = usePrintSettings();
  
  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set();
    const salesArray = Array.isArray(sales) ? sales : [];
    const costsArray = Array.isArray(costs) ? costs : [];
    salesArray.forEach(s => {
      const d = parseDate(s.date);
      if (d && !isNaN(d.getTime())) years.add(d.getFullYear());
    });
    costsArray.forEach(c => {
      const d = parseDate(c.date);
      if (d && !isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, costs]);
  
  // Set default year to most recent year with data, or current year if no data yet
  const defaultYear = availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  const defaultMonth = new Date().getMonth() + 1;
  
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [currency, setCurrency] = useState('FC'); // 'FC' or 'USD'
  const [cashBookEntries, setCashBookEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(20);
  
  // Add Entry Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'DEBIT', // 'CREDIT' or 'DEBIT'
    amountFC: '',
    amountUSD: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tab state for organizing tables
  const [activeTab, setActiveTab] = useState('records');
  
  // Inline edit state for manual entries
  const [editingRow, setEditingRow] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Update selected year when available years change (e.g., when data loads)
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]); // Set to most recent year with data
    }
  }, [availableYears, selectedYear]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, currency]);
  
  // Calculate pagination
  const totalPages = useMemo(() => {
    return Math.ceil(cashBookEntries.length / entriesPerPage);
  }, [cashBookEntries.length, entriesPerPage]);
  
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    return cashBookEntries.slice(startIndex, endIndex);
  }, [cashBookEntries, currentPage, entriesPerPage]);
  
  const paginationInfo = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, cashBookEntries.length);
    return {
      startIndex: startIndex + 1,
      endIndex,
      total: cashBookEntries.length
    };
  }, [currentPage, entriesPerPage, cashBookEntries.length]);
  
  // Daily Summary - Group entries by day
  const dailySummary = useMemo(() => {
    if (!cashBookEntries.length) return [];
    
    const dailyMap = new Map();
    
    cashBookEntries.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: entry.date,
          dateKey,
          cashIn: 0,
          cashOut: 0,
          transactions: 0,
          balance: entry.balance // Use the last entry's balance for that day
        });
      }
      const dayData = dailyMap.get(dateKey);
      dayData.cashIn += entry.cashIn || 0;
      dayData.cashOut += entry.cashOut || 0;
      dayData.transactions += 1;
      dayData.balance = entry.balance; // Update to latest balance for the day
    });
    
    return Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.dateKey) - new Date(b.dateKey)
    );
  }, [cashBookEntries]);
  
  // Transaction Type Summary
  const transactionTypeSummary = useMemo(() => {
    if (!cashBookEntries.length) return { sales: 0, costs: 0, manual: 0, total: 0 };
    
    const summary = {
      sales: { cashIn: 0, cashOut: 0, count: 0 },
      costs: { cashIn: 0, cashOut: 0, count: 0 },
      manual: { cashIn: 0, cashOut: 0, count: 0 },
      total: { cashIn: 0, cashOut: 0, count: 0 }
    };
    
    cashBookEntries.forEach(entry => {
      const type = entry.transactionType;
      if (type === 'SALE') {
        summary.sales.cashIn += entry.cashIn || 0;
        summary.sales.cashOut += entry.cashOut || 0;
        summary.sales.count += 1;
      } else if (type === 'COST') {
        summary.costs.cashIn += entry.cashIn || 0;
        summary.costs.cashOut += entry.cashOut || 0;
        summary.costs.count += 1;
      } else if (type === 'MANUAL') {
        summary.manual.cashIn += entry.cashIn || 0;
        summary.manual.cashOut += entry.cashOut || 0;
        summary.manual.count += 1;
      }
      
      summary.total.cashIn += entry.cashIn || 0;
      summary.total.cashOut += entry.cashOut || 0;
      summary.total.count += 1;
    });
    
    return summary;
  }, [cashBookEntries]);
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const printRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Cash_Book_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`,
    pageStyle: getPrintStyles({ reportTitle: safeT(t, 'reports.cashBook.pageTitle', 'Monthly Cash Book') }),
    onBeforeGetContent: () => {
      // Ensure we're on page 1 to print all data
      if (currentPage !== 1) {
        setCurrentPage(1);
        return new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });
  
  // Generate cash book entries when data or filters change
  useEffect(() => {
    console.log('🔍 Cash Book Effect Triggered:', {
      salesLoading,
      costsLoading,
      salesIsNull: sales === null,
      costsIsNull: costs === null,
      salesLength: Array.isArray(sales) ? sales.length : 'not array',
      costsLength: Array.isArray(costs) ? costs.length : 'not array',
      selectedYear,
      selectedMonth
    });
    
    // Don't process if data is still loading or null
    if (salesLoading || costsLoading || manualEntriesLoading || sales === null || costs === null) {
      console.log('⏳ Waiting for data to load...');
      setLoading(true);
      return;
    }
    
    function generateEntries() {
      setLoading(true);
      try {
        const month = selectedMonth - 1; // Convert to 0-based
        const salesArray = Array.isArray(sales) ? sales : [];
        const costsArray = Array.isArray(costs) ? costs : [];
        const manualEntriesArray = Array.isArray(manualEntries) ? manualEntries : [];
        
        console.log('📊 Processing Cash Book:', {
          salesCount: salesArray.length,
          costsCount: costsArray.length,
          year: selectedYear,
          month: selectedMonth,
          monthIndex: month
        });
        
        // Debug: Check sample sales dates
        if (salesArray.length > 0) {
          const sampleSale = salesArray[0];
          const sampleDate = parseDate(sampleSale.date);
          console.log('📅 Sample Sale Date:', {
            raw: sampleSale.date,
            parsed: sampleDate,
            year: sampleDate?.getFullYear(),
            month: sampleDate?.getMonth(),
            matches: sampleDate?.getFullYear() === selectedYear && sampleDate?.getMonth() === month
          });
        }
        
        // Debug: Check sample costs dates
        if (costsArray.length > 0) {
          const sampleCost = costsArray[0];
          const sampleDate = parseDate(sampleCost.date);
          console.log('📅 Sample Cost Date:', {
            raw: sampleCost.date,
            parsed: sampleDate,
            year: sampleDate?.getFullYear(),
            month: sampleDate?.getMonth(),
            matches: sampleDate?.getFullYear() === selectedYear && sampleDate?.getMonth() === month
          });
        }
        
        const openingBalance = calculateOpeningBalance(salesArray, costsArray, manualEntriesArray, selectedYear, month, currency);
        console.log('💰 Opening Balance:', openingBalance);
        
        const masterData = { productMap, activityTypeMap, expenseTypeMap };
        
        const entries = generateCashBook(
          salesArray, 
          costsArray, 
          manualEntriesArray,
          selectedYear, 
          month, 
          currency, 
          openingBalance, 
          masterData
        );
        
        console.log('✅ Generated Entries:', entries.length);
        
        if (entries.length === 0) {
          console.warn('⚠️ No entries found! Checking all dates...');
          // Debug: Show all unique years/months in data
          const allYears = new Set();
          const allMonths = new Set();
          salesArray.forEach(s => {
            const d = parseDate(s.date);
            if (d && !isNaN(d.getTime())) {
              allYears.add(d.getFullYear());
              allMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
            }
          });
          costsArray.forEach(c => {
            const d = parseDate(c.date);
            if (d && !isNaN(d.getTime())) {
              allYears.add(d.getFullYear());
              allMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
            }
          });
          console.log('📅 Available years in data:', Array.from(allYears).sort());
          console.log('📅 Available year-month combinations:', Array.from(allMonths).sort());
          console.log('🔍 Looking for:', `${selectedYear}-${selectedMonth}`);
        }
        
        // Translate descriptions
        entries.forEach(entry => {
          if (entry.transactionType === 'SALE') {
            const parts = entry.description.split(' - ');
            if (parts.length >= 2) {
              const productName = parts[0];
              const activityName = parts[1];
              const product = Array.from(productMap.values()).find(p => (p.productid || p.name) === productName);
              const activityType = Array.from(activityTypeMap.values()).find(a => a.name === activityName);
              const translatedProduct = getTranslatedProductName(product, t);
              const translatedActivity = getTranslatedActivityTypeName(activityType, t);
              entry.description = `${translatedProduct} - ${translatedActivity}${parts[2] ? ' ' + parts[2] : ''}`;
            }
          } else if (entry.transactionType === 'COST') {
            const parts = entry.description.split(' - ');
            if (parts.length >= 2) {
              const expenseName = parts[0];
              const activityName = parts[1];
              const expenseType = Array.from(expenseTypeMap.values()).find(e => e.name === expenseName);
              const activityType = Array.from(activityTypeMap.values()).find(a => a.name === activityName);
              const translatedExpense = getTranslatedExpenseTypeName(expenseType, t);
              const translatedActivity = getTranslatedActivityTypeName(activityType, t);
              entry.description = `${translatedExpense} - ${translatedActivity}`;
            }
          }
        });
        
        setCashBookEntries(entries);
        setSummary(getCashBookSummary(entries));
      } catch (error) {
        console.error('Error generating cash book:', error);
        setCashBookEntries([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    
    generateEntries();
  }, [sales, costs, manualEntries, salesLoading, costsLoading, manualEntriesLoading, selectedYear, selectedMonth, currency, productMap, activityTypeMap, expenseTypeMap, t]);
  
  // Refresh handler to regenerate cashbook after manual entry changes
  const handleRefresh = () => {
    // The useEffect will automatically regenerate when manualEntries changes
    // This is just a placeholder for consistency with costs page pattern
  };
  
  // Inline edit handlers for manual entries
  const startEditing = (entry) => {
    if (entry.transactionType !== 'MANUAL') return;
    setEditingRow(entry.reference);
    const entryDate = entry.date instanceof Date ? entry.date : parseDate(entry.date);
    // Calculate exchange rate from existing amounts, or use default
    const amountFC = entry.amountFC || 0;
    const amountUSD = entry.amountUSD || 0;
    const exchangeRate = amountUSD > 0 ? (amountFC / amountUSD) : 2500;
    setEditingData({
      date: entryDate ? entryDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: entry.description || '',
      type: entry.cashIn > 0 ? 'CREDIT' : 'DEBIT',
      amountFC: amountFC,
      amountUSD: amountUSD,
      exchangeRate: exchangeRate,
    });
  };
  
  const cancelEditing = () => {
    setEditingRow(null);
    setEditingData({});
  };
  
  const saveEditing = async (entryId) => {
    try {
      const updates = {
        date: new Date(editingData.date),
        description: editingData.description,
        type: editingData.type,
        amountFC: parseFloat(editingData.amountFC) || 0,
        amountUSD: parseFloat(editingData.amountUSD) || 0,
        currency: currency
      };
      await updateManualCashBookEntry(entryId, updates);
      setEditingRow(null);
      setEditingData({});
      // Refresh will happen automatically via useFirestoreCollection
    } catch (error) {
      console.error('Error updating manual entry:', error);
      alert(safeT(t, 'reports.cashBook.errorUpdating', 'Error updating entry. Please try again.'));
    }
  };
  
  const handleDelete = async (entryId) => {
    if (!window.confirm(safeT(t, 'reports.cashBook.confirmDelete', 'Are you sure you want to delete this entry?'))) return;
    setIsDeleting(true);
    try {
      await deleteManualCashBookEntry(entryId);
      // Refresh will happen automatically via useFirestoreCollection
    } catch (error) {
      console.error('Error deleting manual entry:', error);
      alert(safeT(t, 'reports.cashBook.errorDeleting', 'Error deleting entry. Please try again.'));
    } finally {
      setIsDeleting(false);
    }
  };
  
  const months = [
    t('months.january'), t('months.february'), t('months.march'),
    t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'),
    t('months.october'), t('months.november'), t('months.december')
  ];
  
  if (loading && cashBookEntries.length === 0) {
    return (
      <AdminOnly>
        <div className="p-4">
          <LoadingSpinner />
        </div>
      </AdminOnly>
    );
  }
  
  return (
    <AdminOnly>
      <div className="p-4 bg-gray-50 min-h-screen">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/dashboard/reports" className="inline-flex items-center bg-[#385e82] text-white rounded px-4 py-2 hover:bg-[#052c4f] transition">
            <HiArrowNarrowLeft className="mr-2 h-5 w-5" /> {safeT(t, 'reports.title', 'Reports')}
          </Link>
        </div>
        
        {/* Header Card */}
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <HiCurrencyDollar className="h-8 w-8" />
                {safeT(t, 'reports.cashBook.pageTitle', 'Monthly Cash Book')}
              </h1>
              <p className="text-blue-100 text-lg mt-2">
                {safeT(t, 'reports.cashBook.pageSubtitle', 'Detailed cash transactions ledger')}
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <label className="block text-sm font-medium text-white mb-1">
                  {safeT(t, 'common.month', 'Month')}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-white/30 border-0 rounded text-white placeholder-white focus:ring-2 focus:ring-white"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1} className="text-gray-800">
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <label className="block text-sm font-medium text-white mb-1">
                  {safeT(t, 'common.year', 'Year')}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white/30 border-0 rounded text-white placeholder-white focus:ring-2 focus:ring-white"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year} className="text-gray-800">
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <label className="block text-sm font-medium text-white mb-1">
                  {safeT(t, 'reports.cashBook.currency', 'Currency')}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-white/30 border-0 rounded text-white placeholder-white focus:ring-2 focus:ring-white"
                >
                  <option value="FC" className="text-gray-800">CDF (FC)</option>
                  <option value="USD" className="text-gray-800">USD</option>
                </select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 text-white hover:bg-green-700 font-medium px-4"
                >
                  <HiPlus className="h-5 w-5 mr-2" />
                  {safeT(t, 'reports.cashBook.addEntry', 'Add Entry')}
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-white text-[#385e82] hover:bg-blue-50 font-medium px-4"
                >
                  <HiDocumentDownload className="h-5 w-5 mr-2" />
                  {safeT(t, 'reports.cashBook.exportPDF', 'Export PDF')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Summary Cards */}
          {summary && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiCurrencyDollar className="h-6 w-6 text-blue-200" />
                  <div>
                    <p className="text-blue-100 text-sm">{safeT(t, 'reports.cashBook.openingBalance', 'Opening Balance')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.openingBalance, currency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiTrendingUp className="h-6 w-6 text-green-200" />
                  <div>
                    <p className="text-blue-100 text-sm">{safeT(t, 'reports.cashBook.totalCashIn', 'Total Cash In')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalCashIn, currency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiTrendingDown className="h-6 w-6 text-red-200" />
                  <div>
                    <p className="text-blue-100 text-sm">{safeT(t, 'reports.cashBook.totalCashOut', 'Total Cash Out')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalCashOut, currency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <HiCurrencyDollar className="h-6 w-6 text-blue-200" />
                  <div>
                    <p className="text-blue-100 text-sm">{safeT(t, 'reports.cashBook.closingBalance', 'Closing Balance')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.closingBalance, currency)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
        
        {/* Summary Reports Section */}
        {cashBookEntries.length > 0 && (
          <div className="space-y-6 mb-6">
            {/* Executive Summary Card */}
            <Card className="!rounded-2xl border-2 border-blue-200">
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#385e82] mb-4 flex items-center gap-2">
                  <HiCurrencyDollar className="h-6 w-6" />
                  {safeT(t, 'reports.cashBook.executiveSummary', 'Executive Summary')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.totalTransactions', 'Total Transactions')}</p>
                    <p className="text-2xl font-bold text-blue-900">{transactionTypeSummary.total.count}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {safeT(t, 'reports.cashBook.sales', 'Sales')}: {transactionTypeSummary.sales.count} | 
                      {safeT(t, 'reports.cashBook.costs', 'Costs')}: {transactionTypeSummary.costs.count} | 
                      {safeT(t, 'reports.cashBook.manual', 'Manual')}: {transactionTypeSummary.manual.count}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.netCashFlow', 'Net Cash Flow')}</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut, currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {safeT(t, 'reports.cashBook.inflow', 'Inflow')}: {formatCurrency(transactionTypeSummary.total.cashIn, currency)} | 
                      {safeT(t, 'reports.cashBook.outflow', 'Outflow')}: {formatCurrency(transactionTypeSummary.total.cashOut, currency)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.averageDaily', 'Average Daily')}</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {dailySummary.length > 0 
                        ? formatCurrency((transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut) / dailySummary.length, currency)
                        : formatCurrency(0, currency)
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {safeT(t, 'reports.cashBook.activeDays', 'Active Days')}: {dailySummary.length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* Tabs Navigation and Content */}
        {cashBookEntries.length > 0 && (
          <Card className="!rounded-2xl overflow-visible mb-8 bg-white/90 border-0 shadow-none print:hidden">
            <div className="flex items-center justify-between border-b border-[#385e82] pb-2 px-2">
              <nav className="flex space-x-2" aria-label="Tabs">
                {[
                  { key: 'records', label: safeT(t, 'reports.cashBook.records', 'Records') },
                  { key: 'transactionType', label: safeT(t, 'reports.cashBook.transactionTypeBreakdown', 'Transaction Type Breakdown') },
                  { key: 'dailySummary', label: safeT(t, 'reports.cashBook.dailySummary', 'Daily Summary') },
                  { key: 'manualEntries', label: safeT(t, 'reports.cashBook.manualEntries', 'Manual Entries') },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-2 rounded-t-lg font-semibold text-base transition-all duration-200 border-b-4 ${
                      activeTab === tab.key
                        ? 'border-[#385e82] text-[#385e82] bg-white'
                        : 'border-transparent text-gray-400 bg-transparent hover:text-[#385e82]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="p-0">
              {/* Tab 1: Records Table */}
              {activeTab === 'records' && (
                <Card className="border-0 rounded-none bg-white mb-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-[#385e82] mb-4">
                      {safeT(t, 'reports.cashBook.cashBookTable', 'Cash Book Ledger')} - {months[selectedMonth - 1]} {selectedYear}
                    </h3>
                    
                    {cashBookEntries.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        {safeT(t, 'reports.cashBook.noData', 'No transactions found for the selected period')}
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-center text-gray-900 rounded overflow-hidden shadow-lg">
                            <thead className="bg-[#385e82]">
                              <tr>
                                <th className="px-6 py-3 font-semibold text-base text-white text-left">
                                  {safeT(t, 'common.date', 'Date')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-left">
                                  {safeT(t, 'common.description', 'Description')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.cashIn', 'Cash In')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.balance', 'Balance')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-center">
                                  {safeT(t, 'common.actions', 'Actions')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {/* Opening Balance Row - Only show on first page */}
                              {summary && currentPage === 1 && (
                                <tr className="bg-blue-50 font-semibold">
                                  <td colSpan="2" className="px-6 py-3 text-left text-[#385e82]">
                                    {safeT(t, 'reports.cashBook.openingBalance', 'Opening Balance')}
                                  </td>
                                  <td className="px-6 py-3 text-right text-gray-500">—</td>
                                  <td className="px-6 py-3 text-right text-gray-500">—</td>
                                  <td className="px-6 py-3 text-right font-bold text-[#385e82]">
                                    {formatCurrency(summary.openingBalance, currency)}
                                  </td>
                                  <td className="px-6 py-3"></td>
                                </tr>
                              )}
                              
                              {/* Transaction Rows */}
                              {paginatedEntries.map((entry, idx) => {
                                // Calculate the actual index in the full array for alternating colors
                                const actualIdx = (currentPage - 1) * entriesPerPage + idx;
                                const isManual = entry.transactionType === 'MANUAL';
                                const isEditing = editingRow === entry.reference;
                                return (
                                  <tr
                                    key={`${entry.transactionType}-${entry.reference}-${actualIdx}`}
                                    className={`transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                                      actualIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                                    } hover:shadow-md hover:bg-gray-50`}
                                  >
                                    <td className="px-6 py-3 text-left text-gray-900 whitespace-nowrap">
                                      {isEditing ? (
                                        <TextInput
                                          type="date"
                                          value={editingData.date || ''}
                                          onChange={e => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                                          className="w-[140px]"
                                        />
                                      ) : (
                                        entry.date.toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-left text-gray-900">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2">
                                          <Select
                                            value={editingData.type || 'DEBIT'}
                                            onChange={e => setEditingData(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full"
                                          >
                                            <option value="CREDIT">{safeT(t, 'reports.cashBook.credit', 'Credit')}</option>
                                            <option value="DEBIT">{safeT(t, 'reports.cashBook.debit', 'Debit')}</option>
                                          </Select>
                                          <TextInput
                                            type="text"
                                            value={editingData.description || ''}
                                            onChange={e => setEditingData(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full"
                                            placeholder={safeT(t, 'common.description', 'Description')}
                                          />
                                        </div>
                                      ) : (
                                        entry.description
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium text-green-700">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'CREDIT' ? (editingData.amountFC || 0) : 0}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const rate = editingData.exchangeRate || 2500;
                                      setEditingData(prev => ({
                                        ...prev,
                                        amountFC: editingData.type === 'CREDIT' ? val : prev.amountFC,
                                        amountUSD: editingData.type === 'CREDIT' ? (val / rate) : prev.amountUSD
                                      }));
                                    }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'CREDIT'}
                                            placeholder="FC"
                                          />
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'CREDIT' ? (editingData.amountUSD || 0) : 0}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const rate = editingData.exchangeRate || 2500;
                                      setEditingData(prev => ({
                                        ...prev,
                                        amountUSD: editingData.type === 'CREDIT' ? val : prev.amountUSD,
                                        amountFC: editingData.type === 'CREDIT' ? (val * rate) : prev.amountFC
                                      }));
                                    }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'CREDIT'}
                                            placeholder="USD"
                                          />
                                        </div>
                                      ) : (
                                        entry.cashIn > 0 ? formatCurrency(entry.cashIn, currency) : '—'
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium text-red-700">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'DEBIT' ? (editingData.amountFC || 0) : 0}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const rate = editingData.exchangeRate || 2500;
                                      setEditingData(prev => ({
                                        ...prev,
                                        amountFC: editingData.type === 'DEBIT' ? val : prev.amountFC,
                                        amountUSD: editingData.type === 'DEBIT' ? (val / rate) : prev.amountUSD
                                      }));
                                    }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'DEBIT'}
                                            placeholder="FC"
                                          />
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'DEBIT' ? (editingData.amountUSD || 0) : 0}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const rate = editingData.exchangeRate || 2500;
                                      setEditingData(prev => ({
                                        ...prev,
                                        amountUSD: editingData.type === 'DEBIT' ? val : prev.amountUSD,
                                        amountFC: editingData.type === 'DEBIT' ? (val * rate) : prev.amountFC
                                      }));
                                    }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'DEBIT'}
                                            placeholder="USD"
                                          />
                                        </div>
                                      ) : (
                                        entry.cashOut > 0 ? formatCurrency(entry.cashOut, currency) : '—'
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-[#385e82]">
                                      {formatCurrency(entry.balance, currency)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                      {isManual ? (
                                        isEditing ? (
                                          <div className="flex items-center justify-center space-x-2">
                                            <Button
                                              color="success"
                                              size="xs"
                                              onClick={() => saveEditing(entry.reference)}
                                              className="h-8 w-8 p-0 flex items-center justify-center bg-green-600 text-white hover:bg-green-700"
                                            >
                                              <HiCheck className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              color="gray"
                                              size="xs"
                                              onClick={cancelEditing}
                                              className="h-8 w-8 p-0 flex items-center justify-center bg-gray-500 text-white hover:bg-gray-600"
                                            >
                                              <HiX className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center space-x-2">
                                            <Button
                                              color="info"
                                              size="xs"
                                              onClick={() => startEditing(entry)}
                                              className="h-8 w-8 p-0 flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                              <HiPencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              color="failure"
                                              size="xs"
                                              onClick={() => handleDelete(entry.reference)}
                                              disabled={isDeleting}
                                              className="h-8 w-8 p-0 flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
                                            >
                                              <HiTrash className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {/* Closing Balance Row - Only show on last page */}
                              {summary && currentPage === totalPages && (
                                <tr className="bg-[#385e82] font-bold text-white">
                                  <td colSpan="2" className="px-6 py-3 text-left">
                                    {safeT(t, 'reports.cashBook.closingBalance', 'Closing Balance')}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {formatCurrency(summary.totalCashIn, currency)}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {formatCurrency(summary.totalCashOut, currency)}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {formatCurrency(summary.closingBalance, currency)}
                                  </td>
                                  <td className="px-6 py-3"></td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Pagination */}
                        {cashBookEntries.length > entriesPerPage && (
                          <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-[#385e82]">
                            <span className="text-sm text-gray-700">
                              {safeT(t, 'table.showing', 'Showing')} {paginationInfo.startIndex} {safeT(t, 'table.to', 'to')} {paginationInfo.endIndex} {safeT(t, 'table.of', 'of')} {paginationInfo.total} {safeT(t, 'table.entries', 'entries')}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                color="gray"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-300 disabled:text-gray-500"
                              >
                                {safeT(t, 'common.previous', 'Previous')}
                              </Button>
                              <Button
                                color="gray"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-300 disabled:text-gray-500"
                              >
                                {safeT(t, 'common.next', 'Next')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              )}
              
              {/* Tab 2: Transaction Type Breakdown */}
              {activeTab === 'transactionType' && (
                <Card className="border-0 rounded-none bg-white mb-0">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#385e82] mb-4">
                      {safeT(t, 'reports.cashBook.transactionTypeBreakdown', 'Transaction Type Breakdown')}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">{safeT(t, 'reports.cashBook.type', 'Type')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.count', 'Count')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashIn', 'Cash In')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.net', 'Net')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.percentage', '% of Total')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr className="hover:bg-blue-50">
                            <td className="px-4 py-3 font-medium text-blue-900">{safeT(t, 'reports.cashBook.sales', 'Sales')}</td>
                            <td className="px-4 py-3 text-right">{transactionTypeSummary.sales.count}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.sales.cashIn, currency)}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.sales.cashOut, currency)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-900">
                              {formatCurrency(transactionTypeSummary.sales.cashIn - transactionTypeSummary.sales.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {transactionTypeSummary.total.count > 0 
                                ? ((transactionTypeSummary.sales.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                                : '0.0'
                              }%
                            </td>
                          </tr>
                          <tr className="hover:bg-red-50">
                            <td className="px-4 py-3 font-medium text-red-900">{safeT(t, 'reports.cashBook.costs', 'Costs')}</td>
                            <td className="px-4 py-3 text-right">{transactionTypeSummary.costs.count}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.costs.cashIn, currency)}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.costs.cashOut, currency)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-red-900">
                              {formatCurrency(transactionTypeSummary.costs.cashIn - transactionTypeSummary.costs.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {transactionTypeSummary.total.count > 0 
                                ? ((transactionTypeSummary.costs.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                                : '0.0'
                              }%
                            </td>
                          </tr>
                          <tr className="hover:bg-purple-50">
                            <td className="px-4 py-3 font-medium text-purple-900">{safeT(t, 'reports.cashBook.manual', 'Manual Entries')}</td>
                            <td className="px-4 py-3 text-right">{transactionTypeSummary.manual.count}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.manual.cashIn, currency)}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.manual.cashOut, currency)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-purple-900">
                              {formatCurrency(transactionTypeSummary.manual.cashIn - transactionTypeSummary.manual.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {transactionTypeSummary.total.count > 0 
                                ? ((transactionTypeSummary.manual.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                                : '0.0'
                              }%
                            </td>
                          </tr>
                          <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                            <td className="px-4 py-3 text-gray-900">{safeT(t, 'common.total', 'Total')}</td>
                            <td className="px-4 py-3 text-right">{transactionTypeSummary.total.count}</td>
                            <td className="px-4 py-3 text-right text-green-900">{formatCurrency(transactionTypeSummary.total.cashIn, currency)}</td>
                            <td className="px-4 py-3 text-right text-red-900">{formatCurrency(transactionTypeSummary.total.cashOut, currency)}</td>
                            <td className="px-4 py-3 text-right text-[#385e82]">
                              {formatCurrency(transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right">100.0%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Tab 3: Daily Summary */}
              {activeTab === 'dailySummary' && (
                <Card className="border-0 rounded-none bg-white mb-0">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#385e82] mb-4">
                      {safeT(t, 'reports.cashBook.dailySummary', 'Daily Summary')}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">{safeT(t, 'common.date', 'Date')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.transactions', 'Transactions')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashIn', 'Cash In')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.net', 'Net')}</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.balance', 'Balance')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dailySummary.map((day, idx) => (
                            <tr key={day.dateKey} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                              <td className="px-4 py-3 font-medium">
                                {day.date.toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3 text-right">{day.transactions}</td>
                              <td className="px-4 py-3 text-right font-medium text-green-700">
                                {formatCurrency(day.cashIn, currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-red-700">
                                {formatCurrency(day.cashOut, currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {formatCurrency(day.cashIn - day.cashOut, currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#385e82]">
                                {formatCurrency(day.balance, currency)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                            <td className="px-4 py-3 text-gray-900">{safeT(t, 'common.total', 'Total')}</td>
                            <td className="px-4 py-3 text-right">{transactionTypeSummary.total.count}</td>
                            <td className="px-4 py-3 text-right text-green-900">
                              {formatCurrency(transactionTypeSummary.total.cashIn, currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-900">
                              {formatCurrency(transactionTypeSummary.total.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-[#385e82]">
                              {formatCurrency(transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut, currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-[#385e82]">
                              {summary ? formatCurrency(summary.closingBalance, currency) : formatCurrency(0, currency)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Tab 4: Manual Entries */}
              {activeTab === 'manualEntries' && (
                <Card className="border-0 rounded-none bg-white mb-0">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#385e82] mb-4">
                      {safeT(t, 'reports.cashBook.manualEntries', 'Manual Entries')} - {months[selectedMonth - 1]} {selectedYear}
                    </h3>
                    
                    {(() => {
                      const manualEntriesOnly = cashBookEntries.filter(entry => entry.transactionType === 'MANUAL');
                      
                      if (manualEntriesOnly.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-400">
                            {safeT(t, 'reports.cashBook.noManualEntries', 'No manual entries found for the selected period')}
                          </div>
                        );
                      }
                      
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-center text-gray-900 rounded overflow-hidden shadow-lg">
                            <thead className="bg-[#385e82]">
                              <tr>
                                <th className="px-6 py-3 font-semibold text-base text-white text-left">
                                  {safeT(t, 'common.date', 'Date')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-left">
                                  {safeT(t, 'common.description', 'Description')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-center">
                                  {safeT(t, 'reports.cashBook.type', 'Type')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.cashIn', 'Cash In')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-right">
                                  {safeT(t, 'reports.cashBook.balance', 'Balance')}
                                </th>
                                <th className="px-6 py-3 font-semibold text-base text-white text-center">
                                  {safeT(t, 'common.actions', 'Actions')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {manualEntriesOnly.map((entry, idx) => {
                                const isEditing = editingRow === entry.reference;
                                return (
                                  <tr
                                    key={`manual-${entry.reference}-${idx}`}
                                    className={`transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                                      idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                                    } hover:shadow-md hover:bg-gray-50`}
                                  >
                                    <td className="px-6 py-3 text-left text-gray-900 whitespace-nowrap">
                                      {isEditing ? (
                                        <TextInput
                                          type="date"
                                          value={editingData.date || ''}
                                          onChange={e => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                                          className="w-[140px]"
                                        />
                                      ) : (
                                        entry.date.toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-left text-gray-900">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2">
                                          <Select
                                            value={editingData.type || 'DEBIT'}
                                            onChange={e => setEditingData(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full"
                                          >
                                            <option value="CREDIT">{safeT(t, 'reports.cashBook.credit', 'Credit')}</option>
                                            <option value="DEBIT">{safeT(t, 'reports.cashBook.debit', 'Debit')}</option>
                                          </Select>
                                          <TextInput
                                            type="text"
                                            value={editingData.description || ''}
                                            onChange={e => setEditingData(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full"
                                            placeholder={safeT(t, 'common.description', 'Description')}
                                          />
                                        </div>
                                      ) : (
                                        entry.description
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                        entry.cashIn > 0 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {entry.cashIn > 0 
                                          ? safeT(t, 'reports.cashBook.credit', 'Credit')
                                          : safeT(t, 'reports.cashBook.debit', 'Debit')
                                        }
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium text-green-700">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'CREDIT' ? (editingData.amountFC || 0) : 0}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const rate = editingData.exchangeRate || 2500;
                                              setEditingData(prev => ({
                                                ...prev,
                                                amountFC: editingData.type === 'CREDIT' ? val : prev.amountFC,
                                                amountUSD: editingData.type === 'CREDIT' ? (val / rate) : prev.amountUSD
                                              }));
                                            }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'CREDIT'}
                                            placeholder="FC"
                                          />
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'CREDIT' ? (editingData.amountUSD || 0) : 0}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const rate = editingData.exchangeRate || 2500;
                                              setEditingData(prev => ({
                                                ...prev,
                                                amountUSD: editingData.type === 'CREDIT' ? val : prev.amountUSD,
                                                amountFC: editingData.type === 'CREDIT' ? (val * rate) : prev.amountFC
                                              }));
                                            }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'CREDIT'}
                                            placeholder="USD"
                                          />
                                        </div>
                                      ) : (
                                        entry.cashIn > 0 ? formatCurrency(entry.cashIn, currency) : '—'
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium text-red-700">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[120px]">
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'DEBIT' ? (editingData.amountFC || 0) : 0}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const rate = editingData.exchangeRate || 2500;
                                              setEditingData(prev => ({
                                                ...prev,
                                                amountFC: editingData.type === 'DEBIT' ? val : prev.amountFC,
                                                amountUSD: editingData.type === 'DEBIT' ? (val / rate) : prev.amountUSD
                                              }));
                                            }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'DEBIT'}
                                            placeholder="FC"
                                          />
                                          <TextInput
                                            type="number"
                                            value={editingData.type === 'DEBIT' ? (editingData.amountUSD || 0) : 0}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              const rate = editingData.exchangeRate || 2500;
                                              setEditingData(prev => ({
                                                ...prev,
                                                amountUSD: editingData.type === 'DEBIT' ? val : prev.amountUSD,
                                                amountFC: editingData.type === 'DEBIT' ? (val * rate) : prev.amountFC
                                              }));
                                            }}
                                            className="w-full text-center"
                                            min={0}
                                            disabled={editingData.type !== 'DEBIT'}
                                            placeholder="USD"
                                          />
                                        </div>
                                      ) : (
                                        entry.cashOut > 0 ? formatCurrency(entry.cashOut, currency) : '—'
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-[#385e82]">
                                      {formatCurrency(entry.balance, currency)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                      {isEditing ? (
                                        <div className="flex items-center justify-center space-x-2">
                                          <Button
                                            color="success"
                                            size="xs"
                                            onClick={() => saveEditing(entry.reference)}
                                            className="h-8 w-8 p-0 flex items-center justify-center bg-green-600 text-white hover:bg-green-700"
                                          >
                                            <HiCheck className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            color="gray"
                                            size="xs"
                                            onClick={cancelEditing}
                                            className="h-8 w-8 p-0 flex items-center justify-center bg-gray-500 text-white hover:bg-gray-600"
                                          >
                                            <HiX className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center space-x-2">
                                          <Button
                                            color="info"
                                            size="xs"
                                            onClick={() => startEditing(entry)}
                                            className="h-8 w-8 p-0 flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700"
                                          >
                                            <HiPencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            color="failure"
                                            size="xs"
                                            onClick={() => handleDelete(entry.reference)}
                                            disabled={isDeleting}
                                            className="h-8 w-8 p-0 flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
                                          >
                                            <HiTrash className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              )}
            </div>
          </Card>
        )}
        
        
        {/* Print Content Wrapper - Includes all summaries and detailed table */}
        <div ref={printRef} className="print-content hidden print:block" style={{ display: 'none' }}>
          {/* Print Header */}
          <div className="print-header">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#385e82]">
                {user?.company || safeT(t, 'reports.cashBook.pageTitle', 'Monthly Cash Book')}
              </h1>
              <p className="text-gray-600 mt-1">
                {safeT(t, 'reports.cashBook.pageSubtitle', 'Detailed cash transactions ledger')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {months[selectedMonth - 1]} {selectedYear} | {safeT(t, 'reports.cashBook.currency', 'Currency')}: {currency === 'FC' ? 'CDF (FC)' : 'USD'}
              </p>
              {user?.location && (
                <p className="text-xs text-gray-400 mt-1">{user.location}</p>
              )}
            </div>
          </div>
          
          {/* Print Summary Section */}
          {summary && cashBookEntries.length > 0 && (
            <div className="print-summary-section">
              <h2 className="text-xl font-bold text-[#385e82] mb-4 print-avoid-break">
                {safeT(t, 'reports.cashBook.executiveSummary', 'Executive Summary')}
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-6 print-avoid-break">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.openingBalance', 'Opening Balance')}</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(summary.openingBalance, currency)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.totalCashIn', 'Total Cash In')}</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(summary.totalCashIn, currency)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.totalCashOut', 'Total Cash Out')}</p>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(summary.totalCashOut, currency)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">{safeT(t, 'reports.cashBook.closingBalance', 'Closing Balance')}</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(summary.closingBalance, currency)}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Include all summary reports in print */}
          {cashBookEntries.length > 0 && (
            <>
              {/* Transaction Type Breakdown - Print Version */}
              <div className="print-summary-section print-page-break">
                <h2 className="text-lg font-semibold text-[#385e82] mb-4 print-avoid-break">
                  {safeT(t, 'reports.cashBook.transactionTypeBreakdown', 'Transaction Type Breakdown')}
                </h2>
                <div className="print-table-wrapper">
                  <table className="w-full text-sm text-gray-900 border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">{safeT(t, 'reports.cashBook.type', 'Type')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.count', 'Count')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashIn', 'Cash In')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.net', 'Net')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.percentage', '% of Total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 font-medium text-blue-900">{safeT(t, 'reports.cashBook.sales', 'Sales')}</td>
                        <td className="px-4 py-3 text-right">{transactionTypeSummary.sales.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.sales.cashIn, currency)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.sales.cashOut, currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-900">
                          {formatCurrency(transactionTypeSummary.sales.cashIn - transactionTypeSummary.sales.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {transactionTypeSummary.total.count > 0 
                            ? ((transactionTypeSummary.sales.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                            : '0.0'
                          }%
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-red-900">{safeT(t, 'reports.cashBook.costs', 'Costs')}</td>
                        <td className="px-4 py-3 text-right">{transactionTypeSummary.costs.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.costs.cashIn, currency)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.costs.cashOut, currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-900">
                          {formatCurrency(transactionTypeSummary.costs.cashIn - transactionTypeSummary.costs.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {transactionTypeSummary.total.count > 0 
                            ? ((transactionTypeSummary.costs.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                            : '0.0'
                          }%
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-purple-900">{safeT(t, 'reports.cashBook.manual', 'Manual Entries')}</td>
                        <td className="px-4 py-3 text-right">{transactionTypeSummary.manual.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{formatCurrency(transactionTypeSummary.manual.cashIn, currency)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-700">{formatCurrency(transactionTypeSummary.manual.cashOut, currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-900">
                          {formatCurrency(transactionTypeSummary.manual.cashIn - transactionTypeSummary.manual.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {transactionTypeSummary.total.count > 0 
                            ? ((transactionTypeSummary.manual.count / transactionTypeSummary.total.count) * 100).toFixed(1)
                            : '0.0'
                          }%
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="px-4 py-3 text-gray-900">{safeT(t, 'common.total', 'Total')}</td>
                        <td className="px-4 py-3 text-right">{transactionTypeSummary.total.count}</td>
                        <td className="px-4 py-3 text-right text-green-900">{formatCurrency(transactionTypeSummary.total.cashIn, currency)}</td>
                        <td className="px-4 py-3 text-right text-red-900">{formatCurrency(transactionTypeSummary.total.cashOut, currency)}</td>
                        <td className="px-4 py-3 text-right text-[#385e82]">
                          {formatCurrency(transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Daily Summary - Print Version */}
              <div className="print-summary-section print-page-break">
                <h2 className="text-lg font-semibold text-[#385e82] mb-4 print-avoid-break">
                  {safeT(t, 'reports.cashBook.dailySummary', 'Daily Summary')}
                </h2>
                <div className="print-table-wrapper">
                  <table className="w-full text-sm text-gray-900 border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">{safeT(t, 'common.date', 'Date')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.transactions', 'Transactions')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashIn', 'Cash In')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.net', 'Net')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{safeT(t, 'reports.cashBook.balance', 'Balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dailySummary.map((day, idx) => (
                        <tr key={day.dateKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium">
                            {day.date.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">{day.transactions}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">
                            {formatCurrency(day.cashIn, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">
                            {formatCurrency(day.cashOut, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(day.cashIn - day.cashOut, currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#385e82]">
                            {formatCurrency(day.balance, currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="px-4 py-3 text-gray-900">{safeT(t, 'common.total', 'Total')}</td>
                        <td className="px-4 py-3 text-right">{transactionTypeSummary.total.count}</td>
                        <td className="px-4 py-3 text-right text-green-900">
                          {formatCurrency(transactionTypeSummary.total.cashIn, currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-900">
                          {formatCurrency(transactionTypeSummary.total.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#385e82]">
                          {formatCurrency(transactionTypeSummary.total.cashIn - transactionTypeSummary.total.cashOut, currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#385e82]">
                          {summary ? formatCurrency(summary.closingBalance, currency) : formatCurrency(0, currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          
          {/* Detailed Cash Book Table */}
          <div className="print-page-break print-table-wrapper">
            <h2 className="text-lg font-semibold text-[#385e82] mb-4 print-avoid-break">
              {safeT(t, 'reports.cashBook.cashBookTable', 'Cash Book Ledger')} - {months[selectedMonth - 1]} {selectedYear}
            </h2>
            
            {cashBookEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {safeT(t, 'reports.cashBook.noData', 'No transactions found for the selected period')}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center text-gray-900 border border-gray-300">
                    <thead className="bg-[#385e82]">
                      <tr>
                        <th className="px-6 py-3 font-semibold text-base text-white text-left">
                          {safeT(t, 'common.date', 'Date')}
                        </th>
                        <th className="px-6 py-3 font-semibold text-base text-white text-left">
                          {safeT(t, 'common.description', 'Description')}
                        </th>
                        <th className="px-6 py-3 font-semibold text-base text-white text-right">
                          {safeT(t, 'reports.cashBook.cashIn', 'Cash In')}
                        </th>
                        <th className="px-6 py-3 font-semibold text-base text-white text-right">
                          {safeT(t, 'reports.cashBook.cashOut', 'Cash Out')}
                        </th>
                        <th className="px-6 py-3 font-semibold text-base text-white text-right">
                          {safeT(t, 'reports.cashBook.balance', 'Balance')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Opening Balance Row */}
                      {summary && (
                        <tr className="bg-blue-50 font-semibold print-avoid-break">
                          <td colSpan="2" className="px-6 py-3 text-left text-[#385e82]">
                            {safeT(t, 'reports.cashBook.openingBalance', 'Opening Balance')}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">—</td>
                          <td className="px-6 py-3 text-right text-gray-500">—</td>
                          <td className="px-6 py-3 text-right font-bold text-[#385e82]">
                            {formatCurrency(summary.openingBalance, currency)}
                          </td>
                        </tr>
                      )}
                      
                      {/* Transaction Rows - Show all entries for print */}
                      {cashBookEntries.map((entry, idx) => {
                        return (
                          <tr
                            key={`${entry.transactionType}-${entry.reference}-${idx}`}
                            className={`${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}
                          >
                            <td className="px-6 py-3 text-left text-gray-900 whitespace-nowrap">
                              {entry.date.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-3 text-left text-gray-900">
                              {entry.description}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-green-700">
                              {entry.cashIn > 0 ? formatCurrency(entry.cashIn, currency) : '—'}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-red-700">
                              {entry.cashOut > 0 ? formatCurrency(entry.cashOut, currency) : '—'}
                            </td>
                            <td className="px-6 py-3 text-right font-bold text-[#385e82]">
                              {formatCurrency(entry.balance, currency)}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Closing Balance Row */}
                      {summary && (
                        <tr className="bg-[#385e82] font-bold text-white print-avoid-break">
                          <td colSpan="2" className="px-6 py-3 text-left">
                            {safeT(t, 'reports.cashBook.closingBalance', 'Closing Balance')}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {formatCurrency(summary.totalCashIn, currency)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {formatCurrency(summary.totalCashOut, currency)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {formatCurrency(summary.closingBalance, currency)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          
          {/* Print Footer */}
          <div className="print-footer">
            <div className="text-center text-xs text-gray-500 mt-6">
              <p>{safeT(t, 'reports.cashBook.generatedOn', 'Generated on')} {new Date().toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              {user?.email && (
                <p className="mt-1">{safeT(t, 'reports.cashBook.preparedBy', 'Prepared by')}: {user.email}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Add Entry Modal */}
        <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="md">
          <Modal.Header>
            {safeT(t, 'reports.cashBook.addEntry', 'Add Cash Book Entry')}
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-4">
              <div>
                <Label htmlFor="entry-date" value={safeT(t, 'common.date', 'Date')} />
                <TextInput
                  id="entry-date"
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="entry-description" value={safeT(t, 'common.description', 'Description')} />
                <TextInput
                  id="entry-description"
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={safeT(t, 'reports.cashBook.descriptionPlaceholder', 'Enter description')}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="entry-type" value={safeT(t, 'reports.cashBook.type', 'Type')} />
                <Select
                  id="entry-type"
                  value={newEntry.type}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value }))}
                  required
                >
                  <option value="CREDIT">{safeT(t, 'reports.cashBook.credit', 'Credit (Cash In)')}</option>
                  <option value="DEBIT">{safeT(t, 'reports.cashBook.debit', 'Debit (Cash Out)')}</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="entry-amount-fc" value={safeT(t, 'common.amount_cdf', 'Amount (CDF)')} />
                <TextInput
                  id="entry-amount-fc"
                  type="number"
                  value={newEntry.amountFC}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, amountFC: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="entry-amount-usd" value={safeT(t, 'common.amount_usd', 'Amount (USD)')} />
                <TextInput
                  id="entry-amount-usd"
                  type="number"
                  value={newEntry.amountUSD}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, amountUSD: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={async () => {
                if (!newEntry.description || !newEntry.date || (!newEntry.amountFC && !newEntry.amountUSD)) {
                  alert(safeT(t, 'reports.cashBook.fillAllFields', 'Please fill all required fields'));
                  return;
                }
                setIsSubmitting(true);
                try {
                  await addManualCashBookEntry({
                    date: new Date(newEntry.date),
                    description: newEntry.description,
                    type: newEntry.type,
                    amountFC: parseFloat(newEntry.amountFC) || 0,
                    amountUSD: parseFloat(newEntry.amountUSD) || 0,
                    currency: currency
                  });
                  setShowAddModal(false);
                  setNewEntry({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    type: 'DEBIT',
                    amountFC: '',
                    amountUSD: ''
                  });
                  // Refresh will happen automatically via useFirestoreCollection
                } catch (error) {
                  console.error('Error adding entry:', error);
                  alert(safeT(t, 'reports.cashBook.errorAdding', 'Error adding entry. Please try again.'));
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? safeT(t, 'common.saving', 'Saving...') : safeT(t, 'common.add', 'Add')}
            </Button>
            <Button
              color="gray"
              onClick={() => {
                setShowAddModal(false);
                setNewEntry({
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  type: 'DEBIT',
                  amountFC: '',
                  amountUSD: ''
                });
              }}
            >
              {safeT(t, 'common.cancel', 'Cancel')}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </AdminOnly>
  );
}

