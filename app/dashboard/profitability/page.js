"use client";

import { Card, Button } from "flowbite-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useFirestoreCollection } from "../../../hooks/useFirestoreCollection";
import dynamic from "next/dynamic";
import { useLanguage } from "@/context/LanguageContext";
import { HiTrendingUp, HiTrendingDown, HiChartBar, HiCube, HiCollection, HiArrowUp, HiArrowDown, HiArrowNarrowLeft } from "react-icons/hi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

import { useMasterData } from "@/hooks/useMasterData";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import AdminOnly from '@/components/AdminOnly';
import { parseFirestoreDate } from "@/lib/utils/dateUtils.ts";
import { normalizeProductTypeName } from "@/lib/utils/nameUtils";
import { Doughnut } from "react-chartjs-2";
import { useReactToPrint } from 'react-to-print';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { HiDocumentDownload } from 'react-icons/hi';

// CRITICAL FIX: Add safeT function to prevent object rendering and infinite loops
const safeT = (t, key, fallback) => {
  try {
    const value = t(key);
    // Only return if it's a string or number, never an object
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    // If translation returns an object or undefined, use fallback
    return String(fallback || key);
  }
  catch (error) {
    console.warn(`Translation error for key "${key}":`, error);
    return String(fallback || key);
  }
};

// Helper function to safely format numbers and avoid NaN
const safeFormatNumber = (value, options = { maximumFractionDigits: 0 }) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString(undefined, options);
};

// Label mapping function to convert internal keys to human-readable labels
const getHumanReadableLabel = (key, t, expenseTypeMap, activityTypeMap, productMap) => {
  if (!key) return 'N/A';
  
  // Try direct translation first
  const directTranslation = t(key, '');
  if (directTranslation && directTranslation !== key) {
    return directTranslation;
  }
  
  // Try expense type mapping
  if (key.includes('expenses.types.')) {
    const expenseKey = key.replace('masterData.expenses.types.', '').replace(/\s+/g, '_').toLowerCase();
    const expenseType = Array.from(expenseTypeMap?.values() || []).find(e => 
      e.name?.toLowerCase().replace(/\s+/g, '_') === expenseKey
    );
    if (expenseType?.name) return expenseType.name;
  }
  
  // Try activity type mapping
  if (key.includes('activities.')) {
    const activityKey = key.replace('products.activities.', '').replace(/\s+/g, '_').toLowerCase();
    const activityType = Array.from(activityTypeMap?.values() || []).find(a => 
      a.name?.toLowerCase().replace(/\s+/g, '_') === activityKey
    );
    if (activityType?.name) return activityType.name;
  }
  
  // Try product type mapping
  if (key.includes('products.types.')) {
    const productKey = key.replace('products.types.', '').replace(/\s+/g, '').replace(/'/g, '_');
    const product = Array.from(productMap?.values() || []).find(p => 
      p.producttype?.toLowerCase().replace(/\s+/g, '').replace(/'/g, '_') === productKey
    );
    if (product?.producttype) return product.producttype;
  }
  
  // Fallback: clean up the key
  return key
    .replace(/masterData\./g, '')
    .replace(/products\./g, '')
    .replace(/expenses\.types\./g, '')
    .replace(/activities\./g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const LineChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), { ssr: false });
const DoughnutChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Doughnut), { ssr: false });

