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
  const { data: products } = useFirestoreCollection("Products");
  const { data: activityTypes } = useFirestoreCollection("ActivityTypes");
  const { data: costs } = useFirestoreCollection("Costs");
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("general");

  const { products: masterProducts, activityTypes: masterActivityTypes, expenseTypes, productMap, activityTypeMap, expenseTypeMap } = useMasterData();

  // Memoized product types for rows
  const productTypes = useMemo(() => {
    const types = new Set((products || []).map(p => p.producttype).filter(Boolean));
    return Array.from(types);
  }, [products]);

  // Memoized expense types for rows
  const expenseTypeRows = useMemo(() => {
    return (expenseTypes || []).map(e => e.name);
  }, [expenseTypes]);

  // Memoized activity types for rows
  const activityTypeRows = useMemo(() => {
    return (activityTypes || []).map(a => a.name);
  }, [activityTypes]);

  // Memoized product sales by type/month
  const productTypeTable = useMemo(() => {
    const table = {};
    productTypes.forEach(type => {
      table[type] = Array(12).fill(0);
    });
    (sales || []).forEach(sale => {
      if (!sale.date) return;
      const d = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
      if (d.getFullYear() !== selectedYear) return;
      const product = productMap.get(sale.productId);
      if (!product || !product.producttype) return;
      if (!table[product.producttype]) return;
      table[product.producttype][d.getMonth()] += sale.amountUSD || 0;
    });
    return table;
  }, [sales, selectedYear, productTypes, productMap]);

  // Memoized expense costs by type/month
  const expenseTypeTable = useMemo(() => {
    const table = {};
    expenseTypeRows.forEach(type => {
      table[type] = Array(12).fill(0);
    });
    (costs || []).forEach(cost => {
      if (!cost.date) return;
      const d = cost.date.seconds ? new Date(cost.date.seconds * 1000) : new Date(cost.date);
      if (d.getFullYear() !== selectedYear) return;
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      if (!expenseType || !expenseType.name) return;
      if (!table[expenseType.name]) return;
      table[expenseType.name][d.getMonth()] += cost.amountUSD || 0;
    });
    return table;
  }, [costs, selectedYear, expenseTypeRows, expenseTypeMap]);

  // Memoized sales by activity type/month
  const activityTypeTable = useMemo(() => {
    const table = {};
    activityTypeRows.forEach(type => {
      table[type] = Array(12).fill(0);
    });
    (sales || []).forEach(sale => {
      if (!sale.date) return;
      const d = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
      if (d.getFullYear() !== selectedYear) return;
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
    // Group sales and costs by month
    const months = [
      t('months.january_short'), t('months.february_short'), t('months.march_short'),
      t('months.april_short'), t('months.may_short'), t('months.june_short'),
      t('months.july_short'), t('months.august_short'), t('months.september_short'),
      t('months.october_short'), t('months.november_short'), t('months.december_short')
    ];
    const salesByMonth = Array(12).fill(0);
    const costsByMonth = Array(12).fill(0);
    let totalRevenue = 0, totalCosts = 0, numSales = 0;
    sales.forEach(sale => {
      if (!sale.date) return;
      const d = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
      const m = d.getMonth();
      salesByMonth[m] += sale.amountUSD || 0;
      totalRevenue += sale.amountUSD || 0;
      numSales++;
    });
    costs.forEach(cost => {
      if (!cost.date) return;
      const d = cost.date.seconds ? new Date(cost.date.seconds * 1000) : new Date(cost.date);
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
        labels: months,
        datasets: [
          {
            label: t('profitability.salesTrends.sales') || 'Sales',
            data: salesByMonth,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            fill: true,
          },
          {
            label: t('profitability.salesTrends.costs') || 'Costs',
            data: costsByMonth,
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            fill: true,
          }
        ]
      }
    ];
  }, [sales, costs, t]);

  useEffect(() => {
    if (sales && products && activityTypes) {
      // Process activity type data correctly
      const activityData = sales.reduce((acc, sale) => {
        const year = new Date(sale.date.seconds * 1000).getFullYear();
        const activity = activityTypes.find(at => at.id === sale.activityTypeId);
        const activityType = activity ? activity.name : 'Other';
        
        if (!acc[year]) {
          acc[year] = {};
        }
        if (!acc[year][activityType]) {
          acc[year][activityType] = { cdf: 0, usd: 0 };
        }
        
        acc[year][activityType].cdf += sale.amountFC || 0;
        acc[year][activityType].usd += sale.amountUSD || 0;
        return acc;
      }, {});

      setYearlyActivityType(activityData);

      // Process monthly data by product type
      const processProductTypeData = (productType) => {
        const typeProducts = products.filter(p => p.producttype === productType);
        const monthlyStats = {};
        
        sales.forEach(sale => {
          if (sale.date) {
            const product = typeProducts.find(p => p.productid === sale.productId);
            if (product) {
              const date = new Date(sale.date.seconds * 1000);
              const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
              
              if (!monthlyStats[monthYear]) {
                monthlyStats[monthYear] = {};
              }
              
              if (!monthlyStats[monthYear][product.productid]) {
                monthlyStats[monthYear][product.productid] = 0;
              }
              
              monthlyStats[monthYear][product.productid] += sale.amountUSD || 0;
            }
          }
        });

        return monthlyStats;
      };

      const iceBlocksData = processProductTypeData('Ice Blocks');
      const iceCubesData = processProductTypeData('Cubes');
      const iceBottlesData = processProductTypeData('Bottles');

      const months = [...new Set(Object.keys(iceBlocksData))].sort((a, b) => 
        new Date(a) - new Date(b)
      );

      const getChartData = (data, productType) => {
        const productIds = [...new Set(
          Object.values(data).flatMap(month => Object.keys(month))
        )];

        const colors = [
          '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
          '#06b6d4', '#84cc16', '#14b8a6', '#6366f1', '#f43f5e'
        ];

        return {
          labels: months,
          datasets: productIds.map((productId, index) => ({
            label: productId,
            data: months.map(month => data[month]?.[productId] || 0),
            borderColor: colors[index % colors.length],
            backgroundColor: `${colors[index % colors.length]}20`,
            fill: true,
          }))
        };
      };

      setTrendChartData({
        iceBlocks: getChartData(iceBlocksData, 'Ice Blocks'),
        iceCubes: getChartData(iceCubesData, 'Cubes'),
        iceBottles: getChartData(iceBottlesData, 'Bottles')
      });

      // Process yearly distribution data
      const years = [...new Set(sales.map(sale => 
        new Date(sale.date.seconds * 1000).getFullYear()
      ))].sort((a, b) => b - a);
      setSelectedYear(years[0] || new Date().getFullYear());

      const distributionData = sales.reduce((acc, sale) => {
        const year = new Date(sale.date.seconds * 1000).getFullYear();
        const channel = sale.channel || 'Other';
        
        if (!acc[year]) {
          acc[year] = {};
        }
        if (!acc[year][channel]) {
          acc[year][channel] = { cdf: 0, usd: 0 };
        }
        
        acc[year][channel].cdf += sale.amountFC || 0;
        acc[year][channel].usd += sale.amountUSD || 0;
        return acc;
      }, {});

      setYearlyDistribution(distributionData);

      // Process monthly data for the table with CDF amounts
      const monthlyTableData = sales
        .filter(sale => new Date(sale.date.seconds * 1000).getFullYear() === selectedYear)
        .reduce((acc, sale) => {
          const date = new Date(sale.date.seconds * 1000);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          
          if (!acc[monthYear]) {
            acc[monthYear] = {
              totalUSD: 0,
              totalCDF: 0,
              count: 0
            };
          }
          
          acc[monthYear].totalUSD += sale.amountUSD || 0;
          acc[monthYear].totalCDF += sale.amountFC || 0;
          acc[monthYear].count += 1;
          return acc;
        }, {});

      setMonthlyData(Object.entries(monthlyTableData)
        .sort((a, b) => new Date(b[0]) - new Date(a[0])));
    }
  }, [sales, products, activityTypes, selectedYear]);

  useEffect(() => {
    if (sales && products) {
      // Calculate total sales and growth
      const totalSales = sales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);
      
      // Calculate sales by product type
      const productSales = sales.reduce((acc, sale) => {
        const product = products.find(p => p.productid === sale.productId);
        if (product) {
          if (!acc[product.producttype]) {
            acc[product.producttype] = {
              name: product.producttype,
              sales: 0
            };
          }
          acc[product.producttype].sales += sale.amountUSD || 0;
        }
        return acc;
      }, {});

      // Calculate best selling product
      const bestSellingProduct = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)[0];

      // Calculate specific product type sales
      const iceBlocsSales = productSales['Ice Blocks']?.sales || 0;
      const cubesSales = productSales['Cubes']?.sales || 0;
      const bottlesSales = productSales['Bottles']?.sales || 0;

      setPerformanceData(prev => ({
        ...prev,
        totalSales,
        bestSellingProduct,
        iceBlocsSales,
        cubesSales,
        bottlesSales
      }));
    }
  }, [sales, products]);

  useEffect(() => {
    if (sales) {
      const monthlyData = sales.reduce((acc, sale) => {
        if (sale.date) {
          const date = new Date(sale.date.seconds * 1000);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          
          if (!acc[monthYear]) {
            acc[monthYear] = {
              totalUSD: 0,
              count: 0,
              average: 0
            };
          }
          
          acc[monthYear].totalUSD += sale.amountUSD || 0;
          acc[monthYear].count += 1;
          acc[monthYear].average = acc[monthYear].totalUSD / acc[monthYear].count;
        }
        return acc;
      }, {});

      const sortedMonthlyData = Object.entries(monthlyData)
        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));

      setTrendChartData({
        labels: sortedMonthlyData.map(([month]) => month),
        datasets: [{
          label: t('Sales Trend'),
          data: sortedMonthlyData.map(([, data]) => data.totalUSD),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        }]
      });
    }
  }, [sales, t]);



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

  // General Profitability Table Data
  const months = useMemo(() => [
    t('months.january_short'), t('months.february_short'), t('months.march_short'),
    t('months.april_short'), t('months.may_short'), t('months.june_short'),
    t('months.july_short'), t('months.august_short'), t('months.september_short'),
    t('months.october_short'), t('months.november_short'), t('months.december_short')
  ], [t]);
  const generalTable = useMemo(() => {
    // Group sales/costs by month for selected year
    const salesByMonth = Array(12).fill(0);
    const costsByMonth = Array(12).fill(0);
    (sales || []).forEach(sale => {
      if (!sale.date) return;
      const d = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
      if (d.getFullYear() !== selectedYear) return;
      salesByMonth[d.getMonth()] += sale.amountUSD || 0;
    });
    (costs || []).forEach(cost => {
      if (!cost.date) return;
      const d = cost.date.seconds ? new Date(cost.date.seconds * 1000) : new Date(cost.date);
      if (d.getFullYear() !== selectedYear) return;
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
      if (s.date) {
        const d = s.date.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
        years.add(d.getFullYear());
      }
    });
    (costs || []).forEach(c => {
      if (c.date) {
        const d = c.date.seconds ? new Date(c.date.seconds * 1000) : new Date(c.date);
        years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, costs]);

  return (
    <AdminOnly>
      <div className="p-4 bg-gray-50">
        <div className="mb-4">
          <Link href="/dashboard/reports" className="inline-flex items-center text-purple-700 hover:underline font-medium">
            <HiArrowNarrowLeft className="mr-2 h-5 w-5" />
            {t('reports.title')}
          </Link>
        </div>
        {/* Main Stats Card */}
        <Card className="mb-6 !rounded-2xl overflow-hidden" style={{ minHeight: '260px' }}>
          <div className="flex flex-col" style={{ minHeight: '240px' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black font-semibold text-base">{t('profitability.salesTrends.grossProfit')}</p>
                <h2 className="text-5xl font-bold text-[#385e82]">${kpi.grossProfit?.toLocaleString() ?? 0}</h2>
                <div className="flex items-center mt-2">
                  <span className="flex items-center rounded-full px-2 py-1 text-blue-700 bg-blue-100">
                    {t('profitability.salesTrends.profitabilityOverview')}
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
                <p className="text-gray-600 text-base flex items-center gap-2">{t('profitability.salesTrends.totalRevenue')}</p>
                <p className="text-2xl font-semibold text-blue-900">${kpi.totalRevenue?.toLocaleString() ?? 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{t('profitability.salesTrends.totalCosts')}</p>
                <p className="text-2xl font-semibold text-blue-900">${kpi.totalCosts?.toLocaleString() ?? 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{t('profitability.salesTrends.grossProfit')}</p>
                <p className="text-2xl font-semibold text-[#385e82]">${kpi.grossProfit?.toLocaleString() ?? 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{t('profitability.salesTrends.profitMargin')}</p>
                <p className="text-2xl font-semibold text-blue-900">{kpi.profitMargin?.toFixed(2) ?? '0.00'}%</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-600 text-base flex items-center gap-2">{t('profitability.salesTrends.avgProfitPerSale')}</p>
                <p className="text-2xl font-semibold text-blue-900">${kpi.avgProfitPerSale?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs Navigation and Tab Content */}
        <Card className="overflow-visible mb-8 bg-white/90 border-0 shadow-none">
          <div className="flex items-center justify-between border-b border-[#385e82] pb-2 px-2">
            <nav className="flex space-x-2" aria-label="Tabs">
              {[
                { key: "general", label: t('profitability.tabs.general') || 'General' },
                { key: "products", label: t('profitability.tabs.products') || 'Products' },
                { key: "expenses", label: t('profitability.tabs.expenses') || 'Expenses' },
                { key: "activities", label: t('profitability.tabs.activities') || 'Activities' },
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
              <span className="text-sm font-medium text-[#385e82]">{t('profitability.year') || 'Year'}:</span>
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
          <Card className="rounded-2xl bg-gradient-to-br from-[#e6eaf0] to-[#f8fafc] border border-[#385e82] shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-[#385e82] mb-4">{t('profitability.tabs.general') || 'General Profitability'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center rounded-xl overflow-hidden">
                <thead className="bg-[#385e82] text-white">
                  <tr>
                    <th className="w-56 md:w-72 lg:w-80 py-3 px-4 font-bold text-lg"></th>
                    {months.map((m, i) => (
                      <th key={i} className="w-16 py-3 px-2 font-bold text-lg">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { label: t('profitability.rows.sales') || 'Sales', data: generalTable.salesByMonth, color: 'text-blue-700' },
                    { label: t('profitability.rows.costs') || 'Costs', data: generalTable.costsByMonth, color: 'text-red-700' },
                    { label: t('profitability.rows.profit') || 'Profit', data: generalTable.profitByMonth, color: 'text-[#385e82] font-bold' },
                  ].map((row, idx) => (
                    <tr key={row.label} className="">
                      <td className={`w-56 md:w-72 lg:w-80 py-2 px-4 font-semibold text-base ${row.color} truncate whitespace-normal break-words`}>{row.label}</td>
                      {row.data.map((val, i) => {
                        // Indicator logic
                        let indicator = null;
                        if (i > 0) {
                          const diff = val - row.data[i - 1];
                          if (diff > 0) indicator = <span className="ml-1 text-green-600"><HiArrowUp className="inline h-4 w-4" /></span>;
                          else if (diff < 0) indicator = <span className="ml-1 text-red-600"><HiArrowDown className="inline h-4 w-4" /></span>;
                        }
                        return (
                          <td key={i} className="py-2 px-4 text-base font-mono">
                            {val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            {indicator}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {activeTab === "products" && (
          <Card className="rounded-2xl bg-gradient-to-br from-[#e6eaf0] to-[#f8fafc] border border-[#385e82] shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-[#385e82] mb-4">{t('profitability.tabs.products') || 'Product Sales by Month'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center rounded-xl overflow-hidden">
                <thead className="bg-[#385e82] text-white">
                  <tr>
                    <th className="w-56 md:w-72 lg:w-80 py-3 px-4 font-bold text-lg"></th>
                    {months.map((m, i) => (
                      <th key={i} className="w-16 py-3 px-2 font-bold text-lg">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productTypes.map((type, idx) => (
                    <tr key={type}>
                      <td className="w-56 md:w-72 lg:w-80 py-2 px-4 font-semibold text-base text-blue-700">
                        {t(`products.types.${type.replace(/\s+/g, '')}`) || t(`products.types.${type}`) || type}
                      </td>
                      {productTypeTable[type].map((val, i) => {
                        let indicator = null;
                        if (i > 0) {
                          const diff = val - productTypeTable[type][i - 1];
                          if (diff > 0) indicator = <span className="ml-1 text-green-600"><HiArrowUp className="inline h-4 w-4" /></span>;
                          else if (diff < 0) indicator = <span className="ml-1 text-red-600"><HiArrowDown className="inline h-4 w-4" /></span>;
                        }
                        return (
                          <td key={i} className="py-2 px-4 text-base font-mono">{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}{indicator}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {activeTab === "expenses" && (
          <Card className="rounded-2xl bg-gradient-to-br from-[#e6eaf0] to-[#f8fafc] border border-[#385e82] shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-[#385e82] mb-4">{t('profitability.tabs.expenses') || 'Expenses by Month'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center rounded-xl overflow-hidden">
                <thead className="bg-[#385e82] text-white">
                  <tr>
                    <th className="w-56 md:w-72 lg:w-80 py-3 px-4 font-bold text-lg"></th>
                    {months.map((m, i) => (
                      <th key={i} className="w-16 py-3 px-2 font-bold text-lg">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenseTypeRows.map((type, idx) => (
                    <tr key={type}>
                      <td className="w-56 md:w-72 lg:w-80 py-2 px-4 font-semibold text-base text-red-700">
                        {t(`masterData.expenses.types.${type.replace(/\s+/g, '_').toLowerCase()}`) || type}
                      </td>
                      {expenseTypeTable[type].map((val, i) => {
                        let indicator = null;
                        if (i > 0) {
                          const diff = val - expenseTypeTable[type][i - 1];
                          if (diff > 0) indicator = <span className="ml-1 text-green-600"><HiArrowUp className="inline h-4 w-4" /></span>;
                          else if (diff < 0) indicator = <span className="ml-1 text-red-600"><HiArrowDown className="inline h-4 w-4" /></span>;
                        }
                        return (
                          <td key={i} className="py-2 px-4 text-base font-mono">{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}{indicator}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {activeTab === "activities" && (
          <Card className="rounded-2xl bg-gradient-to-br from-[#e6eaf0] to-[#f8fafc] border border-[#385e82] shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-[#385e82] mb-4">{t('profitability.tabs.activities') || 'Activities by Month'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center rounded-xl overflow-hidden">
                <thead className="bg-[#385e82] text-white">
                  <tr>
                    <th className="w-56 md:w-72 lg:w-80 py-3 px-4 font-bold text-lg"></th>
                    {months.map((m, i) => (
                      <th key={i} className="w-16 py-3 px-2 font-bold text-lg">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityTypeRows.map((type, idx) => (
                    <tr key={type}>
                      <td className="w-56 md:w-72 lg:w-80 py-2 px-4 font-semibold text-base text-[#385e82]">
                        {t(`products.activities.${type.replace(/\s+/g, '_').toLowerCase()}`) || type}
                      </td>
                      {activityTypeTable[type].map((val, i) => {
                        let indicator = null;
                        if (i > 0) {
                          const diff = val - activityTypeTable[type][i - 1];
                          if (diff > 0) indicator = <span className="ml-1 text-green-600"><HiArrowUp className="inline h-4 w-4" /></span>;
                          else if (diff < 0) indicator = <span className="ml-1 text-red-600"><HiArrowDown className="inline h-4 w-4" /></span>;
                        }
                        return (
                          <td key={i} className="py-2 px-4 text-base font-mono">{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}{indicator}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminOnly>
  );
} 
