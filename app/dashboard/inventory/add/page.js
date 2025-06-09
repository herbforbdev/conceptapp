"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, TextInput, Select } from "flowbite-react";
import { firestore } from "@/lib/firebase";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useMasterData } from "@/hooks/useMasterData";
import Link from "next/link";
import { HiDuplicate, HiTrash } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle } from "lucide-react";

// Add fade-in animation variant
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

// Add a camelCase utility
function toCamelCase(str) {
  return str
    .replace(/(?:^|\s|_|-)([a-zA-Z])/g, (match, p1, offset) =>
      offset === 0 ? p1.toLowerCase() : p1.toUpperCase()
    )
    .replace(/\s+|_|-/g, '');
}

// Utility to get translated product name
function getTranslatedProductName(product, t) {
  if (!product) return '';
  const type = toCamelCase(product.producttype || '');
  let size = product.productid?.match(/\d+(?:[\.,]\d+)?[kK][gG]|\d+(?:[\.,]\d+)?[mM][lL]|\d+(?:[\.,]\d+)?[lL]/)?.[0]?.toLowerCase();
  if (!type || !size) return product.productid;
  // If it's a liter (L) size, always use capital L
  if (size.match(/([\.,]\d*)?l$/)) {
    size = size.replace(/l$/, 'L');
  }
  // If it's a milliliter (ml) size, always use lowercase ml
  if (size.match(/ml$/i)) {
    size = size.replace(/ml$/i, 'ml');
  }
  // Packaging logic
  if (type.startsWith('packaging')) {
    // Determine if it's for cubeIce or waterBottling
    if (/cube.?ice/i.test(product.productid) || /cube.?ice/i.test(product.producttype)) {
      return t(`products.items.packaging.cubeIce.${size}`) || product.productid;
    }
    if (/water.?bottling/i.test(product.productid) || /water.?bottling/i.test(product.producttype)) {
      return t(`products.items.packaging.waterBottling.${size}`) || product.productid;
    }
    // fallback to generic packaging
    return t(`products.items.packaging.${size}`) || product.productid;
  }
  // Non-packaging products
  return t(`products.items.${type}.${size}`) || product.productid;
}

