"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Table } from 'flowbite-react';
import { useLanguage } from '@/context/LanguageContext';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { ExchangeRateService } from '@/lib/exchangeRates.js';
import AdminOnly from '@/components/AdminOnly';
import { 
  HiUsers, 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiTrendingDown,
  HiChartBar,
  HiCash,
  HiCalculator,
  HiPencil,
  HiCheck,
  HiX,
  HiArrowNarrowLeft
} from 'react-icons/hi';
import Link from 'next/link';

// Salary scale configuration
const SALARY_SCALE = {
  "superviseurP": { base: 400000, tier: "high", key: "superviseurP" },
  "superviseurA1": { base: 370000, tier: "high", key: "superviseurA1" },
  "responsableT": { base: 370000, tier: "high", key: "responsableT" },
  "responsableC": { base: 370000, tier: "high", key: "responsableC" },
  "superviseurA2": { base: 340000, tier: "high", key: "superviseurA2" },
  "technicien": { base: 340000, tier: "high", key: "technicien" },
  "conducteur": { base: 320000, tier: "low", key: "conducteur" },
  "gardiens": { base: 270000, tier: "low", key: "gardiens" },
  "aide": { base: 270000, tier: "low", key: "aide" }
};

// Bonus thresholds and percentages
const BONUS_THRESHOLDS = {
  high: 17350000,  // 17.35M FC
  medium: 15350000, // 15.35M FC
  low: 12350000     // 12.35M FC
};

const SALES_BONUS_RATES = {
  high: { tier1: 50, tier2: 30, tier3: 15 },
  low: { tier1: 20, tier2: 15, tier3: 10 }
};

const COORDINATION_BONUS_RATES = {
  high: 10, // 10% for ≥17.35M
  medium: 5 // 5% for ≥15.35M
};

