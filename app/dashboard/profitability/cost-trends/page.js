"use client";

import "@/lib/chart-setup";
import { Card, Select } from "flowbite-react";
import { useEffect, useState } from "react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import dynamic from "next/dynamic";
import { HiTrendingUp, HiCurrencyDollar, HiChartPie, HiCalendar, HiArrowNarrowLeft } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
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
  ArcElement
} from 'chart.js';

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
  ArcElement
);

// Dynamic imports for charts
const LineChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), { ssr: false });
const BarChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

export default function CostTrendsPage() {
  const { data: costs } = useFirestoreCollection("Costs");
  const { data: expenseTypes } = useFirestoreCollection("ExpenseTypes");
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    avgMonthly: 0,
    topExpenseType: '',
    topExpenseAmount: 0,
    topMonth: '',
    topMonthAmount: 0
  });
  const { t } = useLanguage();

  useEffect(() => {
    if (!costs || !expenseTypes) return;

    const years = [...new Set(costs.map(c => new Date(c.date.seconds * 1000).getFullYear()))].sort((a, b) => b - a);
    setAvailableYears(years);
    
    // Filter costs based on selected year and month
    let filtered = costs.filter(c => {
      const date = new Date(c.date.seconds * 1000);
      return date.getFullYear() === selectedYear && 
        (selectedMonth === null || date.getMonth() === selectedMonth);
    });

    // Monthly stats
    const monthly = filtered.reduce((acc, cost) => {
      const d = new Date(cost.date.seconds * 1000);
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      if (!acc[label]) acc[label] = { 
        totalUSD: 0, 
        count: 0,
        timestamp: d.getTime() // Add timestamp for proper sorting
      };
      acc[label].totalUSD += cost.amountUSD || 0;
      acc[label].count += 1;
      return acc;
    }, {});
    const sorted = Object.entries(monthly)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .map(([month, data]) => ({
        month,
        totalUSD: data.totalUSD,
        count: data.count,
        average: data.totalUSD / data.count
      }));
    setMonthlyData(sorted);

    const total = filtered.reduce((sum, c) => sum + (c.amountUSD || 0), 0);
    const avgMonthly = total / (selectedMonth === null ? 12 : 1);

    // Expense type breakdown
    const expenseMap = {};
    filtered.forEach(cost => {
      const type = expenseTypes.find(t => t.id === cost.expenseTypeId)?.name || "Unknown";
      expenseMap[type] = (expenseMap[type] || 0) + (cost.amountUSD || 0);
    });
    const expenseArr = Object.entries(expenseMap);

    const topType = expenseArr.sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const topMonth = sorted.sort((a, b) => b.totalUSD - a.totalUSD)[0] || { month: '', totalUSD: 0 };

    setMetrics({
      total,
      avgMonthly,
      topExpenseType: topType[0],
      topExpenseAmount: topType[1],
      topMonth: topMonth.month,
      topMonthAmount: topMonth.totalUSD
    });
  }, [costs, expenseTypes, selectedYear, selectedMonth]);

  const monthlyChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: "Total Costs (USD)",
        data: monthlyData.map(d => d.totalUSD),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  };

  const barChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: "Monthly Costs (USD)",
        data: monthlyData.map(d => d.totalUSD),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
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
          label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y?.toLocaleString() || ctx.parsed || 0}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
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
        <Link href="/dashboard/reports" className="inline-flex items-center text-red-700 hover:underline font-medium">
          <HiArrowNarrowLeft className="mr-2 h-5 w-5" />
          {t('cost_trends.title')}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-red-700">{t('cost_trends.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl p-4 bg-red-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiCurrencyDollar className="h-5 w-5 text-red-700" /> {t('cost_trends.total_costs')}
            </p>
            <h2 className="text-3xl font-bold text-red-800">${metrics.total.toLocaleString()}</h2>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-red-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiTrendingUp className="h-5 w-5 text-red-700" /> {t('cost_trends.avg_monthly')}
            </p>
            <h2 className="text-3xl font-bold text-red-800">${metrics.avgMonthly.toFixed(2)}</h2>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-red-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiChartPie className="h-5 w-5 text-red-700" /> {t('cost_trends.top_expense')}
            </p>
            <h2 className="text-3xl font-bold text-red-800">${metrics.topExpenseAmount.toLocaleString()}</h2>
            <p className="text-red-800 text-sm">{metrics.topExpenseType}</p>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 bg-red-50">
          <div>
            <p className="text-gray-600 text-base flex items-center gap-2">
              <HiCalendar className="h-5 w-5 text-red-700" /> {t('cost_trends.highest_month')}
            </p>
            <h2 className="text-3xl font-bold text-red-800">${metrics.topMonthAmount.toLocaleString()}</h2>
            <p className="text-red-800 text-sm">{metrics.topMonth}</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <Select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="w-48"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </Select>
        <Select
          value={selectedMonth === null ? '' : selectedMonth}
          onChange={e => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
          className="w-48"
        >
                          <option value="">{t('common.all_months')}</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i}>
                              {(() => {
                  const monthName = new Date(2000, i).toLocaleString('default', { month: 'long' });
                  const translationKey = `months.${monthName.toLowerCase()}`;
                  const translatedMonth = t(translationKey);
                  return typeof translatedMonth === 'string' && translatedMonth !== translationKey ? translatedMonth : monthName;
                })()}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="!rounded-2xl">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-red-700 mb-4">{t('cost_trends.monthly_trends')}</h2>
            <div className="h-[400px]">
              <LineChart data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </Card>

        <Card className="!rounded-2xl">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-red-700 mb-4">{t('cost_trends.monthly_distribution')}</h2>
            <div className="h-[400px]">
              <BarChart data={barChartData} options={chartOptions} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="!rounded-2xl">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-red-700 mb-4">{t('cost_trends.monthly_details')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 font-semibold">{t('common.month')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('cost_trends.total_costs')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('common.transactions')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('common.average')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {monthlyData.map((data, i) => (
                  <tr key={i} className="hover:bg-red-50">
                    <td className="px-6 py-4">{data.month}</td>
                    <td className="px-6 py-4 text-center">${data.totalUSD.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">{data.count}</td>
                    <td className="px-6 py-4 text-center">${data.average.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
