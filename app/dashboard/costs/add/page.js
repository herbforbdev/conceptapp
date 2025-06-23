"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select, TextInput } from "flowbite-react";
import { addCost } from '@/services/firestore/costsService';
import { useMasterData } from '@/hooks/useMasterData';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import Link from 'next/link';
import { HiPlus, HiTrash, HiDuplicate } from 'react-icons/hi';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { ExchangeRateService } from '@/lib/exchangeRates';

// Utility to convert expense type names to camelCase for translation keys
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/(?:^|\s|_)([a-zA-Z])/g, (match, p1, offset) => offset === 0 ? p1.toLowerCase() : p1.toUpperCase())
    .replace(/\s+/g, '');
}

export default function AddCostPage() {
  const router = useRouter();
  const { expenseTypes, activityTypes, expenseTypeMap, activityTypeMap, loading: masterLoading } = useMasterData();
  
  // Get existing costs data for duplicate checking
  const { data: existingCosts } = useFirestoreCollection("Costs");
  
  const [entries, setEntries] = useState([{
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    activityTypeId: '',
    expenseTypeId: '',
    amountFC: '',
    amountUSD: '',
    exchangeRate: ''
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleEntryChange = (id, field, value) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      const updated = { ...entry, [field]: value };
      if (field === 'amountFC' || field === 'exchangeRate') {
        const fc = field === 'amountFC' ? Number(value) : Number(updated.amountFC);
        const rate = field === 'exchangeRate' ? Number(value) : Number(updated.exchangeRate);
        updated.amountUSD = rate ? parseFloat((fc / rate).toFixed(2)) : '';
      } else if (field === 'amountUSD' && updated.exchangeRate) {
        const usd = Number(value);
        updated.amountFC = parseFloat((usd * updated.exchangeRate).toFixed(2));
      }
      return updated;
    }));
  };

  const duplicateEntry = id => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      const entry = prev[idx];
      const copy = { ...entry, id: Date.now(), amountFC: '', amountUSD: '' };
      const arr = [...prev]; arr.splice(idx + 1, 0, copy);
      return arr;
    });
  };

  const removeEntry = id => setEntries(prev => prev.filter(e => e.id !== id));

  const addNewRow = () => {
    ExchangeRateService.getRateForDate(new Date()).then(rate => {
      setEntries(prev => [...prev, {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        activityTypeId: '',
        expenseTypeId: '',
        amountFC: '',
        amountUSD: '',
        exchangeRate: rate === 2500 ? '' : rate
      }]);
    });
  };

  // Check for duplicate entries
  const checkForDuplicates = (entries) => {
    if (!existingCosts || existingCosts.length === 0) return null;
    
    for (const entry of entries) {
      const entryDate = new Date(entry.date).toDateString();
      
      const duplicate = existingCosts.find(cost => {
        const costDate = cost.date?.toDate ? cost.date.toDate().toDateString() : new Date(cost.date).toDateString();
        return costDate === entryDate && 
               cost.activityTypeId === entry.activityTypeId && 
               cost.expenseTypeId === entry.expenseTypeId;
      });
      
      if (duplicate) {
        const activityName = activityTypeMap.get(entry.activityTypeId)?.name || t('common.unknownActivity');
        const expenseTypeName = expenseTypeMap.get(entry.expenseTypeId)?.name || t('common.unknownExpenseType');
        return t('costs.add.error.duplicateEntry', { expenseTypeName, activityName, date: entryDate });
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (entries.length === 0) { setError(t('costs.add.error.addAtLeastOne')); return; }
    
    // Check for duplicates before processing
    const duplicateError = checkForDuplicates(entries);
    if (duplicateError) {
      setError(duplicateError);
      return;
    }
    
    setIsSubmitting(true);
    try {
      for (const entry of entries) {
        if (!entry.date || !entry.activityTypeId || !entry.expenseTypeId) {
          setError(t('costs.add.error.requiredFields')); setIsSubmitting(false); return;
        }
        
        // Validate that numeric values are not zero
        if (Number(entry.amountFC) <= 0 || Number(entry.amountUSD) <= 0 || Number(entry.exchangeRate) <= 0) {
          setError('Amounts and exchange rate must be greater than zero'); setIsSubmitting(false); return;
        }
        
        await addCost({
          date: new Date(entry.date),
          activityTypeId: entry.activityTypeId,
          activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
          expenseTypeId: entry.expenseTypeId,
          expenseTypeName: expenseTypeMap.get(entry.expenseTypeId)?.name || '',
          amountFC: Number(entry.amountFC),
          amountUSD: Number(entry.amountUSD),
          exchangeRate: Number(entry.exchangeRate)
        });
      }
      router.push('/dashboard/costs');
    } catch (err) {
      console.error(err); setError(t('costs.add.error.failed')); setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    async function setInitialExchangeRate() {
      const today = new Date();
      const rate = await ExchangeRateService.getRateForDate(today);
      setEntries(prev => prev.map((entry, idx) => idx === 0 ? { ...entry, exchangeRate: rate === 2500 ? '' : rate } : entry));
    }
    setInitialExchangeRate();
  }, []);

  if (masterLoading) return <div>{t('common.loading')}</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('costs.add.title')}</h1>
              <p className="text-gray-600 mt-1">{t('costs.add.addDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/costs')}
                className="text-[#008080] bg-[#008080]/30 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('costs.add.backToCosts')}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="border border-red-200 shadow-lg rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900 rounded-lg">
              <thead>
                <tr className="bg-gradient-to-r from-[#66b2b2]/50 to-[#66b2b2] rounded-xl">
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider">{t('costs.fields.date')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider">{t('costs.fields.activityType')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider">{t('costs.fields.expenseType')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider text-center">{t('costs.fields.amountFC')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider text-center">{t('costs.fields.exchangeRate')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider text-center">{t('costs.fields.amountUSD')}</th>
                  <th className="px-3 py-4 font-semibold text-green-900 text-xs uppercase tracking-wider text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-green-50/50 transition-colors duration-200">
                    <td className="px-3 py-3 font-semibold">
                      <TextInput
                        type="date"
                        value={entry.date}
                        onChange={e => handleEntryChange(entry.id, 'date', e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Select
                        value={entry.activityTypeId}
                        onChange={e => handleEntryChange(entry.id, 'activityTypeId', e.target.value)}
                        className="w-full"
                      >
                        <option value="">{t('costs.placeholders.selectActivityType')}</option>
                        {activityTypes.map(a => (
                          <option key={a.id} value={a.id}>{t(`products.activities.${a.name?.toLowerCase().replace(/\s+/g, '_')}`) || a.name}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Select
                        value={entry.expenseTypeId}
                        onChange={e => handleEntryChange(entry.id, 'expenseTypeId', e.target.value)}
                        className="w-full"
                      >
                        <option value="">{t('costs.placeholders.selectExpenseType')}</option>
                        {expenseTypes.map(e => {
                          const camelKey = toCamelCase(e.name || '');
                          const label = t(`masterData.expenses.types.${camelKey}`) || e.name;
                          return (
                            <option key={e.id} value={e.id}>{label}</option>
                          );
                        })}
                      </Select>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <TextInput
                        type="number"
                        value={entry.amountFC}
                        onChange={e => handleEntryChange(entry.id, 'amountFC', e.target.value)}
                        className="w-full text-right"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <TextInput
                        type="number"
                        value={entry.exchangeRate}
                        onChange={e => handleEntryChange(entry.id, 'exchangeRate', e.target.value)}
                        className="w-full text-right"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <TextInput
                        type="number"
                        value={entry.amountUSD}
                        onChange={e => handleEntryChange(entry.id, 'amountUSD', e.target.value)}
                        className="w-full text-right"
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          size="xs"
                          className="bg-green-100 text-green-600 hover:bg-green-200 border border-green-200"
                          onClick={() => duplicateEntry(entry.id)}
                        >
                          <HiDuplicate className="h-4 w-4 text-[#008080]" />
                        </Button>
                        {entries.length > 1 && (
                          <Button
                            size="xs"
                            className="bg-green-100 text-green-600 hover:bg-green-200 border border-green-200"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <HiTrash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 px-6 py-4 bg-gray-50 border-t border-green-100">
            <div className="flex justify-between items-center">
              <Button 
                onClick={addNewRow} 
                className="bg-white hover:bg-green-50 text-[#008080] border border-[#008080] shadow-sm transition-colors duration-200"
              >
                <HiPlus className="mr-2" /> {t('costs.add.addEntry')}
              </Button>
              <div className="flex items-center space-x-3">
                <Link href="/dashboard/costs">
                  <Button className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm transition-colors duration-200">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-[#008080] hover:bg-green-700 text-white shadow-sm transition-colors duration-200 disabled:bg-green-400"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      {t('common.loading')}
                    </>
                  ) : (
                    <>{t('costs.add.submit')} {entries.length} {entries.length === 1 ? t('costs.add.entry') : t('costs.add.entries')}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

