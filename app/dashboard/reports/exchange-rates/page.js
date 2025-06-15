"use client";

import React, { useState, useEffect } from 'react';
import { Card } from 'flowbite-react';
import { useLanguage } from '@/context/LanguageContext';
import AdminOnly from '@/components/AdminOnly';
import { HiArrowNarrowLeft, HiPlus, HiCurrencyDollar, HiCalendar, HiClock } from 'react-icons/hi';
import Link from 'next/link';
import { collection, query, orderBy, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// Utility for deterministic date formatting
function formatDateYYYYMMDD(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ExchangeRatesPage() {
  const { t } = useLanguage();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRate, setNewRate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    rate: ''
  });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const ratesRef = collection(firestore, 'exchangeRates');
      const q = query(
        ratesRef,
        orderBy('yearMonth', 'desc')
      );
      const snapshot = await getDocs(q);
      const ratesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRates(ratesData);
    } catch (error) {
      console.error('Error loading rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = async (e) => {
    e.preventDefault();
    try {
      const yearMonth = `${newRate.year}-${String(newRate.month).padStart(2, '0')}`;
      const rateRef = doc(firestore, 'exchangeRates', yearMonth);
      await setDoc(rateRef, {
        year: parseInt(newRate.year),
        month: parseInt(newRate.month),
        yearMonth,
        rate: parseFloat(newRate.rate),
        updatedAt: serverTimestamp()
      });
      setNewRate({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        rate: ''
      });
      await loadRates();
    } catch (error) {
      console.error('Error adding rate:', error);
    }
  };

  const months = [
    t('months.january'), t('months.february'), t('months.march'),
    t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'),
    t('months.october'), t('months.november'), t('months.december')
  ];

  // Find the current rate for the current month/year using yearMonth
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentRateObj = rates.find(r => r.yearMonth === currentYearMonth);
  const currentRate = currentRateObj?.rate || 0;
  const lastUpdated = currentRateObj?.updatedAt?.toDate() || new Date();

  return (
    <AdminOnly>
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="mb-4">
          <Link href="/dashboard/reports" className="inline-flex items-center text-green-700 hover:underline font-medium">
            <HiArrowNarrowLeft className="mr-2 h-5 w-5" />
            {t('reports.title')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Rate Card */}
          <Card className="lg:col-span-3 bg-gradient-to-br from-green-50 to-white border border-green-200">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="bg-green-100 p-3 rounded-full">
                  <HiCurrencyDollar className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{t('exchangeRates.currentRate')}</h2>
                  <p className="text-3xl font-bold text-green-600">{currentRate.toLocaleString()} CDF/USD</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-gray-600">
                  <HiCalendar className="h-5 w-5 mr-2" />
                  <span>{formatDateYYYYMMDD(lastUpdated)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <HiClock className="h-5 w-5 mr-2" />
                  <span>{lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Add New Rate Form */}
          <Card className="lg:col-span-1 bg-white shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <HiPlus className="h-5 w-5 mr-2 text-green-600" />
              {t('exchangeRates.addNew')}
            </h2>
            <form onSubmit={handleAddRate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  {t('exchangeRates.year')}
                </label>
                <input
                  type="number"
                  value={newRate.year}
                  onChange={(e) => setNewRate({ ...newRate, year: e.target.value })}
                  className="w-full rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500 text-gray-900 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  {t('exchangeRates.month')}
                </label>
                <select
                  value={newRate.month}
                  onChange={(e) => setNewRate({ ...newRate, month: e.target.value })}
                  className="w-full rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500 text-gray-900 bg-white"
                  required
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1} className="text-gray-900 bg-white">
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  {t('exchangeRates.rate')} (CDF)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                  className="w-full rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500 text-gray-900 bg-white"
                  placeholder="Ex: 2900"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <HiPlus className="h-5 w-5 mr-2" />
                {t('exchangeRates.add')}
              </button>
            </form>
          </Card>

          {/* Rates Table */}
          <Card className="lg:col-span-2 bg-white shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('exchangeRates.history')}</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500">{t('exchangeRates.loading')}</div>
            ) : rates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('exchangeRates.noRates')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('exchangeRates.year')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('exchangeRates.month')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('exchangeRates.rate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('exchangeRates.updatedAt')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rate.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {months[rate.month - 1]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {rate.rate.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateYYYYMMDD(rate.updatedAt?.toDate())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminOnly>
  );
} 