export default function AddInventoryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // Use the shared master data hook
  const { 
    products,
    activityTypes,
    productMap,
    activityTypeMap,
    loading: masterDataLoading 
  } = useMasterData();

  // Get inventory data for current stock calculation
  const { data: inventoryData, loading: inventoryLoading } = useFirestoreCollection("Inventory");

  // Get current stock for a product with improved ID handling
  const getCurrentStock = useCallback((productKey) => {
    if (!productKey || !inventoryData || !Array.isArray(inventoryData)) return 0;
    // Try both id and productid for matching
    const relevantMovements = inventoryData.filter(m => m.productId === productKey);
    console.log('[getCurrentStock] Looking for productKey:', productKey, '| Matches:', relevantMovements.map(m => ({id: m.id, productId: m.productId, remainingQuantity: m.remainingQuantity})));
    if (!relevantMovements.length) return 0;
    relevantMovements.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    const stock = relevantMovements[0].remainingQuantity || 0;
    console.log('[getCurrentStock] Final stock for', productKey, ':', stock);
    return stock;
  }, [inventoryData]);

  // Add state for Excel-style entries
  const [entries, setEntries] = useState([{
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    activityTypeId: '',
    activityTypeName: '',
    productId: '',
    productName: '',
    movementType: '',
    initialQuantity: '',
    quantityMoved: '',
    remainingQuantity: ''
  }]);

  // Add state for quick mode
  const [isQuickMode, setIsQuickMode] = useState(false);

  // Add missing state for isSubmitting and error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filter products based on selected activity type
  const filteredProducts = useMemo(() => {
    if (!entries[0].activityTypeId) {
      console.log('No activity type selected');
      return [];
    }

    console.log('Filtering products for activity:', entries[0].activityTypeId);
    console.log('Available products:', Array.from(productMap.values()));

    // Get activity type first - try both direct lookup and find by ID
    let activityType = activityTypeMap.get(entries[0].activityTypeId.trim());
    if (!activityType) {
      // Try finding in the activityTypes array
      activityType = activityTypes?.find(at => at.id.trim() === entries[0].activityTypeId.trim());
    }
    console.log('Activity type found:', activityType);

    if (!activityType) {
      console.log('Activity type not found');
      return [];
    }

    // Create a Map to ensure uniqueness by ID
    const uniqueProducts = new Map();
    
    Array.from(productMap.values())
      .filter(product => {
        // Basic validation
        if (!product || !product.producttype) {
          console.log('Invalid product:', product);
          return false;
        }
        
        // Match activity ID - Trim whitespace from both IDs
        const matchesActivity = (product.activitytypeid || '').trim() === entries[0].activityTypeId.trim();
        if (!matchesActivity) {
          console.log('Activity mismatch for product:', product.productid, 
            'Product activity:', product.activitytypeid?.trim(),
            'Selected activity:', entries[0].activityTypeId.trim());
          return false;
        }
        
        // For Block Ice activity, show Block Ice products
        if (activityType.name === 'Block Ice') {
          const isValid = product.producttype === 'Block Ice';
          console.log('Block Ice product check:', product.productid, isValid);
          return isValid;
        }
        
        // For Cube Ice & Water Bottling activity, show both main products and their packaging
        if (activityType.name === 'Cube Ice & Water Bottling' || activityType.description === 'Cube and Bottles Activity') {
          const isMainProduct = 
            product.producttype === 'Cube Ice' ||
            product.producttype === 'Water Bottling';
          const isPackaging = 
            product.producttype === 'Packaging For Cube Ice' ||
            product.producttype === 'Packaging for Ice Cube' ||
            product.producttype === 'Packaging For Water Bottling';
          
          const isValid = isMainProduct || isPackaging;
          console.log('Cube/Bottle product check:', product.productid, 
            'Main:', isMainProduct, 'Packaging:', isPackaging, 'Valid:', isValid);
          return isValid;
        }

        console.log('Product not matching any activity criteria:', product.productid);
        return false;
      })
      .forEach(product => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });

    const products = Array.from(uniqueProducts.values());
    console.log('Filtered products:', products);
    
    // Sort products: main products first, then packaging
    const sortedProducts = products.sort((a, b) => {
      // Helper function to determine if a product is packaging
      const isPackaging = (product) => 
        product.producttype?.includes('Packaging') ||
        product.productid?.includes('Package');

      const aIsPackaging = isPackaging(a);
      const bIsPackaging = isPackaging(b);

      // If one is packaging and the other isn't, non-packaging comes first
      if (aIsPackaging && !bIsPackaging) return 1;
      if (!aIsPackaging && bIsPackaging) return -1;

      // If both are the same type (both packaging or both not), sort by name
      return (a.productid || '').localeCompare(b.productid || '');
    });

    console.log('Sorted products:', sortedProducts);
    return sortedProducts;
  }, [productMap, activityTypeMap, activityTypes, entries]);

  // Group products by type for the dropdown
  const groupedProducts = useMemo(() => {
    if (!filteredProducts.length) {
      console.log('No filtered products to group');
      return {};
    }

    const groups = filteredProducts.reduce((acc, product) => {
      const isPackaging = 
        product.producttype?.includes('Packaging') ||
        product.productid?.includes('Package');
      
      const groupKey = isPackaging ? 'Packaging Materials' : 'Main Products';
      
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(product);
      return acc;
    }, {});

    console.log('Grouped products:', groups);
    return groups;
  }, [filteredProducts]);

  // Update handleChange to work with multiple entries
  const handleChange = (id, field, value) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, [field]: value };

      // If changing activity type
      if (field === 'activityTypeId') {
        const activityType = activityTypes?.find(at => at.id === value);
        updated.activityTypeName = activityType?.name || '';
        updated.productId = '';
        updated.productName = '';
        updated.initialQuantity = '';
        updated.quantityMoved = '';
        updated.remainingQuantity = '';
      }

      // If changing product
      if (field === 'productId' && value) {
        const product = productMap.get(value);
        const currentStock = getCurrentStock(value);
        updated.productName = product?.productid || '';
        updated.initialQuantity = currentStock;
        updated.remainingQuantity = currentStock;
        updated.quantityMoved = '';
      }

      // If changing quantity or movement type
      if (field === 'quantityMoved' || field === 'movementType') {
        const initialQty = Number(updated.initialQuantity) || 0;
        const movedQty = Number(updated.quantityMoved) || 0;
        
        if (updated.movementType === "IN") {
          updated.remainingQuantity = initialQty + movedQty;
        } else if (updated.movementType === "OUT") {
          updated.remainingQuantity = initialQty - movedQty;
        } else if (updated.movementType === "ADJUSTMENT") {
          updated.remainingQuantity = movedQty;
        }
      }

      return updated;
    }));
  };

  // Add function to add new row
  const addNewRow = () => {
    setEntries(prev => [...prev, {
      id: Date.now(),
      date: isQuickMode ? prev[prev.length - 1].date : new Date().toISOString().split('T')[0],
      activityTypeId: isQuickMode ? prev[prev.length - 1].activityTypeId : '',
      activityTypeName: isQuickMode ? prev[prev.length - 1].activityTypeName : '',
      productId: '',
      productName: '',
      movementType: '',
      initialQuantity: '',
      quantityMoved: '',
      remainingQuantity: ''
    }]);
  };

  // Add function to remove row
  const removeRow = (id) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // Add duplicateRow function
  const duplicateRow = (id) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      const entry = prev[idx];
      const copy = {
        ...entry,
        id: Date.now(),
        quantityMoved: '',
        remainingQuantity: ''
      };
      const arr = [...prev];
      arr.splice(idx + 1, 0, copy);
      return arr;
    });
  };

  // Update handleSubmit for multiple entries
  const handleSubmit = async () => {
    if (entries.length === 0) {
      setError(t('inventory.add.error.addAtLeastOne'));
      return;
    }

    // Validate all entries
    for (const entry of entries) {
      if (!entry.date) {
        setError(t('inventory.add.error.selectDate'));
        return;
      }
      if (!entry.movementType) {
        setError(t('inventory.add.error.selectMovementType'));
        return;
      }
      if (!entry.activityTypeId) {
        setError(t('inventory.add.error.selectActivityType'));
        return;
      }
      if (!entry.productId) {
        setError(t('inventory.add.error.selectProduct'));
        return;
      }
      if (!entry.quantityMoved || entry.quantityMoved <= 0) {
        setError(t('inventory.add.error.quantityMoved'));
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const batch = writeBatch(firestore);
      
      for (const entry of entries) {
        const inventoryData = {
          date: new Date(entry.date),
          movementType: entry.movementType,
          initialQuantity: Number(entry.initialQuantity),
          quantityMoved: Number(entry.quantityMoved),
          remainingQuantity: Number(entry.remainingQuantity),
          productId: entry.productId,
          productName: entry.productName,
          activityTypeId: entry.activityTypeId,
          activityTypeName: entry.activityTypeName,
          source: 'manual',
          createdAt: serverTimestamp(),
          modifiedAt: serverTimestamp()
        };

        const docRef = doc(collection(firestore, "Inventory"));
        batch.set(docRef, inventoryData);
      }

      await batch.commit();
      router.push("/dashboard/inventory");
    } catch (err) {
      console.error("Error adding inventory records:", err);
      setError(t('inventory.add.error.failed'));
      setIsSubmitting(false);
    }
  };

  // Combined loading state
  const isLoading = masterDataLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form data...</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('inventory.add.title')}</h1>
              <p className="text-gray-600 mt-1">{t('inventory.add.addDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/inventory')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-purple-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="border border-purple-200 shadow-lg rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900">
              <thead>
                <tr className="bg-gradient-to-r from-purple-50 to-purple-100">
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider">{t('inventory.table.date')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider">{t('inventory.table.activityType')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider">{t('inventory.table.product')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider">{t('inventory.table.movementType')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider text-right">{t('inventory.table.initialQuantity')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider text-right">{t('inventory.table.quantityMoved')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider text-right">{t('inventory.table.remaining')}</th>
                  <th className="px-3 py-4 font-semibold text-purple-900 text-xs uppercase tracking-wider text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-purple-50/50 transition-colors duration-200">
                    <td className="px-3 py-3">
                      <TextInput
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleChange(entry.id, 'date', e.target.value)}
                        className="w-full text-sm focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={entry.activityTypeId}
                        onChange={(e) => handleChange(entry.id, 'activityTypeId', e.target.value)}
                        className="w-full text-sm focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                      >
                        <option value="">{t('inventory.filters.allActivityTypes')}</option>
                        {activityTypes?.map((type) => (
                          <option key={type.id} value={type.id}>
                            {t(`products.activities.${type.name?.toLowerCase().replace(/\s+/g, '_')}`) || type.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={entry.productId}
                        onChange={(e) => handleChange(entry.id, 'productId', e.target.value)}
                        className="w-full text-sm focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                        disabled={!entry.activityTypeId}
                      >
                        <option value="">{t('inventory.add.selectProduct')}</option>
                        {Object.entries(groupedProducts).map(([group, products]) => {
                          // Map group to correct translation key
                          let groupKey = group;
                          if (group.toLowerCase().includes('packaging')) groupKey = 'packagingMaterials';
                          else groupKey = 'mainProducts';
                          const groupLabel = t(`products.categories.${groupKey}`) || group;
                          return (
                            <optgroup key={group} label={groupLabel}>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {getTranslatedProductName(product, t)}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={entry.movementType}
                        onChange={(e) => handleChange(entry.id, 'movementType', e.target.value)}
                        className="w-full text-sm focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                      >
                        <option value="">{t('inventory.filters.allMovementTypes')}</option>
                        <option value="IN">{t('inventory.table.stockIn')}</option>
                        <option value="OUT">{t('inventory.table.stockOut')}</option>
                        <option value="ADJUSTMENT">{t('inventory.table.adjustment')}</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        type="number"
                        value={entry.initialQuantity}
                        onChange={(e) => handleChange(entry.id, 'initialQuantity', e.target.value)}
                        className="w-full text-sm text-right focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                        min={0}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        type="number"
                        value={entry.quantityMoved}
                        onChange={(e) => handleChange(entry.id, 'quantityMoved', e.target.value)}
                        className="w-full text-sm text-right focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                        min={0}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        type="number"
                        value={entry.remainingQuantity}
                        onChange={(e) => handleChange(entry.id, 'remainingQuantity', e.target.value)}
                        className="w-full text-sm text-right focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                        min={0}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          size="xs"
                          className="bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-200"
                          onClick={() => duplicateRow(entry.id)}
                        >
                          <HiDuplicate className="h-4 w-4" />
                        </Button>
                        {entries.length > 1 && (
                          <Button
                            size="xs"
                            color="failure"
                            className="bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-200"
                            onClick={() => removeRow(entry.id)}
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
          {/* Action Row at the bottom */}
          <div className="mt-6 px-6 py-4 bg-gray-50 border-t border-purple-100">
            <div className="flex justify-between items-center">
              <Button 
                onClick={addNewRow} 
                className="bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 shadow-sm transition-colors duration-200"
              >
                <HiDuplicate className="mr-2" /> {t('inventory.add.addRow')}
              </Button>
              <div className="flex items-center space-x-3">
                <Link href="/dashboard/inventory">
                  <Button className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm transition-colors duration-200">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors duration-200 disabled:bg-purple-400"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      {t('common.loading')}
                    </>
                  ) : (
                    <>{t('inventory.add.submit')} {entries.length} {entries.length === 1 ? t('inventory.add.entry') : t('inventory.add.entries')}</>
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