export default function SalesTrendsPage() {
  const { data: sales } = useFirestoreCollection("Sales");
  const { data: costs } = useFirestoreCollection("Costs");
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { getPrintStyles } = usePrintSettings();
  const printRef = useRef(null);
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("general");
  
  // Generate custom print styles with landscape for wide tables
  const generatePrintStyles = () => {
    const reportTitle = safeT(t, 'profitability.title', 'Profitability Report');
    const baseStyles = getPrintStyles({ reportTitle });
    return `
      ${baseStyles}
      @page {
        size: A4 portrait;
        margin: 20mm 24mm;
      }
      @page :first {
        size: A4 portrait;
        margin: 20mm 24mm;
      }
      @page landscape-sales {
        size: A4 landscape;
        margin: 10mm 15mm;
      }
      @page landscape-costs {
        size: A4 landscape;
        margin: 10mm 15mm;
      }
      .print-content {
        display: block !important;
        visibility: visible !important;
      }
      .print-content * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .print-landscape-sales {
        page: landscape-sales;
        page-break-before: always;
      }
      .print-landscape-costs {
        page: landscape-costs;
        page-break-before: always;
      }
      .print-portrait {
        page: auto;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
        }
        body * {
          visibility: hidden;
        }
        .print-content, .print-content * {
          visibility: visible !important;
        }
        .print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
        }
        .no-print, .print\\:hidden, [class*="print:hidden"] {
          display: none !important;
          visibility: hidden !important;
        }
        .print-only, .print\\:block, [class*="print:block"] {
          display: block !important;
          visibility: visible !important;
        }
        /* Hide scrollbars and UI elements */
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        /* Table styling */
        table {
          page-break-inside: avoid;
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2 !important;
          font-weight: bold;
        }
        /* Landscape table adjustments */
        .print-landscape-sales,
        .print-landscape-costs {
          page-break-before: always;
        }
        .print-landscape-sales {
          page: landscape-sales !important;
        }
        .print-landscape-costs {
          page: landscape-costs !important;
        }
        .print-landscape-sales table,
        .print-landscape-costs table {
          font-size: 5.5pt;
          width: 100%;
          margin-bottom: 8px;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .print-landscape-sales th,
        .print-landscape-sales td,
        .print-landscape-costs th,
        .print-landscape-costs td {
          padding: 2px 1px;
          font-size: 5.5pt;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .print-landscape-sales th:first-child,
        .print-landscape-costs th:first-child {
          width: 15%;
        }
        .print-landscape-sales th:not(:first-child):not(:last-child),
        .print-landscape-costs th:not(:first-child):not(:last-child) {
          width: 6.5%;
        }
        .print-landscape-sales th:last-child,
        .print-landscape-costs th:last-child {
          width: 10%;
        }
        .print-landscape-sales h2,
        .print-landscape-costs h2 {
          font-size: 12pt;
          margin-bottom: 6px;
          margin-top: 0;
        }
        .print-landscape-sales h3,
        .print-landscape-costs h3 {
          font-size: 9pt;
          margin-top: 8px;
          margin-bottom: 3px;
        }
        .print-landscape-sales .print-subsection,
        .print-landscape-costs .print-subsection {
          margin-bottom: 8px;
        }
        .print-landscape-sales .print-subsection:last-child,
        .print-landscape-costs .print-subsection:last-child {
          margin-bottom: 0;
        }
        .print-landscape-sales p,
        .print-landscape-costs p {
          font-size: 7pt;
          margin-bottom: 3px;
        }
        .print-landscape-sales .print-insights,
        .print-landscape-costs .print-insights {
          font-size: 6pt;
          padding: 6px 10px;
          margin: 6px 0;
        }
        .print-landscape-sales .print-insights ul,
        .print-landscape-costs .print-insights ul {
          margin: 2px 0;
          padding-left: 15px;
        }
        .print-landscape-sales .print-insights li,
        .print-landscape-costs .print-insights li {
          margin: 1px 0;
        }
        .print-landscape-sales .print-section-title,
        .print-landscape-costs .print-section-title {
          font-size: 12pt;
          margin-bottom: 6px;
        }
        .print-landscape-sales .print-subsection-title,
        .print-landscape-costs .print-subsection-title {
          font-size: 9pt;
          margin-bottom: 3px;
          margin-top: 8px;
        }
        /* Portrait sections */
        .print-portrait {
          page: portrait;
          page-break-before: always;
        }
        /* Summary cards */
        .print-summary-section {
          page-break-inside: avoid;
          margin-bottom: 20px;
        }
        .print-summary-section .grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin: 15px 0;
        }
        /* Header styling */
        .print-header {
          text-align: center;
          margin-bottom: 15px;
          page-break-after: avoid;
        }
        .print-header h1 {
          font-size: 20pt;
          font-weight: bold;
          margin-bottom: 5px;
          color: #1e3a5f;
        }
        /* Section styling */
        .print-section {
          page-break-inside: avoid;
          margin-bottom: 20px;
        }
        .print-section-title {
          font-size: 16pt;
          font-weight: bold;
          color: #1e3a5f;
          margin-bottom: 10px;
          margin-top: 15px;
          border-bottom: 2px solid #1e3a5f;
          padding-bottom: 5px;
        }
        .print-subsection-title {
          font-size: 14pt;
          font-weight: bold;
          color: #385e82;
          margin-bottom: 8px;
          margin-top: 12px;
        }
        .print-insights {
          background: #f8f9fa;
          border-left: 4px solid #385e82;
          padding: 10px 15px;
          margin: 10px 0;
          font-size: 10pt;
        }
        .print-insights ul {
          margin: 5px 0;
          padding-left: 20px;
        }
        .print-insights li {
          margin: 3px 0;
        }
        /* Footer styling */
        .print-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 9pt;
          color: #666;
          page-break-inside: avoid;
        }
        /* Compact table styling */
        .print-table-compact {
          font-size: 9pt;
          margin: 10px 0;
        }
        .print-table-compact th,
        .print-table-compact td {
          padding: 4px 6px;
        }
        /* Remove excessive whitespace */
        .print-content > div {
          margin-bottom: 15px;
        }
        .print-page-break {
          page-break-before: always;
        }
        .print-avoid-break {
          page-break-inside: avoid;
        }
      }
    `;
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Profitability_Report_${selectedYear}`,
    pageStyle: generatePrintStyles()
  });

  const { products: masterProducts, activityTypes: masterActivityTypes, expenseTypes, productMap, activityTypeMap, expenseTypeMap } = useMasterData();
  
  // Use products from the master data map to ensure consistency
  const products = useMemo(() => (productMap ? Array.from(productMap.values()) : []), [productMap]);
  const activityTypes = useMemo(() => (activityTypeMap ? Array.from(activityTypeMap.values()) : []), [activityTypeMap]);

  const productTypes = useMemo(() => {
    const types = new Set(
      (products || [])
        .map(p => normalizeProductTypeName(p.producttype))
        .filter(Boolean)
    );
    return Array.from(types).filter(type => 
      !type.toLowerCase().includes('packaging') && 
      !type.toLowerCase().includes('emballage')
    );
  }, [products]);

  // Memoized expense types for rows
  const expenseTypeRows = useMemo(() => {
    return (expenseTypes || []).map(e => e.name);
  }, [expenseTypes]);

  // Memoized activity types for rows
  const activityTypeRows = useMemo(() => {
    const names = (activityTypes || []).map(a => a.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [activityTypes]);

  // Memoized product sales by type/month
  const productTypeTable = useMemo(() => {
    const table = {};
    productTypes.forEach(type => {
      table[type] = Array(12).fill(0);
    });

    (sales || []).forEach(sale => {
      const d = parseFirestoreDate(sale.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      
      const trimmedProductId = sale.productId?.trim();
      if (!trimmedProductId) return;
      
      let product = productMap.get(trimmedProductId);
      
      if (product && !product.producttype) {
        const masterProduct = masterProducts.find(p => p.id === trimmedProductId);
        if (masterProduct) {
          product.producttype = masterProduct.producttype;
        }
      }
      
      if (!product || !product.producttype || typeof product.producttype !== 'string') {
        return;
      }
      
      const normalizedProductType = normalizeProductTypeName(product.producttype);
      if (!table[normalizedProductType]) {
        return;
      }

      table[normalizedProductType][d.getMonth()] += Number(sale.amountUSD) || 0;
    });
    return table;
  }, [sales, selectedYear, productTypes, productMap, masterProducts]);

  // Memoized expense costs by type/month
  const expenseTypeTable = useMemo(() => {
    const table = {};
    const actualExpenseTypes = new Set();
    
    // First pass: collect all actual expense type names from cost records
    (costs || []).forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      if (expenseType && expenseType.name) {
        actualExpenseTypes.add(expenseType.name);
      }
    });
    
    // Initialize table with actual expense type names
    Array.from(actualExpenseTypes).forEach(type => {
      table[type] = Array(12).fill(0);
    });
    
    // Second pass: populate the table
    (costs || []).forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      if (!expenseType || !expenseType.name) return;
      if (!table[expenseType.name]) return;
      table[expenseType.name][d.getMonth()] += Number(cost.amountUSD) || 0;
    });
    
    return table;
  }, [costs, selectedYear, expenseTypeMap]);

  // Memoized sales by activity type/month
  const activityTypeTable = useMemo(() => {
    const table = {};
    activityTypeRows.forEach(type => {
      table[type] = Array(12).fill(0);
    });
    (sales || []).forEach(sale => {
      const d = parseFirestoreDate(sale.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      const activityType = activityTypeMap.get(sale.activityTypeId);
      if (!activityType || !activityType.name) return;
      if (!table[activityType.name]) return;
      table[activityType.name][d.getMonth()] += Number(sale.amountUSD) || 0;
    });
    return table;
  }, [sales, selectedYear, activityTypeRows, activityTypeMap]);

  // Calculate costs by category
  const costsByCategory = useMemo(() => {
    const categoryTable = {};
    
    (costs || []).forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      const category = expenseType?.category || 'uncategorized';
      
      if (!categoryTable[category]) {
        categoryTable[category] = Array(12).fill(0);
      }
      categoryTable[category][d.getMonth()] += Number(cost.amountUSD) || 0;
    });
    
    // Filter out categories with all zeros
    const filtered = {};
    Object.keys(categoryTable).forEach(cat => {
      const total = categoryTable[cat].reduce((sum, val) => sum + val, 0);
      if (total > 0) {
        filtered[cat] = categoryTable[cat];
      }
    });
    
    return filtered;
  }, [costs, selectedYear, expenseTypeMap]);

  // Compute profitability KPIs and chart data
  const [kpi, chartData, insights] = useMemo(() => {
    if (!sales || !costs) return [{}, { labels: [], datasets: [] }, []];
    // Use stable month labels to prevent stale closures
    const stableMonths = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesByMonth = Array(12).fill(0);
    const costsByMonth = Array(12).fill(0);
    let totalRevenue = 0, totalCosts = 0, numSales = 0;
    
    // Product totals for insights
    const productTotals = {};
    const expenseTypeTotals = {};
    
    sales.forEach(sale => {
      const d = parseFirestoreDate(sale.date);
      if (!d) return;
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      const amount = Number(sale.amountUSD) || 0;
      salesByMonth[m] += amount;
      totalRevenue += amount;
      numSales++;
      
      // Track product totals
      const product = productMap?.get(sale.productId?.trim());
      if (product?.name) {
        productTotals[product.name] = (productTotals[product.name] || 0) + amount;
      }
    });
    
    costs.forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d) return;
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      const amount = Number(cost.amountUSD) || 0;
      costsByMonth[m] += amount;
      totalCosts += amount;
      
      // Track expense type totals
      const expenseType = expenseTypeMap?.get(cost.expenseTypeId);
      if (expenseType?.name) {
        expenseTypeTotals[expenseType.name] = (expenseTypeTotals[expenseType.name] || 0) + amount;
      }
    });
    
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const avgProfitPerSale = numSales > 0 ? grossProfit / numSales : 0;
    
    // Calculate insights
    const profitByMonth = salesByMonth.map((s, i) => s - costsByMonth[i]);
    const bestMonthIndex = profitByMonth.indexOf(Math.max(...profitByMonth));
    const worstMonthIndex = profitByMonth.indexOf(Math.min(...profitByMonth));
    const bestMonth = stableMonths[bestMonthIndex];
    const worstMonth = stableMonths[worstMonthIndex];
    const bestMonthProfit = profitByMonth[bestMonthIndex];
    const worstMonthProfit = profitByMonth[worstMonthIndex];
    
    const topProduct = Object.entries(productTotals).sort(([, a], [, b]) => b - a)[0];
    const topExpenseType = Object.entries(expenseTypeTotals).sort(([, a], [, b]) => b - a)[0];
    
    const insightsList = [
      bestMonth && bestMonthProfit > 0 ? `${safeT(t, 'profitability.pdf.bestSalesMonth', 'Best performing month')}: ${bestMonth} ${safeT(t, 'profitability.pdf.wasTheBestMonth', 'was the best month with')} $${safeFormatNumber(bestMonthProfit)} ${safeT(t, 'profitability.pdf.profit', 'profit')}` : null,
      worstMonth && worstMonthProfit < 0 ? `${safeT(t, 'profitability.pdf.lowestSalesMonth', 'Most challenging month')}: ${worstMonth} ${safeT(t, 'profitability.pdf.withLossOf', 'with loss of')} $${safeFormatNumber(Math.abs(worstMonthProfit))}` : null,
      topProduct ? `${safeT(t, 'profitability.pdf.topProductContribution', 'Top product contributor')}: ${topProduct[0]} ${safeT(t, 'profitability.pdf.generated', 'generated')} $${safeFormatNumber(topProduct[1])} ${safeT(t, 'profitability.pdf.inRevenue', 'in revenue')}` : null,
      topExpenseType ? `${safeT(t, 'profitability.pdf.largestCostDriver', 'Largest cost driver')}: ${topExpenseType[0]} ${safeT(t, 'profitability.pdf.accountedFor', 'accounted for')} $${safeFormatNumber(topExpenseType[1])} ${safeT(t, 'profitability.pdf.inCosts', 'in costs')}` : null,
      profitMargin > 0 ? `${safeT(t, 'profitability.pdf.profitMarginTrend', 'Profit margin trend')}: ${profitMargin.toFixed(2)}% ${safeT(t, 'profitability.pdf.indicates', 'indicates')} ${profitMargin > 20 ? safeT(t, 'profitability.pdf.strong', 'strong') : profitMargin > 10 ? safeT(t, 'profitability.pdf.healthy', 'healthy') : safeT(t, 'profitability.pdf.moderate', 'moderate')} ${safeT(t, 'profitability.pdf.profitabilityAt', 'profitability')}` : null
    ].filter(Boolean);
    
    return [
      {
        totalRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        avgProfitPerSale,
        bestMonth,
        worstMonth,
        bestMonthProfit,
        worstMonthProfit,
        topProduct: topProduct ? { name: topProduct[0], amount: topProduct[1] } : null,
        topExpenseType: topExpenseType ? { name: topExpenseType[0], amount: topExpenseType[1] } : null
      },
      {
        labels: stableMonths,
        datasets: [
          {
            label: safeT(t, 'profitability.salesTrends.sales', 'Ventes'),
            data: salesByMonth,
            borderColor: 'rgba(6, 49, 89, 1)',
            backgroundColor: 'rgba(55, 90, 122, 0.12)',
            fill: true,
          },
          {
            label: safeT(t, 'profitability.salesTrends.costs', 'Coûts'),
            data: costsByMonth,
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            fill: true,
          }
        ]
      },
      insightsList
    ];
  }, [sales, costs, selectedYear, productMap, expenseTypeMap, t]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
        },
      },
      y: {
        display: true,
        grid: {
          display: true,
        },
        ticks: {
          color: '#6B7280',
        },
      },
    },
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2,
        fill: true,
      },
      point: {
        radius: 4,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#6B7280',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false,
    cutout: '65%'
  };

  // General Profitability Table Data - Use translated month labels based on language
  const months = useMemo(() => {
    if (language === 'fr') {
      return [
        t('months.january_short', 'Jan'),
        t('months.february_short', 'Fév'),
        t('months.march_short', 'Mar'),
        t('months.april_short', 'Avr'),
        t('months.may_short', 'Mai'),
        t('months.june_short', 'Juin'),
        t('months.july_short', 'Juil'),
        t('months.august_short', 'Aoû'),
        t('months.september_short', 'Sep'),
        t('months.october_short', 'Oct'),
        t('months.november_short', 'Nov'),
        t('months.december_short', 'Déc')
      ];
    }
    return [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
  }, [language, t]); // Include language and t in dependencies
  const generalTable = useMemo(() => {
    // Group sales/costs by month for selected year
    const salesByMonth = Array(12).fill(0);
    const costsByMonth = Array(12).fill(0);
    (sales || []).forEach(sale => {
      const d = parseFirestoreDate(sale.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      salesByMonth[d.getMonth()] += sale.amountUSD || 0;
    });
    (costs || []).forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d || d.getFullYear() !== selectedYear) return;
      costsByMonth[d.getMonth()] += cost.amountUSD || 0;
    });
    const profitByMonth = salesByMonth.map((s, i) => s - costsByMonth[i]);
    return {
      salesByMonth,
      costsByMonth,
      profitByMonth
    };
  }, [sales, costs, selectedYear]);

  // Calculate sales insights for print section
  const salesInsights = useMemo(() => {
    const maxMonth = generalTable.salesByMonth.indexOf(Math.max(...generalTable.salesByMonth));
    const minMonth = generalTable.salesByMonth.indexOf(Math.min(...generalTable.salesByMonth.filter(v => v > 0)));
    const trend = generalTable.salesByMonth[11] > generalTable.salesByMonth[0] ? 'increasing' : 'decreasing';
    const trendLabel = trend === 'increasing' ? safeT(t, 'profitability.pdf.increasing', 'increasing') : safeT(t, 'profitability.pdf.decreasing', 'decreasing');
    return [
      maxMonth >= 0 ? `${safeT(t, 'profitability.pdf.bestSalesMonth', 'Best sales month')}: ${months[maxMonth]} $${safeFormatNumber(generalTable.salesByMonth[maxMonth])}` : null,
      minMonth >= 0 ? `${safeT(t, 'profitability.pdf.lowestSalesMonth', 'Lowest sales month')}: ${months[minMonth]} $${safeFormatNumber(generalTable.salesByMonth[minMonth])}` : null,
      `${safeT(t, 'profitability.pdf.overallTrend', 'Overall trend')}: ${trendLabel} ${safeT(t, 'profitability.pdf.throughoutTheYear', 'throughout the year')}`
    ].filter(Boolean);
  }, [generalTable.salesByMonth, months, t]);

  // Place this after all data fetching and before return
  const availableYears = useMemo(() => {
    const years = new Set();
    (sales || []).forEach(s => {
      const d = parseFirestoreDate(s.date);
      if (d) {
        years.add(d.getFullYear());
      }
    });
    (costs || []).forEach(c => {
      const d = parseFirestoreDate(c.date);
      if (d) {
        years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, costs]);

  return (
    <AdminOnly>
      <div className="p-4 bg-gray-50">
        {/* Print Content - Hidden on screen, visible in print */}
        <div ref={printRef} className="print-content hidden print:block" style={{ display: 'none' }}>
          {/* Print Header */}
          <div className="print-header">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#385e82]">
                {user?.company || safeT(t, 'profitability.title', 'Profitability Report')}
              </h1>
              <p className="text-gray-600 mt-1">
                {safeT(t, 'profitability.salesTrends.profitabilityOverview', 'Profitability Overview')} - {selectedYear}
              </p>
              {user?.location && (
                <p className="text-xs text-gray-400 mt-1">{user.location}</p>
              )}
            </div>
          </div>
          
          {/* 0. Executive Summary */}
          <div className="print-section print-page-break">
            <h2 className="print-section-title">0. {safeT(t, 'profitability.pdf.executiveSummary', 'Executive Summary')}</h2>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.salesTrends.totalRevenue', 'Total Revenue')}</p>
                <p className="text-lg font-bold text-blue-900">${safeFormatNumber(kpi.totalRevenue)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.salesTrends.totalCosts', 'Total Costs')}</p>
                <p className="text-lg font-bold text-blue-900">${safeFormatNumber(kpi.totalCosts)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.salesTrends.grossProfit', 'Gross Profit')}</p>
                <p className="text-lg font-bold text-[#385e82]">${safeFormatNumber(kpi.grossProfit)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.salesTrends.profitMargin', 'Profit Margin')}</p>
                <p className="text-lg font-bold text-blue-900">{isNaN(kpi.profitMargin) ? '0.00' : kpi.profitMargin?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.salesTrends.avgProfitPerSale', 'Avg Profit/Sale')}</p>
                <p className="text-lg font-bold text-blue-900">${safeFormatNumber(kpi.avgProfitPerSale, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            {kpi.bestMonth && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.pdf.bestMonth', 'Best Month')}</p>
                  <p className="text-sm font-bold text-green-900">{kpi.bestMonth}: ${safeFormatNumber(kpi.bestMonthProfit)}</p>
                </div>
                {kpi.worstMonth && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.pdf.worstMonth', 'Worst Month')}</p>
                    <p className="text-sm font-bold text-red-900">{kpi.worstMonth}: ${safeFormatNumber(kpi.worstMonthProfit)}</p>
                  </div>
                )}
                {kpi.topProduct && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">{safeT(t, 'profitability.pdf.topProduct', 'Top Product')}</p>
                    <p className="text-sm font-bold text-purple-900">{kpi.topProduct.name}: ${safeFormatNumber(kpi.topProduct.amount)}</p>
                  </div>
                )}
              </div>
            )}
            {insights && insights.length > 0 && (
              <div className="print-insights">
                <p className="font-semibold mb-2">{safeT(t, 'profitability.pdf.keyInsights', 'Key Insights')}:</p>
                <ul>
                  {insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* 1. Sales Details */}
          <div className="print-section print-page-break print-landscape-sales">
            <h2 className="print-section-title">1. {safeT(t, 'profitability.pdf.salesDetails', 'Sales Details')}</h2>
            
            {/* 1.1 Overview */}
            <div className="print-subsection">
              <h3 className="print-subsection-title">1.1 {safeT(t, 'profitability.pdf.overview', 'Overview')}</h3>
              <p className="text-xs text-gray-600 mb-3">{safeT(t, 'profitability.pdf.monthlySalesPerformance', 'Monthly sales performance with year-to-date totals.')}</p>
              <div className="print-insights mb-3">
                <ul>
                  {salesInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full print-table-compact text-center text-gray-900 border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-xs text-gray-900 text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-3 py-2 font-semibold text-xs text-gray-900">{m}</th>
                      ))}
                      <th className="px-3 py-2 font-semibold text-xs text-gray-900">{safeT(t, 'profitability.pdf.ytdTotal', 'YTD Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { label: safeT(t, 'profitability.rows.sales', 'Sales'), data: generalTable.salesByMonth, color: 'text-blue-900' },
                      { label: safeT(t, 'profitability.rows.costs', 'Costs'), data: generalTable.costsByMonth, color: 'text-red-700' },
                      { label: safeT(t, 'profitability.rows.profit', 'Profit'), data: generalTable.profitByMonth, color: 'text-[#385e82] font-bold' },
                    ].map((row, idx) => {
                      const ytdTotal = row.data.reduce((sum, val) => sum + val, 0);
                      return (
                        <tr key={row.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className={`px-4 py-2 font-semibold text-xs ${row.color} text-left`}>
                            {row.label}
                          </td>
                          {row.data.map((val, i) => (
                            <td key={i} className="px-3 py-2 text-xs font-medium text-right">
                              ${safeFormatNumber(val)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs font-bold text-right">
                            ${safeFormatNumber(ytdTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 1.2 Sales per Product Type */}
            <div className="print-subsection" style={{ marginTop: '20px' }}>
              <h3 className="print-subsection-title">1.2 {safeT(t, 'profitability.pdf.salesPerProductType', 'Sales per Product Type')}</h3>
              <p className="text-xs text-gray-600 mb-3">{safeT(t, 'profitability.pdf.monthlySalesBreakdown', 'Monthly sales breakdown by product type with year-to-date totals.')}</p>
              <div className="overflow-x-auto">
                <table className="w-full print-table-compact text-center text-gray-900 border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">{safeT(t, 'profitability.pdf.productType', 'Product Type')}</th>
                      {months.map((m, i) => (
                        <th key={i} className="px-3 py-2 font-semibold text-xs text-gray-900">{m}</th>
                      ))}
                      <th className="px-3 py-2 font-semibold text-xs text-gray-900">{safeT(t, 'profitability.pdf.ytdTotal', 'YTD Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productTypes.filter(type => {
                      const total = productTypeTable[type]?.reduce((sum, val) => sum + val, 0) || 0;
                      return total > 0;
                    }).map((type, idx) => {
                      const rowTotal = productTypeTable[type].reduce((sum, val) => sum + val, 0);
                      const normalizedProductTypeForPrint = type.toLowerCase().replace(/\s+/g, '').replace(/'/g, '_');
                      const displayName = getHumanReadableLabel(
                        `products.types.${normalizedProductTypeForPrint}`,
                        t,
                        expenseTypeMap,
                        activityTypeMap,
                        productMap
                      );
                      return (
                        <tr key={type} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">
                            {displayName}
                          </td>
                          {productTypeTable[type].map((val, i) => (
                            <td key={i} className="px-3 py-2 text-xs font-medium text-right">
                              ${safeFormatNumber(val)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs font-bold text-right">
                            ${safeFormatNumber(rowTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-200 font-bold">
                      <td className="px-4 py-2 text-xs text-gray-900 text-left">{safeT(t, 'common.total', 'Total')}</td>
                      {Array(12).fill(0).map((_, monthIndex) => {
                        const monthTotal = productTypes.reduce((sum, type) => sum + (productTypeTable[type]?.[monthIndex] || 0), 0);
                        return (
                          <td key={monthIndex} className="px-3 py-2 text-xs font-semibold text-right">
                            ${safeFormatNumber(monthTotal)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-xs font-semibold text-right">
                        ${safeFormatNumber(productTypes.reduce((grandTotal, type) => 
                          grandTotal + (productTypeTable[type]?.reduce((sum, val) => sum + val, 0) || 0), 0
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* 2. Costs Details */}
          <div className="print-section print-page-break print-landscape-costs">
            <h2 className="print-section-title">2. {safeT(t, 'profitability.pdf.costsDetails', 'Costs Details')}</h2>
            
            {/* 2.1 Overview */}
            <div className="print-subsection">
              <h3 className="print-subsection-title">2.1 {safeT(t, 'profitability.pdf.overview', 'Overview')}</h3>
              <p className="text-xs text-gray-600 mb-3">{safeT(t, 'profitability.pdf.monthlyCostsBreakdown', 'Monthly costs breakdown with year-to-date totals.')}</p>
              <div className="overflow-x-auto">
                <table className="w-full print-table-compact text-center text-gray-900 border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">{safeT(t, 'profitability.pdf.category', 'Category')}</th>
                      {months.map((m, i) => (
                        <th key={i} className="px-3 py-2 font-semibold text-xs text-gray-900">{m}</th>
                      ))}
                      <th className="px-3 py-2 font-semibold text-xs text-gray-900">{safeT(t, 'profitability.pdf.ytdTotal', 'YTD Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.keys(costsByCategory).map((category, idx) => {
                      const rowTotal = costsByCategory[category].reduce((sum, val) => sum + val, 0);
                      const categoryLabel = t(`masterData.expenseCategories.${category}`) || category.charAt(0).toUpperCase() + category.slice(1);
                      return (
                        <tr key={category} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">
                            {categoryLabel}
                          </td>
                          {costsByCategory[category].map((val, i) => (
                            <td key={i} className="px-3 py-2 text-xs font-medium text-right">
                              ${safeFormatNumber(val)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs font-bold text-right">
                            ${safeFormatNumber(rowTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-200 font-bold">
                      <td className="px-4 py-2 text-xs text-gray-900 text-left">{safeT(t, 'common.total', 'Total')}</td>
                      {Array(12).fill(0).map((_, monthIndex) => {
                        const monthTotal = Object.keys(costsByCategory).reduce((sum, cat) => sum + (costsByCategory[cat]?.[monthIndex] || 0), 0);
                        return (
                          <td key={monthIndex} className="px-3 py-2 text-xs font-semibold text-right">
                            ${safeFormatNumber(monthTotal)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-xs font-semibold text-right">
                        ${safeFormatNumber(Object.keys(costsByCategory).reduce((grandTotal, cat) => 
                          grandTotal + (costsByCategory[cat]?.reduce((sum, val) => sum + val, 0) || 0), 0
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 2.2 Costs per Expense Type */}
            <div className="print-subsection" style={{ marginTop: '20px' }}>
              <h3 className="print-subsection-title">2.2 {safeT(t, 'profitability.pdf.costsPerExpenseType', 'Costs per Expense Type')}</h3>
              <p className="text-xs text-gray-600 mb-3">{safeT(t, 'profitability.pdf.detailedMonthlyCosts', 'Detailed monthly costs by expense type with year-to-date totals.')}</p>
              <div className="overflow-x-auto">
                <table className="w-full print-table-compact text-center text-gray-900 border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">{safeT(t, 'profitability.pdf.expenseType', 'Expense Type')}</th>
                      {months.map((m, i) => (
                        <th key={i} className="px-3 py-2 font-semibold text-xs text-gray-900">{m}</th>
                      ))}
                      <th className="px-3 py-2 font-semibold text-xs text-gray-900">{safeT(t, 'profitability.pdf.ytdTotal', 'YTD Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.keys(expenseTypeTable).filter(type => {
                      const total = expenseTypeTable[type]?.reduce((sum, val) => sum + val, 0) || 0;
                      return total > 0;
                    }).map((type, idx) => {
                      const rowTotal = expenseTypeTable[type].reduce((sum, val) => sum + val, 0);
                      const expenseType = expenseTypeMap.get(
                        Array.from(expenseTypeMap.values()).find(e => e.name === type)?.id || ''
                      );
                      const normalizedExpenseTypeForPrint = type.replace(/\s+/g, '_').toLowerCase();
                      const displayName = expenseType?.name || getHumanReadableLabel(
                        `masterData.expenses.types.${normalizedExpenseTypeForPrint}`,
                        t,
                        expenseTypeMap,
                        activityTypeMap,
                        productMap
                      );
                      return (
                        <tr key={type} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-semibold text-xs text-gray-900 text-left">
                            {displayName}
                          </td>
                          {expenseTypeTable[type].map((val, i) => (
                            <td key={i} className="px-3 py-2 text-xs font-medium text-right">
                              ${safeFormatNumber(val)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-xs font-bold text-right">
                            ${safeFormatNumber(rowTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-200 font-bold">
                      <td className="px-4 py-2 text-xs text-gray-900 text-left">{safeT(t, 'common.total', 'Total')}</td>
                      {Array(12).fill(0).map((_, monthIndex) => {
                        const monthTotal = Object.keys(expenseTypeTable).reduce((sum, type) => sum + (expenseTypeTable[type]?.[monthIndex] || 0), 0);
                        return (
                          <td key={monthIndex} className="px-3 py-2 text-xs font-semibold text-right">
                            ${safeFormatNumber(monthTotal)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-xs font-semibold text-right">
                        ${safeFormatNumber(Object.keys(expenseTypeTable).reduce((grandTotal, type) => 
                          grandTotal + (expenseTypeTable[type]?.reduce((sum, val) => sum + val, 0) || 0), 0
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* 3. Profitability Analysis */}
          <div className="print-section print-page-break">
            <h2 className="print-section-title">3. {safeT(t, 'profitability.pdf.profitabilityAnalysis', 'Profitability Analysis')}</h2>
            <div className="print-insights">
              <p className="font-semibold mb-2">{safeT(t, 'profitability.pdf.keyObservations', 'Key Observations')}:</p>
              <ul>
                {kpi.topProduct && (
                  <li>{safeT(t, 'profitability.pdf.topProductContribution', 'Top product contribution')}: {kpi.topProduct.name} {safeT(t, 'profitability.pdf.generated', 'generated')} ${safeFormatNumber(kpi.topProduct.amount)} {safeT(t, 'profitability.pdf.inRevenue', 'in revenue')}</li>
                )}
                {kpi.topExpenseType && (
                  <li>{safeT(t, 'profitability.pdf.largestCostDriver', 'Largest cost driver')}: {kpi.topExpenseType.name} {safeT(t, 'profitability.pdf.accountedFor', 'accounted for')} ${safeFormatNumber(kpi.topExpenseType.amount)} {safeT(t, 'profitability.pdf.inCosts', 'in costs')}</li>
                )}
                {kpi.profitMargin > 0 && (
                  <li>{safeT(t, 'profitability.pdf.profitMarginTrend', 'Profit margin trend')}: {kpi.profitMargin > 20 ? safeT(t, 'profitability.pdf.strong', 'Strong') : kpi.profitMargin > 10 ? safeT(t, 'profitability.pdf.healthy', 'Healthy') : safeT(t, 'profitability.pdf.moderate', 'Moderate')} {safeT(t, 'profitability.pdf.profitabilityAt', 'profitability at')} {kpi.profitMargin.toFixed(2)}%</li>
                )}
                {kpi.bestMonth && (
                  <li>{safeT(t, 'profitability.pdf.peakPerformance', 'Peak performance')}: {kpi.bestMonth} {safeT(t, 'profitability.pdf.wasTheBestMonth', 'was the best month with')} ${safeFormatNumber(kpi.bestMonthProfit)} {safeT(t, 'profitability.pdf.profit', 'profit')}</li>
                )}
              </ul>
            </div>
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
              <p className="mt-1">Report ID: PROF-{selectedYear}-{Date.now().toString().slice(-6)}</p>
            </div>
          </div>
        </div>
        
        {/* Screen Content */}
        <div className="print:hidden">
          <div className="mb-4">
            <Link href="/dashboard/reports" className="inline-flex items-center bg-[#385e82] text-white rounded px-4 py-2 hover:bg-[#052c4f] transition">
              <HiArrowNarrowLeft className="mr-2 h-5 w-5" /> {safeT(t, 'reports.title', 'Reports')}
            </Link>
          </div>
        {/* Main Stats Card */}
        <Card className="mb-6 !rounded-2xl overflow-hidden" style={{ minHeight: '260px' }}>
          <div className="flex flex-col" style={{ minHeight: '240px' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black font-semibold text-base">{safeT(t, 'profitability.salesTrends.grossProfit', 'Gross Profit')}</p>
                <h2 className="text-5xl font-bold text-[#385e82]">${String(kpi.grossProfit?.toLocaleString() ?? 0)}</h2>
                <div className="flex items-center mt-2">
                  <span className="flex items-center rounded-full px-2 py-1 text-blue-700 bg-blue-100">
                    {safeT(t, 'profitability.salesTrends.profitabilityOverview', 'Profitability Overview')}
                  </span>
                </div>
              </div>
              <div className="h-36 flex-grow ml-4">
                {chartData?.labels?.length > 0 && chartData.datasets?.length > 0 ? (
                  <LineChart data={chartData} options={chartOptions} />
                ) : (
                  <div className="h-36 flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-5 gap-4 mt-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{safeT(t, 'profitability.salesTrends.totalRevenue', 'Total Revenue')}</p>
                <p className="text-2xl font-semibold text-blue-900">${String(kpi.totalRevenue?.toLocaleString() ?? 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{safeT(t, 'profitability.salesTrends.totalCosts', 'Total Costs')}</p>
                <p className="text-2xl font-semibold text-blue-900">${String(kpi.totalCosts?.toLocaleString() ?? 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{safeT(t, 'profitability.salesTrends.grossProfit', 'Gross Profit')}</p>
                <p className="text-2xl font-semibold text-[#385e82]">${String(kpi.grossProfit?.toLocaleString() ?? 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{safeT(t, 'profitability.salesTrends.profitMargin', 'Profit Margin')}</p>
                <p className="text-2xl font-semibold text-blue-900">{String(isNaN(kpi.profitMargin) ? '0.00' : kpi.profitMargin?.toFixed(2) ?? '0.00')}%</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{safeT(t, 'profitability.salesTrends.avgProfitPerSale', 'Average Profit Per Sale')}</p>
                <p className="text-2xl font-semibold text-blue-900">${String(isNaN(kpi.avgProfitPerSale) ? '0' : kpi.avgProfitPerSale?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '0')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs Navigation and Tab Content */}
        <Card className="overflow-visible mb-8 bg-white/90 border-0 shadow-none">
          <div className="flex items-center justify-between border-b border-[#385e82] pb-2 px-2">
            <nav className="flex space-x-2" aria-label="Tabs">
              {[
                { key: "general", label: safeT(t, 'profitability.tabs.general', 'General') },
                { key: "products", label: safeT(t, 'profitability.tabs.products', 'Products') },
                { key: "expenses", label: safeT(t, 'profitability.tabs.expenses', 'Expenses') },
                { key: "activities", label: safeT(t, 'profitability.tabs.activities', 'Activities') },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-2 rounded-t-lg font-semibold text-base transition-all duration-200 border-b-4 ${activeTab === tab.key ? 'border-[#385e82] text-[#385e82] bg-white' : 'border-transparent text-gray-400 bg-transparent hover:text-[#385e82]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="bg-[#385e82] hover:bg-[#031b31] text-white font-medium px-4"
              >
                <HiDocumentDownload className="h-5 w-5 mr-2" />
                {safeT(t, 'reports.cashBook.exportPDF', 'Export PDF')}
              </Button>
              <span className="text-sm font-medium text-[#385e82]">{safeT(t, 'profitability.year', 'Year')}:</span>
              <select
                className="rounded-lg border border-[#385e82] px-3 py-1 text-sm bg-white text-[#385e82] font-bold"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

                {/* Tab Content */}
        {activeTab === "general" && (
          <Card className="!rounded-2xl">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-[#385e82] mb-4">{safeT(t, 'profitability.tabs.general', 'General Profitability')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-center text-gray-900 rounded overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                  <thead className="bg-[#6c97be]">
                    <tr>
                      <th className="px-6 py-2 font-semibold text-base text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-base text-white">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { label: safeT(t, 'profitability.rows.sales', 'Sales'), data: generalTable.salesByMonth, color: 'text-blue-900' },
                      { label: safeT(t, 'profitability.rows.costs', 'Costs'), data: generalTable.costsByMonth, color: 'text-red-700', invert: true },
                      { label: safeT(t, 'profitability.rows.profit', 'Profit'), data: generalTable.profitByMonth, color: 'text-[#385e82] font-bold' },
                    ].map((row, idx) => (
                      <tr
                        key={row.label}
                        className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                          idx % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                        } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                      >
                        <td className={`px-6 py-2 font-semibold text-base ${row.color} text-left`}>
                          {row.label}
                        </td>
                        {row.data.map((val, i) => {
                          let bgClass = "bg-gray-50 text-gray-700";
                          if (i > 0) {
                            const diff = val - row.data[i - 1];
                            if (diff > 0) {
                              bgClass = row.invert ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
                            } else if (diff < 0) {
                              bgClass = row.invert ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
                            }
                          }
                          return (
                            <td key={i} className="px-6 py-3 text-base font-medium">
                              <span className={`px-3 py-1 rounded-full ${bgClass}`}>
                                {safeFormatNumber(val)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
        {activeTab === "products" && (
          <Card className="!rounded-2xl">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">{safeT(t, 'profitability.tabs.products', 'Product Sales by Month')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-center text-gray-900 rounded overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                  <thead style={{backgroundColor: '#966262'}}>
                    <tr>
                      <th className="px-6 py-4 font-semibold text-base text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-base text-white">{m}</th>
                      ))}
                      <th className="px-6 py-2 font-semibold text-base text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                  {productTypes.map((type, idx) => {
                    const rowTotal = productTypeTable[type].reduce((sum, val) => sum + val, 0);
                    const normalizedProductType = type.toLowerCase().replace(/\s+/g, '').replace(/'/g, '_');
                    const productLabel = safeT(t, `products.types.${normalizedProductType}`, type);
                    
                    return (
                      <tr
                        key={type}
                        className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                          idx % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                        } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                      >
                        <td className="px-6 py-2 font-semibold text-base text-gray-900 text-left">
                          {productLabel}
                        </td>
                        {productTypeTable[type].map((val, i) => {
                          let bgClass = "text-gray-700";
                          let bgStyle = {backgroundColor: '#f2eddd'};
                          if (i > 0) {
                            const diff = val - productTypeTable[type][i - 1];
                            if (diff > 0) {
                              bgClass = "bg-green-50 text-green-700";
                              bgStyle = {};
                            } else if (diff < 0) {
                              bgClass = "bg-red-50 text-red-700";
                              bgStyle = {};
                            }
                          }
                          return (
                            <td key={i} className="px-6 py-2 text-base font-medium">
                              <span className={`px-3 py-1 rounded-full ${bgClass}`} style={bgStyle}>
                                {safeFormatNumber(val)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-3 text-base font-semibold font-bold" style={{color: '#6a2020'}}>
                          <span className="px-3 py-1 rounded-full text-white" style={{backgroundColor: '#a16363'}}>
                            {safeFormatNumber(rowTotal)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold text-white" style={{backgroundColor: '#966262'}}>
                    <td className="px-6 py-2 text-base text-left">
                      {safeT(t, 'common.total', 'Total')}
                    </td>
                    {Array(12).fill(0).map((_, monthIndex) => {
                      const monthTotal = productTypes.reduce((sum, type) => sum + productTypeTable[type][monthIndex], 0);
                      return (
                        <td key={monthIndex} className="px-6 py-4 text-base font-semibold">
                          {safeFormatNumber(monthTotal)}
                        </td>
                      );
                    })}
                      <td className="px-6 py-1 text-base font-semibold">
                        {safeFormatNumber(productTypes.reduce((grandTotal, type) => 
                          grandTotal + productTypeTable[type].reduce((sum, val) => sum + val, 0), 0
                        ))}
                      </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
        {activeTab === "expenses" && (
          <Card className="!rounded-2xl">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-red-700 mb-4">{safeT(t, 'profitability.tabs.expenses', 'Expenses by Month')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-center text-gray-900 rounded overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                  <thead className="bg-red-300">
                    <tr>
                      <th className="px-6 py-2 font-semibold text-base text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-base text-white">{m}</th>
                      ))}
                      <th className="px-6 py-2 font-semibold text-base text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {Object.keys(expenseTypeTable).map((type, idx) => {
                    const rowTotal = expenseTypeTable[type].reduce((sum, val) => sum + val, 0);
                    const normalizedExpenseType = type.replace(/\s+/g, '_').toLowerCase();
                    const expenseLabel = safeT(t, `masterData.expenses.types.${normalizedExpenseType}`, type);
                    
                    return (
                      <tr
                        key={type}
                        className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                          idx % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                        } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                      >
                        <td className="px-6 py-2 font-semibold text-base text-gray-900 text-left">
                          {expenseLabel}
                        </td>
                        {expenseTypeTable[type].map((val, i) => {
                          let bgClass = "bg-gray-50 text-gray-700";
                          if (i > 0) {
                            const diff = val - expenseTypeTable[type][i - 1];
                            if (diff > 0) { // Higher cost is bad
                              bgClass = "bg-red-50 text-red-700";
                            } else if (diff < 0) { // Lower cost is good
                              bgClass = "bg-green-50 text-green-700";
                            }
                          }
                          return (
                            <td key={i} className="px-6 py-2 text-base font-medium">
                              <span className={`px-3 py-1 rounded-full ${bgClass}`}>
                                {safeFormatNumber(val)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-3 text-base font-semibold font-bold text-red-900">
                          <span className="px-3 py-1 rounded-full bg-red-50 text-red-900">
                            {safeFormatNumber(rowTotal)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-red-300 font-bold text-white">
                    <td className="px-6 py-1 text-base text-left">
                      {safeT(t, 'common.total', 'Total')}
                    </td>
                    {Array(12).fill(0).map((_, monthIndex) => {
                      const monthTotal = Object.keys(expenseTypeTable).reduce((sum, type) => sum + expenseTypeTable[type][monthIndex], 0);
                      return (
                        <td key={monthIndex} className="px-6 py-4 text-base font-semibold">
                          {safeFormatNumber(monthTotal)}
                        </td>
                      );
                    })}
                      <td className="px-6 py-1 text-base font-semibold">
                        {safeFormatNumber(Object.keys(expenseTypeTable).reduce((grandTotal, type) => 
                          grandTotal + expenseTypeTable[type].reduce((sum, val) => sum + val, 0), 0
                        ))}
                      </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
        {activeTab === "activities" && (
          <Card className="!rounded-2xl">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-4">{safeT(t, 'profitability.tabs.activities', 'Activities by Month')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-center text-gray-900 rounded overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                  <thead className="bg-green-600/50">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-base text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-3 font-semibold text-base text-white">{m}</th>
                      ))}
                      <th className="px-6 py-3 font-semibold text-base text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activityTypeRows.map((type, idx) => {
                      const rowTotal = activityTypeTable[type].reduce((sum, val) => sum + val, 0);
                      const normalizedType = type.replace(/\s+/g, '_').toLowerCase();
                      const activityLabel = safeT(t, `products.activities.${normalizedType}`, type);
                      
                      return (
                        <tr
                          key={type}
                          className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                            idx % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                          } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                        >
                          <td className="px-6 py-4 font-semibold text-base text-green-900 text-left">
                            {activityLabel}
                          </td>
                          {activityTypeTable[type].map((val, i) => {
                            let bgClass = "bg-gray-100 text-gray-800";
                            if (i > 0) {
                              const diff = val - activityTypeTable[type][i - 1];
                              if (diff > 0) {
                                bgClass = "bg-green-50 text-green-700";
                              } else if (diff < 0) {
                                bgClass = "bg-red-50 text-red-700";
                              }
                            }
                            return (
                              <td key={i} className="px-6 py-4 text-base font-medium">
                                <span className={`px-3 py-1 rounded-full ${bgClass}`}>
                                  {safeFormatNumber(val)}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-6 py-3 text-base font-semibold font-bold text-green-900">
                            <span className="px-3 py-1 rounded-full bg-green-50 text-green-900">
                              {safeFormatNumber(rowTotal)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-green-600/50 font-bold text-white">
                      <td className="px-6 py-4 text-base text-left">
                        {safeT(t, 'common.total', 'Total')}
                      </td>
                      {Array(12).fill(0).map((_, monthIndex) => {
                        const monthTotal = activityTypeRows.reduce((sum, type) => sum + activityTypeTable[type][monthIndex], 0);
                        return (
                          <td key={monthIndex} className="px-6 py-4 text-base font-semibold">
                            {safeFormatNumber(monthTotal)}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-base font-semibold">
                        {safeFormatNumber(
                          activityTypeRows.reduce((grandTotal, type) => 
                            grandTotal + activityTypeTable[type].reduce((sum, val) => sum + val, 0), 0
                          )
                        )}
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminOnly>
  );
}
