"use client";

import { Card } from "flowbite-react";
import { useEffect, useState } from "react";
import { useFirestoreCollection } from "../../../../hooks/useFirestoreCollection";
import { useLanguage } from "@/context/LanguageContext";
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Bar), { ssr: false });

export default function ActivityTypesProfitabilityPage() {
  const { data: sales } = useFirestoreCollection("Sales");
  const { data: costs } = useFirestoreCollection("Costs");
  const { data: activityTypes } = useFirestoreCollection("ActivityTypes");
  const { t } = useLanguage();
  const [profitByActivity, setProfitByActivity] = useState([]);

  useEffect(() => {
    if (sales && costs && activityTypes) {
      const profitData = activityTypes.map(activity => {
        const activitySales = sales
          .filter(sale => sale.activityTypeId === activity.id)
          .reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);
        
        const activityCosts = costs
          .filter(cost => cost.activityTypeId === activity.id)
          .reduce((sum, cost) => sum + (cost.amountUSD || 0), 0);

        return {
          activityType: activity.name,
          sales: activitySales,
          costs: activityCosts,
          profit: activitySales - activityCosts,
          margin: activitySales ? ((activitySales - activityCosts) / activitySales) * 100 : 0
        };
      });

      setProfitByActivity(profitData);
    }
  }, [sales, costs, activityTypes]);

  const chartData = {
    labels: profitByActivity.map(item => item.activityType),
    datasets: [
      {
        label: t('profitability.metrics.sales'),
        data: profitByActivity.map(item => item.sales),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: t('profitability.metrics.costs'),
        data: profitByActivity.map(item => item.costs),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: t('profitability.metrics.profit'),
        data: profitByActivity.map(item => item.profit),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('profitability.activityTypes.comparison')
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">{t('profitability.activityTypes.title')}</h1>

      {/* Chart */}
      <Card className="mb-6">
        <div className="h-96">
          <BarChart data={chartData} options={options} />
        </div>
      </Card>

      {/* Detailed Table */}
      <Card className="border border-teal-200 rounded-lg bg-white">
        <div className="px-6 py-3 bg-teal-50 border-b border-teal-200">
          <h3 className="text-lg font-semibold text-teal-900 uppercase">{t('profitability.activityTypes.details')}</h3>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-900 border border-teal-100 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-teal-900">{t('profitability.filters.activity')}</th>
                <th className="px-6 py-3 font-semibold text-teal-900 text-center">{t('profitability.metrics.sales')} (USD)</th>
                <th className="px-6 py-3 font-semibold text-teal-900 text-center">{t('profitability.metrics.costs')} (USD)</th>
                <th className="px-6 py-3 font-semibold text-teal-900 text-center">{t('profitability.metrics.profit')} (USD)</th>
                <th className="px-6 py-3 font-semibold text-teal-900 text-center">{t('profitability.metrics.margin')} (%)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-teal-100/50">
              {profitByActivity.map((item, index) => (
                <tr key={index} className="hover:bg-teal-50/30 transition-all duration-200 ease-in-out transform hover:scale-[1.01] hover:shadow-md">
                  <td className="px-8 py-5 font-semibold text-gray-900 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                    <span>{String(item.activityType)}</span>
                  </td>
                  <td className="px-8 py-5 text-center font-semibold text-teal-700">
                    ${String(item.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                  </td>
                  <td className="px-8 py-5 text-center font-semibold text-red-600">
                    ${String(item.costs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                  </td>
                  <td className="px-8 py-5 text-center font-semibold text-green-600">
                    ${String(item.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-full text-xs inline-flex items-center">
                      <span className="w-1 h-1 rounded-full bg-teal-500 mr-1"></span>
                      {String(item.margin.toFixed(1))}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-gradient-to-r from-teal-100 via-teal-50 to-teal-100 font-bold text-teal-900 border-t-2 border-teal-200">
                <td className="px-8 py-5 rounded-bl-xl flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                  <span>{t('profitability.activityTypes.metrics.totalSales')}</span>
                </td>
                <td className="px-8 py-5 text-center text-teal-800">
                  ${String(profitByActivity.reduce((sum, item) => sum + item.sales, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </td>
                <td className="px-8 py-5 text-center text-red-800">
                  ${String(profitByActivity.reduce((sum, item) => sum + item.costs, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </td>
                <td className="px-8 py-5 text-center text-green-800">
                  ${String(profitByActivity.reduce((sum, item) => sum + item.profit, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </td>
                <td className="px-8 py-5 text-center rounded-br-xl">
                  <span className="bg-teal-200 text-teal-800 px-3 py-1.5 rounded-full text-xs inline-flex items-center">
                    <span className="w-1 h-1 rounded-full bg-teal-600 mr-1"></span>
                    {String((profitByActivity.reduce((sum, item) => sum + item.profit, 0) / profitByActivity.reduce((sum, item) => sum + item.sales, 0) * 100).toFixed(1))}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 