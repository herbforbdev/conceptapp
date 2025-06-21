"use client";

import { Card } from "flowbite-react";
import { useEffect, useState, useMemo } from "react";
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
import Link from "next/link";
import AdminOnly from '@/components/AdminOnly';
import { parseFirestoreDate } from "@/lib/utils/dateUtils.ts";
import { normalizeProductTypeName } from "@/lib/utils/nameUtils";
import { Doughnut } from "react-chartjs-2";

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
  const { t } = useLanguage();
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("general");

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

      table[normalizedProductType][d.getMonth()] += sale.amountUSD || 0;
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
      table[expenseType.name][d.getMonth()] += cost.amountUSD || 0;
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
      table[activityType.name][d.getMonth()] += sale.amountUSD || 0;
    });
    return table;
  }, [sales, selectedYear, activityTypeRows, activityTypeMap]);

  // Compute profitability KPIs and chart data
  const [kpi, chartData] = useMemo(() => {
    if (!sales || !costs) return [{}, { labels: [], datasets: [] }];
    // Use stable month labels to prevent stale closures
    const stableMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesByMonth = Array(12).fill(0);
    const costsByMonth = Array(12).fill(0);
    let totalRevenue = 0, totalCosts = 0, numSales = 0;
    sales.forEach(sale => {
      const d = parseFirestoreDate(sale.date);
      if (!d) return;

      // CRITICAL FIX: Filter by selectedYear for KPIs
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      salesByMonth[m] += sale.amountUSD || 0;
      totalRevenue += sale.amountUSD || 0;
      numSales++;
    });
    costs.forEach(cost => {
      const d = parseFirestoreDate(cost.date);
      if (!d) return;

      // CRITICAL FIX: Filter by selectedYear for KPIs
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      costsByMonth[m] += cost.amountUSD || 0;
      totalCosts += cost.amountUSD || 0;
    });
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const avgProfitPerSale = numSales > 0 ? grossProfit / numSales : 0;
    return [
      {
        totalRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        avgProfitPerSale
      },
      {
        labels: stableMonths,
        datasets: [
          {
            label: 'Ventes',
            data: salesByMonth,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            fill: true,
          },
          {
            label: 'Coûts',
            data: costsByMonth,
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            fill: true,
          }
        ]
      }
    ];
  }, [sales, costs, selectedYear]);

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

  // General Profitability Table Data - Use stable month labels
  const months = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []); // Stable values to prevent re-renders
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
                <table className="w-full text-sm text-center text-gray-900 rounded overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                  <thead className="bg-[#385e82]/90">
                    <tr>
                      <th className="px-6 py-2 font-semibold text-sm text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-sm text-white">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { label: safeT(t, 'profitability.rows.sales', 'Sales'), data: generalTable.salesByMonth, color: 'text-blue-700' },
                      { label: safeT(t, 'profitability.rows.costs', 'Costs'), data: generalTable.costsByMonth, color: 'text-red-700', invert: true },
                      { label: safeT(t, 'profitability.rows.profit', 'Profit'), data: generalTable.profitByMonth, color: 'text-[#385e82] font-bold' },
                    ].map((row, idx) => (
                      <tr key={row.label} className="hover:bg-gray-50">
                        <td className={`px-6 py-2 font-semibold text-sm ${row.color} text-left`}>
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
                            <td key={i} className="px-6 py-3 text-sm font-medium">
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
                  <thead className="bg-blue-900/80">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-sm text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-sm text-white">{m}</th>
                      ))}
                      <th className="px-6 py-2 font-semibold text-sm text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {productTypes.map((type, idx) => {
                    const rowTotal = productTypeTable[type].reduce((sum, val) => sum + val, 0);
                    return (
                      <tr key={type} className="hover:bg-gray-50">
                        <td className="px-6 py-2 font-semibold text-sm text-gray-900 text-left">
                          {safeT(t, `products.types.${type.toLowerCase().replace(/\s+/g, '').replace(/'/g, '_')}`, type)}
                        </td>
                        {productTypeTable[type].map((val, i) => {
                          let bgClass = "bg-gray-50 text-gray-700";
                          if (i > 0) {
                            const diff = val - productTypeTable[type][i - 1];
                            if (diff > 0) {
                              bgClass = "bg-green-50 text-green-700";
                            } else if (diff < 0) {
                              bgClass = "bg-red-50 text-red-700";
                            }
                          }
                          return (
                            <td key={i} className="px-6 py-2 text-sm font-medium">
                              <span className={`px-3 py-1 rounded-full ${bgClass}`}>
                                {safeFormatNumber(val)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-3 text-base font-semibold font-bold text-blue-800">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-900">
                            {safeFormatNumber(rowTotal)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-900/80 font-bold text-white">
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
                      <th className="px-6 py-2 font-semibold text-sm text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-2 font-semibold text-sm text-white">{m}</th>
                      ))}
                      <th className="px-6 py-2 font-semibold text-sm text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {Object.keys(expenseTypeTable).map((type, idx) => {
                    const rowTotal = expenseTypeTable[type].reduce((sum, val) => sum + val, 0);
                    return (
                      <tr key={type} className="hover:bg-gray-50">
                        <td className="px-6 py-2 font-semibold text-sm text-gray-900 text-left">
                          {safeT(t, `masterData.expenses.types.${type.replace(/\s+/g, '_').toLowerCase()}`, type)}
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
                            <td key={i} className="px-6 py-2 text-sm font-medium">
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
                      <th className="px-6 py-3 font-semibold text-sm text-white text-left"></th>
                      {months.map((m, i) => (
                        <th key={i} className="px-6 py-3 font-semibold text-sm text-white">{m}</th>
                      ))}
                      <th className="px-6 py-3 font-semibold text-sm text-white">{safeT(t, 'common.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {activityTypeRows.map((type, idx) => {
                    const rowTotal = activityTypeTable[type].reduce((sum, val) => sum + val, 0);
                                          return (
                        <tr key={type} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-sm text-green-900 text-left">
                            {safeT(t, `products.activities.${type.replace(/\s+/g, '_').toLowerCase()}`, type)}
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
                              <td key={i} className="px-6 py-4 text-sm font-medium">
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
                        {safeFormatNumber(activityTypeRows.reduce((grandTotal, type) => 
                          grandTotal + activityTypeTable[type].reduce((sum, val) => sum + val, 0), 0
                        ))}
                      </td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
      </div>
    </AdminOnly>
  );
} 
