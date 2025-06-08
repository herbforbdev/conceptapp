"use client";

import React from 'react';
import { Card } from 'flowbite-react';
import { useLanguage } from '@/context/LanguageContext';
import AdminOnly from '@/components/AdminOnly';
import { 
  HiDocumentReport, 
  HiChartBar, 
  HiCurrencyDollar, 
  HiShoppingCart,
  HiTrendingUp,
  HiCurrencyYen,
  HiUsers
} from 'react-icons/hi';
import Link from 'next/link';

export default function ReportsPage() {
  const { t } = useLanguage();

  const reports = [
    {
      title: t('reports.salesAnalysis.title'),
      description: t('reports.salesAnalysis.description'),
      icon: <HiShoppingCart className="h-8 w-8" />,
      href: "/dashboard/profitability/sales-trends",
      color: "bg-blue-500"
    },
    {
      title: t('reports.costAnalysis.title'),
      description: t('reports.costAnalysis.description'),
      icon: <HiCurrencyDollar className="h-8 w-8" />,
      href: "/dashboard/profitability/cost-trends",
      color: "bg-red-500"
    },
    {
      title: t('reports.profitabilityAnalysis.title'),
      description: t('reports.profitabilityAnalysis.description'),
      icon: <HiTrendingUp className="h-8 w-8" />,
      href: "/dashboard/profitability",
      color: "bg-purple-500"
    },
    {
      title: t('reports.salaryScale.title'),
      description: t('reports.salaryScale.description'),
      icon: <HiUsers className="h-8 w-8" />,
      href: "/dashboard/reports/salary-scale",
      color: "bg-orange-500"
    },
    {
      title: t('reports.exchangeRates.title'),
      description: t('reports.exchangeRates.description'),
      icon: <HiCurrencyYen className="h-8 w-8" />,
      href: "/dashboard/reports/exchange-rates",
      color: "bg-green-500"
    }
  ];

  return (
    <AdminOnly>
      <div className="p-2 md:p-4">
        <h1 className="text-2xl font-bold mb-6">{t('reports.title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {reports.map((report, index) => (
            <Link key={index} href={report.href}>
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start space-x-4">
                  <div className={`${report.color} text-white p-3 rounded-lg`}>
                    {report.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                    <p className="text-gray-600 mb-4">{report.description}</p>
                    <div className="flex items-center text-blue-600">
                      <span className="text-sm">{t('reports.viewReport')}</span>
                      <HiDocumentReport className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminOnly>
  );
}