export default function SalaryScalePage() {
  const { t } = useLanguage();
  const { data: sales = [] } = useFirestoreCollection("Sales");
  const { data: costs = [] } = useFirestoreCollection("Costs");
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryScale, setSalaryScale] = useState(SALARY_SCALE);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1);

  // Get exchange rate for selected period
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const rate = await ExchangeRateService.getRateForDate(new Date(selectedYear, selectedMonth - 1));
        setExchangeRate(rate || 1);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        setExchangeRate(1);
      }
    };
    fetchExchangeRate();
  }, [selectedMonth, selectedYear]);

  // Calculate monthly profit
  const monthlyData = useMemo(() => {
    if (!sales || !costs || (!sales.length && !costs.length)) return { revenue: 0, costs: 0, profit: 0 };

    let revenue = 0;
    let totalCosts = 0;

    // Calculate revenue for selected month/year
    sales.forEach(sale => {
      if (!sale.date) return;
      const date = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
      if (date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear) {
        revenue += sale.amountFC || 0;
      }
    });

    // Calculate costs for selected month/year
    costs.forEach(cost => {
      if (!cost.date) return;
      const date = cost.date.seconds ? new Date(cost.date.seconds * 1000) : new Date(cost.date);
      if (date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear) {
        totalCosts += cost.amountFC || 0;
      }
    });

    const profit = revenue - totalCosts;
    return { revenue, costs: totalCosts, profit };
  }, [sales, costs, selectedMonth, selectedYear]);

  // Calculate bonuses based on profit
  const calculateBonuses = (position, baseSalary, profit) => {
    const positionData = salaryScale[position];
    if (!positionData) return { salesBonus: 0, coordinationBonus: 0 };

    const tier = positionData.tier;
    let salesBonus = 0;
    let coordinationBonus = 0;

    // Sales bonus calculation
    if (profit >= BONUS_THRESHOLDS.high) {
      salesBonus = (baseSalary * SALES_BONUS_RATES[tier].tier1) / 100;
    } else if (profit >= BONUS_THRESHOLDS.medium) {
      salesBonus = (baseSalary * SALES_BONUS_RATES[tier].tier2) / 100;
    } else if (profit >= BONUS_THRESHOLDS.low) {
      salesBonus = (baseSalary * SALES_BONUS_RATES[tier].tier3) / 100;
    }

    // Coordination bonus calculation
    if (profit >= BONUS_THRESHOLDS.high) {
      coordinationBonus = (baseSalary * COORDINATION_BONUS_RATES.high) / 100;
    } else if (profit >= BONUS_THRESHOLDS.medium) {
      coordinationBonus = (baseSalary * COORDINATION_BONUS_RATES.medium) / 100;
    }

    return { salesBonus, coordinationBonus };
  };

  // Calculate total salaries
  const salaryData = useMemo(() => {
    const data = [];
    let totalSalaries = 0;

    Object.entries(salaryScale).forEach(([position, config]) => {
      const baseSalary = config.base;
      const { salesBonus, coordinationBonus } = calculateBonuses(position, baseSalary, monthlyData.profit);
      const totalSalary = baseSalary + salesBonus + coordinationBonus;
      
      data.push({
        position,
        baseSalary,
        salesBonus,
        coordinationBonus,
        totalSalary,
        tier: config.tier
      });
      
      totalSalaries += totalSalary;
    });

    return { data, totalSalaries };
  }, [salaryScale, monthlyData.profit, calculateBonuses]);

  // Handle editing
  const handleEdit = (position, currentValue) => {
    setEditingPosition(position);
    setEditValue(currentValue.toString());
  };

  const handleSave = () => {
    if (editingPosition && editValue) {
      setSalaryScale(prev => ({
        ...prev,
        [editingPosition]: {
          ...prev[editingPosition],
          base: parseInt(editValue)
        }
      }));
    }
    setEditingPosition(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingPosition(null);
    setEditValue('');
  };

  // Format currency
  const formatCurrency = (amount, currency = 'FC') => {
    if (currency === 'USD') {
      return `$${(amount / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString('fr-FR')} FC`;
  };

  const months = [
    { value: 1, label: t('months.january') },
    { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') },
    { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') },
    { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') },
    { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') },
    { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') },
    { value: 12, label: t('months.december') }
  ];

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);

  return (
    <AdminOnly>
      <div className="p-4 space-y-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/dashboard/reports" className="inline-flex items-center text-purple-700 hover:underline font-medium">
            <HiArrowNarrowLeft className="mr-2 h-5 w-5" />
            {t('reports.title')}
          </Link>
        </div>

        {/* Header Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <HiUsers className="h-8 w-8" />
                {t('reports.salaryScale.pageTitle')}
              </h1>
              <p className="text-orange-100 text-lg mt-2">
                {t('reports.salaryScale.pageSubtitle')}
              </p>
            </div>
            
            {/* Date Selectors */}
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <label className="block text-sm font-medium text-orange-100 mb-1">
                  {t('reports.salaryScale.selectMonth')}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-white/30 border-0 rounded text-white placeholder-orange-100 focus:ring-2 focus:ring-orange-300"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value} className="text-gray-800">
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <label className="block text-sm font-medium text-orange-100 mb-1">
                  {t('reports.salaryScale.selectYear')}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white/30 border-0 rounded text-white placeholder-orange-100 focus:ring-2 focus:ring-orange-300"
                >
                  {years.map(year => (
                    <option key={year} value={year} className="text-gray-800">
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Total Salaries Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-3">
                <HiCash className="h-6 w-6 text-orange-200" />
                <div>
                  <p className="text-orange-100 text-sm">{t('reports.salaryScale.totalSalaries')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(salaryData.totalSalaries)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-3">
                <HiCurrencyDollar className="h-6 w-6 text-orange-200" />
                <div>
                  <p className="text-orange-100 text-sm">{t('reports.salaryScale.totalSalaries')} (USD)</p>
                  <p className="text-2xl font-bold">{formatCurrency(salaryData.totalSalaries, 'USD')}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Summary Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <HiChartBar className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t('reports.salaryScale.financialSummary')}
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <HiTrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    {t('reports.salaryScale.monthlyRevenue')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-900">{formatCurrency(monthlyData.revenue)}</p>
                  <p className="text-sm text-green-700">{formatCurrency(monthlyData.revenue, 'USD')}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <HiTrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    {t('reports.salaryScale.monthlyCosts')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-900">{formatCurrency(monthlyData.costs)}</p>
                  <p className="text-sm text-red-700">{formatCurrency(monthlyData.costs, 'USD')}</p>
                </div>
              </div>

              <div className={`flex justify-between items-center p-3 rounded-lg ${
                monthlyData.profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'
              }`}>
                <div className="flex items-center gap-2">
                  <HiCalculator className={`h-5 w-5 ${monthlyData.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  <span className={`font-medium ${monthlyData.profit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                    {t('reports.salaryScale.monthlyProfit')}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${monthlyData.profit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {formatCurrency(monthlyData.profit)}
                  </p>
                  <p className={`text-sm ${monthlyData.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {formatCurrency(monthlyData.profit, 'USD')}
                  </p>
                </div>
              </div>
            </div>

            {/* Bonus calculation explanation */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{t('reports.salaryScale.bonusCalculation')}</strong>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• ≥ 17,350,000 FC: {t('reports.salaryScale.highTier')} 50%/20%, {t('reports.salaryScale.lowTier')} + Coordination 10%</p>
                <p>• ≥ 15,350,000 FC: {t('reports.salaryScale.highTier')} 30%/15%, {t('reports.salaryScale.lowTier')} + Coordination 5%</p>
                <p>• ≥ 12,350,000 FC: {t('reports.salaryScale.highTier')} 15%/10%, {t('reports.salaryScale.lowTier')}</p>
              </div>
            </div>
          </Card>

          {/* Salary Breakdown Table */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <HiUsers className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t('reports.salaryScale.salaryBreakdown')}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Table.Head>
                  <Table.HeadCell>{t('reports.salaryScale.position')}</Table.HeadCell>
                  <Table.HeadCell>{t('reports.salaryScale.baseSalary')}</Table.HeadCell>
                  <Table.HeadCell>{t('reports.salaryScale.salesBonus')}</Table.HeadCell>
                  <Table.HeadCell>{t('reports.salaryScale.coordinationBonus')}</Table.HeadCell>
                  <Table.HeadCell>{t('reports.salaryScale.totalSalary')}</Table.HeadCell>
                </Table.Head>
                <Table.Body className="divide-y">
                  {salaryData.data.map((row) => (
                    <Table.Row key={row.position} className="bg-white hover:bg-gray-50">
                      <Table.Cell className="font-medium text-gray-900">
                        {t(`reports.salaryScale.positions.${row.position}`)}
                        <div className={`inline-block ml-2 px-2 py-1 rounded-full text-xs ${
                          row.tier === 'high' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {row.tier === 'high' ? 'Niveau Supérieur' : 'Niveau Inférieur'}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        {editingPosition === row.position ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 text-sm border rounded px-2 py-1"
                            />
                            <Button size="xs" color="success" onClick={handleSave}>
                              <HiCheck className="h-3 w-3" />
                            </Button>
                            <Button size="xs" color="failure" onClick={handleCancel}>
                              <HiX className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(row.baseSalary)}</span>
                            <Button
                              size="xs"
                              color="gray"
                              onClick={() => handleEdit(row.position, row.baseSalary)}
                            >
                              <HiPencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span className={row.salesBonus > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {formatCurrency(row.salesBonus)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className={row.coordinationBonus > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                          {formatCurrency(row.coordinationBonus)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(row.totalSalary)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(row.totalSalary, 'USD')}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </AdminOnly>
  );
} 