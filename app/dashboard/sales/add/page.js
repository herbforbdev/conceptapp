"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select, TextInput } from "flowbite-react";
import { firestore } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useMasterData } from "@/hooks/useMasterData";
import Link from "next/link";
import { HiArrowLeft, HiPlus, HiTrash, HiCheck, HiX, HiDuplicate } from "react-icons/hi";
import { loadSalesFilters, saveSalesFilters } from "@/lib/utils/salesStateManagement";
import { useLanguage } from '@/context/LanguageContext';
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ExchangeRateService } from '@/lib/exchangeRates';
import { inventoryService } from '@/services/firestore/inventoryService';

export default function AddSalePage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // Use the shared master data hook
  const { 
    products,
    activityTypes,
    productMap,
    activityTypeMap,
    getProductsByActivity,
    loading: masterDataLoading 
  } = useMasterData();

  // Quick entry mode settings (currently disabled)
  const quickMode = false;
  const lockedFields = {
    date: false,
    activityType: false,
    product: false
  };

  // State for entries
  const [entries, setEntries] = useState([
    {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      activityTypeId: "",
      productId: "",
      quantitySold: "",
      amountFC: "",
      amountUSD: "",
      exchangeRate: "", // No default
      channel: "",
      isValid: false
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Memoize activity types to prevent duplicates
  const memoizedActivityTypes = useMemo(() => {
    const uniqueActivityTypes = new Map();
    
    Array.from(activityTypeMap.values())
      .forEach(type => {
        if (!uniqueActivityTypes.has(type.id)) {
          uniqueActivityTypes.set(type.id, {
            id: type.id,
            name: type.name || type.activityid || 'Unknown Activity'
          });
        }
      });

    return Array.from(uniqueActivityTypes.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [activityTypeMap]);

  // Filter products based on selected activity type
  const getFilteredProducts = (activityTypeId) => {
    if (!activityTypeId || !productMap || productMap.size === 0) {
      return [];
    }
    
    // Debug: Log the activity type being filtered for
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Filtering products for activityTypeId:', activityTypeId);
      console.log('📦 Total products in map:', productMap.size);
      
      // Log a sample of products to see their structure
      const sampleProducts = Array.from(productMap.values()).slice(0, 3);
      console.log('📋 Sample products:', sampleProducts.map(p => ({
        id: p.id,
        productid: p.productid,
        producttype: p.producttype,
        activitytypeid: p.activitytypeid
      })));
    }
    
    const uniqueProducts = new Map();
    
    // Use direct filtering from productMap for more control
    Array.from(productMap.values())
      .filter(product => {
        if (!product || !product.producttype) return false;
        
        // Check both possible field names for activity type ID
        const productActivityId = product.activitytypeid || product.activityTypeId || '';
        const matchesActivity = productActivityId.trim() === activityTypeId.trim();
        
        const isMainProduct = 
          product.producttype === 'Block Ice' || 
          product.producttype === 'Cube Ice' ||
          product.producttype === 'Water Bottling' ||
          product.producttype === 'Water Cans' ||
          // French product types
          product.producttype === 'Bloc de glace' ||
          product.producttype === 'Glaçons' ||
          product.producttype === 'Eau en bouteille' ||
          product.producttype === 'Bidon d\'eau';
          
        const isNotPackaging = 
          !product.producttype?.includes('Packaging') &&
          !product.producttype?.includes('Emballage') &&
          !product.productid?.includes('Package') &&
          !product.productid?.includes('Emballage');

        const shouldInclude = matchesActivity && isMainProduct && isNotPackaging;
        
        // Debug: Log each product check
        if (process.env.NODE_ENV === 'development' && matchesActivity) {
          console.log(`✅ Product ${product.productid}:`, {
            productActivityId,
            selectedActivityId: activityTypeId,
            matchesActivity,
            isMainProduct,
            isNotPackaging,
            shouldInclude
          });
        }

        return shouldInclude;
      })
      .forEach(product => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });

    const result = Array.from(uniqueProducts.values())
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
      
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Filtered products result:', result.map(p => p.productid));
    }
    
    return result;
  };

  // Update the addEntry function
  const addEntry = () => {
    setEntries(prev => {
      const lastEntry = prev[prev.length - 1];
      const newEntry = {
        id: Date.now(),
        date: quickMode && lockedFields.date ? lastEntry.date : new Date().toISOString().split('T')[0],
        activityTypeId: quickMode && lockedFields.activityType ? lastEntry.activityTypeId : "",
        productId: quickMode && lockedFields.product ? lastEntry.productId : "",
        quantitySold: "",
        amountFC: "",
        amountUSD: "",
        exchangeRate: "", // No default
        channel: "",
        isValid: false
      };
      return [...prev, newEntry];
    });
  };

  // Add a function to update exchange rate when date changes
  const updateExchangeRate = async (id, date) => {
    try {
      const rate = await ExchangeRateService.getRateForDate(new Date(date));
      setEntries(prev => prev.map(entry => {
        if (entry.id !== id) return entry;
        
        const updated = { ...entry, exchangeRate: rate };
        if (entry.amountFC) {
          updated.amountUSD = (entry.amountFC / rate).toFixed(2);
        } else if (entry.amountUSD) {
          updated.amountFC = (entry.amountUSD * rate).toFixed(2);
        }
        return updated;
      }));
    } catch (error) {
      console.error('Error updating exchange rate:', error);
    }
  };

  // Update handleEntryChange to use the new exchange rate service
  const handleEntryChange = (id, field, value) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;

      const updated = { ...entry, [field]: value };

      // Clear product selection when activity type changes
      if (field === 'activityTypeId') {
        updated.productId = "";
      }

      // If date changes, update the exchange rate
      if (field === 'date') {
        updateExchangeRate(id, value);
      }

      // Handle special cases
      if (field === 'amountFC') {
        const fc = parseFloat(value) || 0;
        updated.amountUSD = (fc / updated.exchangeRate).toFixed(2);
      } else if (field === 'amountUSD') {
        const usd = parseFloat(value) || 0;
        updated.amountFC = (usd * updated.exchangeRate).toFixed(2);
      } else if (field === 'exchangeRate') {
        const rate = parseFloat(value) || 0;
        const fc = parseFloat(updated.amountFC) || 0;
        updated.amountUSD = (fc / rate).toFixed(2);
      }

      // Validate entry
      updated.isValid = 
        updated.date &&
        updated.activityTypeId &&
        updated.productId &&
        updated.quantitySold > 0 &&
        updated.amountFC > 0 &&
        updated.amountUSD > 0 &&
        updated.channel;

      return updated;
    }));
  };

  // Duplicate entry function
  const duplicateEntry = (id) => {
    setEntries(prev => {
      const entryToDuplicate = prev.find(entry => entry.id === id);
      if (!entryToDuplicate) return prev;

      const newEntry = {
        ...entryToDuplicate,
        id: Date.now(),
        quantitySold: "",
        amountFC: "",
        amountUSD: "",
        isValid: false
      };

      // Find the index of the original entry and insert after it
      const index = prev.findIndex(entry => entry.id === id);
      const newEntries = [...prev];
      newEntries.splice(index + 1, 0, newEntry);
      return newEntries;
    });
  };

  // Remove entry
  const removeEntry = (id) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (entries.length === 0) { setError(t('sales.add.error.addAtLeastOne')); return; }
    setIsSubmitting(true);
    try {
      for (const entry of entries) {
        if (!entry.date || !entry.activityTypeId || !entry.productId || !entry.quantitySold || !entry.amountFC || !entry.amountUSD || !entry.exchangeRate || !entry.channel) {
          setError(t('sales.add.error.requiredFields')); setIsSubmitting(false); return;
        }
        
        // Validate that numeric values are not zero
        if (Number(entry.quantitySold) <= 0 || Number(entry.amountFC) <= 0 || Number(entry.amountUSD) <= 0 || Number(entry.exchangeRate) <= 0) {
          setError('Quantity sold, amounts, and exchange rate must be greater than zero'); setIsSubmitting(false); return;
        }
        
        // 1. Add sales record
        const saleDoc = await addDoc(collection(firestore, "Sales"), {
          date: new Date(entry.date),
          activityTypeId: entry.activityTypeId,
          activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
          productId: entry.productId,
          productName: productMap.get(entry.productId)?.productid || '',
          quantitySold: Number(entry.quantitySold),
          amountFC: Number(entry.amountFC),
          amountUSD: Number(entry.amountUSD),
          exchangeRate: Number(entry.exchangeRate),
          channel: entry.channel,
          createdAt: serverTimestamp()
        });
        // 2. Add OUT movement for sold product
        await inventoryService.addInventoryMovementWithSource({
          date: new Date(entry.date),
          movementType: 'OUT',
          initialQuantity: 0, // Not tracked here
          quantityMoved: Number(entry.quantitySold),
          remainingQuantity: 0, // Not tracked here
          productId: entry.productId,
          productName: productMap.get(entry.productId)?.productid || '',
          activityTypeId: entry.activityTypeId,
          activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
          source: 'sales',
          relatedId: saleDoc.id
        });
      }
      router.push('/dashboard/sales');
    } catch (err) {
      console.error(err);
      setError(t('sales.add.error.failed'));
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function setInitialExchangeRate() {
      const today = new Date();
      const rate = await ExchangeRateService.getRateForDate(today);
      setEntries(prev => prev.map((entry, idx) => idx === 0 ? { ...entry, exchangeRate: rate === 2500 ? '' : rate } : entry));
    }
    setInitialExchangeRate();
  }, []);

  if (masterDataLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('sales.loading.data')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('sales.add.title')}</h1>
              <p className="text-gray-600 mt-1">{t('sales.add.addDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/sales')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('sales.add.backToSales')}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="border border-blue-200 shadow-lg rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900 rounded-lg">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider">{t('sales.fields.date')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider">{t('sales.fields.activityType')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider">{t('sales.fields.product')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('sales.fields.quantitySold')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('sales.fields.amountFC')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('sales.fields.exchangeRate')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('sales.fields.amountUSD')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('sales.fields.channel')}</th>
                  <th className="px-3 py-4 font-semibold text-blue-900 text-xs uppercase tracking-wider text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-blue-50/50 transition-colors duration-200">
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
                        <option value="">{t('sales.placeholders.selectActivityType')}</option>
                        {memoizedActivityTypes.map(a => {
                          // Dynamic translation with fallback for activity types
                          const getTranslatedActivityType = (name) => {
                            if (!name) return name;
                            
                            // Try multiple translation key variations
                            const variations = [
                              name.toLowerCase().replace(/\s+/g, '_'),
                              name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                              name.toLowerCase().replace(/\s+/g, ''),
                              name.replace(/\s+/g, '_').toLowerCase()
                            ];
                            
                            for (const variation of variations) {
                              const key = `products.activities.${variation}`;
                              const translated = t(key);
                              if (translated && translated !== key) {
                                return translated;
                              }
                            }
                            
                            return name; // Fallback to original name
                          };
                          
                          return (
                            <option key={a.id} value={a.id}>
                              {getTranslatedActivityType(a.name)}
                            </option>
                          );
                        })}
                      </Select>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Select
                        value={entry.productId}
                        onChange={e => handleEntryChange(entry.id, 'productId', e.target.value)}
                        className="w-full"
                      >
                        <option value="">{t('sales.placeholders.selectProduct')}</option>
                        {getFilteredProducts(entry.activityTypeId).map(p => {
                          // Use robust translation logic similar to other pages
                          const getTranslatedProductName = (product) => {
                            if (!product || !product.productid) return 'N/A';
                            
                            const name = product.productid.toLowerCase();
                            const type = product.producttype?.toLowerCase() || '';
                            
                            // Handle different product types with multiple variations
                            if (type.includes('block') || name.includes('block')) {
                              if (name.includes('5kg') || name.includes('5 kg')) return t('products.items.blockIce.5kg');
                              if (name.includes('8kg') || name.includes('8 kg')) return t('products.items.blockIce.8kg');
                              if (name.includes('30kg') || name.includes('30 kg')) return t('products.items.blockIce.30kg');
                            }
                            
                            if (type.includes('cube') || name.includes('cube')) {
                              if (name.includes('1kg') || name.includes('1 kg')) return t('products.items.cubeIce.1kg');
                              if (name.includes('2kg') || name.includes('2 kg')) return t('products.items.cubeIce.2kg');
                              if (name.includes('5kg') || name.includes('5 kg')) return t('products.items.cubeIce.5kg');
                            }
                            
                            if (type.includes('water') && (type.includes('bottling') || name.includes('bottled'))) {
                              if (name.includes('600ml')) return t('products.items.waterBottling.600ml');
                              if (name.includes('750ml')) return t('products.items.waterBottling.750ml');
                              if (name.includes('1.5l') || name.includes('1,5l') || name.includes('1_5l')) return t('products.items.waterBottling.1_5L');
                              if (name.includes('5l') && !name.includes('1.5') && !name.includes('1,5')) return t('products.items.waterBottling.5L');
                            }
                            
                            if (type.includes('water') && type.includes('cans')) {
                              if (name.includes('1l') && !name.includes('10l') && !name.includes('1.5') && !name.includes('1,5')) return t('products.items.waterCans.1L');
                              if (name.includes('1.5l') || name.includes('1,5l')) return t('products.items.waterCans.1,5L');
                              if (name.includes('2l') && !name.includes('12l')) return t('products.items.waterCans.2L');
                              if (name.includes('5l') && !name.includes('15l')) return t('products.items.waterCans.5L');
                              if (name.includes('10l')) return t('products.items.waterCans.10L');
                            }
                            
                            return product.productid; // Fallback to original name
                          };
                          
                          return (
                            <option key={p.id} value={p.id}>
                              {getTranslatedProductName(p)}
                            </option>
                          );
                        })}
                      </Select>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <TextInput
                        type="number"
                        value={entry.quantitySold}
                        onChange={e => handleEntryChange(entry.id, 'quantitySold', e.target.value)}
                        className="w-full text-right"
                      />
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
                      <Select
                        value={entry.channel}
                        onChange={e => handleEntryChange(entry.id, 'channel', e.target.value)}
                        className="w-full"
                      >
                        <option value="">{t('sales.placeholders.selectChannel')}</option>
                        <option value="onsite">{t('sales.channels.onsite')}</option>
                        <option value="truckdelivery">{t('sales.channels.truckdelivery')}</option>
                        <option value="motorcycledelivery">{t('sales.channels.motorcycledelivery')}</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          size="xs"
                          className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
                          onClick={() => duplicateEntry(entry.id)}
                        >
                          <HiDuplicate className="h-4 w-4" />
                        </Button>
                        {entries.length > 1 && (
                          <Button
                            size="xs"
                            className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
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
          <div className="mt-6 px-6 py-4 bg-gray-50 border-t border-blue-100">
            <div className="flex justify-between items-center">
              <Button 
                onClick={addEntry} 
                className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 shadow-sm transition-colors duration-200"
              >
                <HiPlus className="mr-2" /> {t('sales.add.addEntry')}
              </Button>
              <div className="flex items-center space-x-3">
                <Link href="/dashboard/sales">
                  <Button className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm transition-colors duration-200">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 shadow-sm transition-colors duration-200"
                >
                  {isSubmitting ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
