"use client";

import { Card, Select } from "flowbite-react";
import { useEffect, useState } from "react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import dynamic from "next/dynamic";
import { HiTrendingUp, HiTrendingDown, HiCurrencyDollar, HiChartPie, HiCalendar, HiArrowNarrowLeft } from "react-icons/hi";
import { useLanguage } from '@/context/LanguageContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController
} from 'chart.js';
import Link from "next/link";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController
);

// Dynamic imports for charts
const LineChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), { ssr: false });
const BarChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

// Add a helper to format dates in French short format
const formatDateFR = (dateStr) => {
  // Try to parse 'Apr 2025' or 'Apr 14, 25' to a Date
  let d = new Date(dateStr);
  if (isNaN(d)) {
    // Try to parse as '14 Apr 2025' or 'Apr 14, 2025'
    const parts = dateStr.match(/(\d{1,2})\s*([A-Za-zéû]+)\s*(\d{2,4})?/);
    if (parts) {
      const day = parts[1];
      const month = parts[2];
      const year = parts[3] || new Date().getFullYear();
      d = new Date(`${day} ${month} ${year}`);
    }
  }
  if (isNaN(d)) return dateStr;
  // French months short
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${d.getDate().toString().padStart(2, '0')}${months[d.getMonth()]}`;
};

// For chart data, aggregate by week if there are too many points
const aggregateData = (data) => {
  if (data.length <= 15) return data;
  // Group by week
  const grouped = [];
  let weekSum = 0, weekCount = 0, weekLabel = '';
  data.forEach((d, i) => {
    weekSum += d.totalUSD;
    weekCount++;
    if (weekCount === 7 || i === data.length - 1) {
      weekLabel = d.month + ' (sem.' + (Math.floor(i / 7) + 1) + ')';
      grouped.push({ month: weekLabel, totalUSD: weekSum, count: weekCount, average: weekSum / weekCount });
      weekSum = 0; weekCount = 0;
    }
  });
  return grouped;
};

export default function SalesTrendsPage() {
  const { t } = useLanguage();
  const { data: sales } = useFirestoreCollection("Sales");
  const { data: products } = useFirestoreCollection("Products");
  const [monthlyData, setMonthlyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    avgMonthly: 0,
    topProduct: '',
    topProductAmount: 0,
    topMonth: '',
    topMonthAmount: 0
  });

  useEffect(() => {
    if (!sales || !products) return;

    const years = [...new Set(sales.map(s => new Date(s.date.seconds * 1000).getFullYear()))].sort((a, b) => b - a);
    setAvailableYears(years);
    
    // Filter sales based on selected year and month
    let filtered = sales.filter(s => {
      const date = new Date(s.date.seconds * 1000);
      return date.getFullYear() === selectedYear && 
        (selectedMonth === null || date.getMonth() === selectedMonth);
    });

    // Monthly stats
    const monthly = filtered.reduce((acc, sale) => {
      const d = new Date(sale.date.seconds * 1000);
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      if (!acc[label]) acc[label] = { totalUSD: 0, count: 0 };
      acc[label].totalUSD += sale.amountUSD || 0;
      acc[label].count += 1;
      return acc;
    }, {});
    const sorted = Object.entries(monthly)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([month, data]) => ({
        month,
        totalUSD: data.totalUSD,
        count: data.count,
        average: data.totalUSD / data.count
      }));
    setMonthlyData(sorted);

    const total = filtered.reduce((sum, s) => sum + (s.amountUSD || 0), 0);
    const avgMonthly = total / (selectedMonth === null ? 12 : 1);

    // Product breakdown
    const productMap = {};
    filtered.forEach(sale => {
      const product = products.find(p => p.id === sale.productid)?.name || "Unknown";
      productMap[product] = (productMap[product] || 0) + (sale.amountUSD || 0);
    });
    const productArr = Object.entries(productMap);
    setProductData(productArr);

    const topProduct = productArr.sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const topMonth = sorted.sort((a, b) => b.totalUSD - a.totalUSD)[0] || { month: '', totalUSD: 0 };

    setMetrics({
      total,
      avgMonthly,
      topProduct: topProduct[0],
      topProductAmount: topProduct[1],
      topMonth: topMonth.month,
      topMonthAmount: topMonth.totalUSD
    });
  }, [sales, products, selectedYear, selectedMonth]);

  // Aggregate data
  const aggregateData = (data) => {
    if (data.length <= 15) return data;
    // Group by week
    const grouped = [];
    let weekSum = 0, weekCount = 0, weekLabel = '';
    data.forEach((d, i) => {
      weekSum += d.totalUSD;
      weekCount++;
      if (weekCount === 7 || i === data.length - 1) {
        weekLabel = d.month + ' (sem.' + (Math.floor(i / 7) + 1) + ')';
        grouped.push({ month: weekLabel, totalUSD: weekSum, count: weekCount, average: weekSum / weekCount });
        weekSum = 0; weekCount = 0;
      }
    });
    return grouped;
  };

  const displayData = aggregateData(monthlyData);
  const monthlyChartData = {
    labels: displayData.map(d => d.month),
    datasets: [
      {
        label: t('charts.sales_trends.total_sales_chart'),
        data: displayData.map(d => d.totalUSD),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.2 // smoother but not too wavy
      }
    ]
  };

  const barChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: t('charts.sales_trends.monthly_sales'),
        data: monthlyData.map(d => d.totalUSD),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#1c2541',
          font: { size: 14, family: 'inherit', weight: 'bold' },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: '#1c2541',
        bodyColor: '#415A77',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y?.toLocaleString() || ctx.parsed || 0}`,
          title: (items) => {
            const label = items[0]?.label || '';
            return formatDateFR(label);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' },
          callback: (value, idx, values) => {
            const label = monthlyChartData.labels?.[idx] || value;
            return formatDateFR(label);
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)' },
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' },
          callback: value => `$${value.toLocaleString()}`
        }
      }
    },
    interaction: { mode: "index", intersect: false }
  };

  return (
    <div className="p-4 bg-gray-50">
      <div className="mb-4">
        <Link href="/dashboard/reports" className="inline-flex items-center text-blue-700 hover:underline font-medium">
          <HiArrowNarrowLeft className="mr-2 h-5 w-5" />
          {t('reports.title')}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-blue-700">{t('charts.sales_trends.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl p-4 bg-blue-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiCurrencyDollar className="h-5 w-5 text-blue-700" /> {t('charts.sales_trends.metrics.total_sales')}
            </p>
            <h2 className="text-3xl font-bold text-blue-800">${metrics.total.toLocaleString()}</h2>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-blue-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiTrendingUp className="h-5 w-5 text-blue-700" /> {t('charts.sales_trends.metrics.avg_monthly')}
            </p>
            <h2 className="text-3xl font-bold text-blue-800">${metrics.avgMonthly.toFixed(2)}</h2>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-blue-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiChartPie className="h-5 w-5 text-blue-700" /> {t('charts.sales_trends.metrics.top_product')}
            </p>
            <h2 className="text-3xl font-bold text-blue-800">${metrics.topProductAmount.toLocaleString()}</h2>
            <p className="text-blue-800 text-sm">{metrics.topProduct}</p>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-blue-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiCalendar className="h-5 w-5 text-blue-700" /> {t('charts.sales_trends.metrics.highest_month')}
            </p>
            <h2 className="text-3xl font-bold text-blue-800">${metrics.topMonthAmount.toLocaleString()}</h2>
            <p className="text-blue-800 text-sm">{metrics.topMonth}</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">{t('charts.sales_trends.select_year')}</label>
          <Select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-32"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">{t('charts.sales_trends.select_month')}</label>
          <Select
            value={selectedMonth ?? ''}
            onChange={e => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
            className="w-40"
          >
            <option value="">{t('filters.allMonths')}</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">{t('charts.sales_trends.monthly_trends')}</h3>
          <div className="h-[400px]">
            <LineChart data={monthlyChartData} options={chartOptions} />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">{t('charts.sales_trends.monthly_distribution')}</h3>
          <div className="h-[400px]">
            <BarChart data={barChartData} options={chartOptions} />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">{t('charts.sales_trends.monthly_breakdown')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-900">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 font-semibold">{t('charts.sales_trends.table.month')}</th>
                <th className="px-6 py-3 font-semibold text-center">{t('charts.sales_trends.table.total_usd')}</th>
                <th className="px-6 py-3 font-semibold text-center">{t('charts.sales_trends.table.num_sales')}</th>
                <th className="px-6 py-3 font-semibold text-center">{t('charts.sales_trends.table.average')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {monthlyData.map((data, index) => (
                <tr key={index} className="hover:bg-blue-50">
                  <td className="px-6 py-4">{data.month}</td>
                  <td className="px-6 py-4 text-center">${data.totalUSD.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">{data.count}</td>
                  <td className="px-6 py-4 text-center">${data.average.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 
