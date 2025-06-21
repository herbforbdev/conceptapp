"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select, TextInput } from "flowbite-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useMasterData } from '@/hooks/useMasterData';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import Link from 'next/link';
import { HiPlus, HiTrash, HiDuplicate } from 'react-icons/hi';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { inventoryService } from '@/services/firestore/inventoryService';

export default function AddProductionPage() {
  const router = useRouter();
  const { products, activityTypes, productMap, activityTypeMap, loading: masterLoading } = useMasterData();
  const { t } = useLanguage();

  // Get existing production data for duplicate checking
  const { data: existingProduction } = useFirestoreCollection("Production");

  // Memoize deduplicated activity types
  const memoizedActivityTypes = useMemo(() => {
    if (!activityTypes) return [];
    const uniqueActivityTypes = new Map();
    activityTypes.forEach(type => {
      if (type.id && !uniqueActivityTypes.has(type.id)) {
        uniqueActivityTypes.set(type.id, type);
      }
    });
    return Array.from(uniqueActivityTypes.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [activityTypes]);
  const [entries, setEntries] = useState([{
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    activityTypeId: '',
    productId: '',
    quantityProduced: '',
    packagingName: '',
    packagingQuantity: ''
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debug: Log all products when component mounts (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && productMap.size > 0) {
      console.log('🔍 ALL PRODUCTS LOADED:');
      Array.from(productMap.values()).forEach(p => {
        console.log(`  - ${p.productid} (${p.producttype}) [${p.activitytypeid}]`);
      });
      
      console.log('🔍 PACKAGING PRODUCTS ONLY:');
      Array.from(productMap.values())
        .filter(p => {
          const pType = p.producttype?.toLowerCase() || '';
          const pName = p.productid?.toLowerCase() || '';
          return pType.includes('packaging') || 
                 pType.includes('emballage') || 
                 pName.includes('packaging') || 
                 pName.includes('emballage') ||
                 pName.includes('package');
        })
        .forEach(p => {
          console.log(`  📦 ${p.productid} (${p.producttype}) [${p.activitytypeid}]`);
        });
    }
  }, [productMap]);

  // Add helper for product name translation
  const getTranslatedProductName = (product, t) => {
    if (!product) return 'N/A';
    const name = product.productid;
    if (!name) return 'N/A';
    const lower = name.toLowerCase();
    const type = product.producttype?.toLowerCase();
    const includesAny = (str, terms) => terms.some(term => str.includes(term));
    try {
      if (type === 'block ice' || includesAny(lower, ['bloc de glace', 'block ice'])) {
        if (lower.includes('5kg')) return t('products.items.blockIce.5kg');
        if (lower.includes('8kg')) return t('products.items.blockIce.8kg');
        if (lower.includes('30kg')) return t('products.items.blockIce.30kg');
      }
      if (type === 'cube ice' || includesAny(lower, ['glaçons', 'cube ice', 'ice cube'])) {
        if (lower.includes('1kg')) return t('products.items.cubeIce.1kg');
        if (lower.includes('2kg')) return t('products.items.cubeIce.2kg');
        if (lower.includes('5kg')) return t('products.items.cubeIce.5kg');
      }
      if (type === 'water bottling' || includesAny(lower, ['eau en bouteille', 'bottled water', 'water bottle'])) {
        if (lower.includes('600ml')) return t('products.items.waterBottling.600ml');
        if (lower.includes('750ml')) return t('products.items.waterBottling.750ml');
        if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.waterBottling.1_5L');
        if (lower.includes('5l')) return t('products.items.waterBottling.5L');
      }
      if (type === 'water cans' || includesAny(lower, ['bidon', 'water can', 'water cans'])) {
        // Only translate if it matches exact standard product patterns
        const exactPatterns = [
          { pattern: /^(bidon d'eau |water can |water cans )?1l$/i, key: 'products.items.waterCans.1L' },
          { pattern: /^(bidon d'eau |water can |water cans )?(1\.5l|1,5l)$/i, key: 'products.items.waterCans.1,5L' },
          { pattern: /^(bidon d'eau |water can |water cans )?2l$/i, key: 'products.items.waterCans.2L' },
          { pattern: /^(bidon d'eau |water can |water cans )?5l$/i, key: 'products.items.waterCans.5L' },
          { pattern: /^(bidon d'eau |water can |water cans )?10l$/i, key: 'products.items.waterCans.10L' }
        ];
        
        for (const { pattern, key } of exactPatterns) {
          if (pattern.test(lower.trim())) {
            return t(key);
          }
        }
        
        // For non-standard products, return the original name to allow custom naming
      }
      if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
        if (includesAny(lower, ['cube ice', 'glaçons'])) {
          if (lower.includes('1kg')) return t('products.items.packaging.cubeIce.1kg');
          if (lower.includes('2kg')) return t('products.items.packaging.cubeIce.2kg');
          if (lower.includes('5kg')) return t('products.items.packaging.cubeIce.5kg');
        }
        if (includesAny(lower, ['water', 'eau']) && !includesAny(lower, ['bidon', 'can'])) {
          if (lower.includes('600ml')) return t('products.items.packaging.waterBottling.600ml');
          if (lower.includes('750ml')) return t('products.items.packaging.waterBottling.750ml');
          if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterBottling.1_5L');
          if (lower.includes('5l')) return t('products.items.packaging.waterBottling.5L');
        }
        if (includesAny(lower, ['bidon', 'water can', 'water cans'])) {
          if (lower.includes('1l') && !lower.includes('1.5l') && !lower.includes('1,5l')) return t('products.items.packaging.waterCans.1L');
          if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterCans.1,5L');
          if (lower.includes('2l')) return t('products.items.packaging.waterCans.2L');
          if (lower.includes('5l')) return t('products.items.packaging.waterCans.5L');
          if (lower.includes('10l')) return t('products.items.packaging.waterCans.10L');
        }
      }
    } catch (error) {
      console.warn('Translation error for product:', name, error);
    }
    return name;
  };

  // Memoize filtered products based on activity type
  const getFilteredProducts = useMemo(() => {
    const cache = new Map();
    
    return (activityTypeId) => {
      if (!activityTypeId) return [];
      
      if (cache.has(activityTypeId)) {
        return cache.get(activityTypeId);
      }
      
      const activityType = activityTypeMap.get(activityTypeId);
      if (!activityType) return [];

      // Use Map to ensure unique products by ID
      const uniqueProducts = new Map();
      
      Array.from(productMap.values())
        .filter(product => {
          if (!product || !product.producttype) return false;
          const matchesActivity = product.activitytypeid?.trim() === activityTypeId.trim();
          
          // More comprehensive packaging detection
          const productType = product.producttype?.toLowerCase() || '';
          const productName = product.productid?.toLowerCase() || '';
          const isPackaging = productType.includes('packaging') || 
                            productType.includes('emballage') || 
                            productName.includes('packaging') || 
                            productName.includes('emballage') ||
                            productName.includes('package');
          
          const isMainProduct = !isPackaging;
          return matchesActivity && isMainProduct;
        })
        .forEach(product => {
          if (product.id && !uniqueProducts.has(product.id)) {
            uniqueProducts.set(product.id, product);
          }
        });

      const result = Array.from(uniqueProducts.values())
        .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
      
      cache.set(activityTypeId, result);
      return result;
    };
  }, [productMap, activityTypeMap]);

  const handleEntryChange = (id, field, value) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, [field]: value };
      
      // If activity type changes, reset product selection
      if (field === 'activityTypeId') {
        updated.productId = '';
        updated.packagingName = '';
        updated.packagingQuantity = '';
      }
      
      // If product changes, auto-select corresponding packaging for Cube Ice and Water Bottling
      if (field === 'productId' && value) {
        const product = productMap.get(value);
        if (product) {
          const productName = product.productid?.toLowerCase() || '';
          const productType = product.producttype?.toLowerCase() || '';
          
          // Debug logging (development only)
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Selected product:', {
              name: product.productid,
              type: product.producttype,
              activityId: product.activitytypeid,
              normalizedType: productType,
              normalizedName: productName
            });
          }
          
          // For Cube Ice, Water Bottling, and Water Cans, auto-select packaging
          const isCubeIce = productType.includes('cube ice') || productType === 'cube ice' || 
                           productType.includes('glaçons') || productType === 'glaçons';
          const isWaterBottling = productType.includes('water bottling') || productType === 'water bottling' ||
                                 productType.includes('eau en bouteille') || productType === 'eau en bouteille';
          const isWaterCans = productType.includes('bidon') || productType.includes('water can') || productType.includes('water cans') ||
                             productType.includes('bidon d\'eau') || productType === 'bidon d\'eau';
          
          if (isCubeIce || isWaterBottling || isWaterCans) {
            // Find corresponding packaging products for the same activity type
            const packagingProducts = Array.from(productMap.values()).filter(p => {
              const pType = p.producttype?.toLowerCase() || '';
              const pName = p.productid?.toLowerCase() || '';
              
              // Check if it's a packaging product
              const isPackaging = pType.includes('packaging') || 
                                pType.includes('emballage') || 
                                pName.includes('packaging') || 
                                pName.includes('emballage') ||
                                pName.includes('package');
              
              // Must be same activity type and be packaging
              return isPackaging && p.activitytypeid === product.activitytypeid;
            });
            
            // Debug logging only in development
            if (process.env.NODE_ENV === 'development') {
              console.log('📦 Found packaging products:', packagingProducts.map(p => ({
                name: p.productid,
                type: p.producttype,
                activityId: p.activitytypeid,
                normalizedName: p.productid?.toLowerCase()
              })));
              
              if (packagingProducts.length === 0) {
                console.log('⚠️ WARNING: No packaging products found for activity type:', product.activitytypeid);
              }
              
              console.log('Looking for packaging matching product:', productName);
            }
            
            // Match packaging by size/capacity - more robust matching
            let matchingPackaging = null;
            
            // Extract size from product name - handle variations
            const extractSize = (name) => {
              const lowerName = name.toLowerCase();
              if (lowerName.includes('1kg')) return '1kg';
              if (lowerName.includes('2kg')) return '2kg';
              if (lowerName.includes('5kg')) return '5kg';
              if (lowerName.includes('600ml')) return '600ml';
              if (lowerName.includes('750ml')) return '750ml';
              if (lowerName.includes('1.5l') || lowerName.includes('1,5l')) return '1.5l';
              if (lowerName.includes('5l') && !lowerName.includes('1.5l') && !lowerName.includes('1,5l')) return '5l';
              return null;
            };
            
            // Check if two sizes match (handling variations like "5kg" vs "of 5kg", "1.5l" vs "1,5l")
            const sizesMatch = (size1, size2, packagingName) => {
              if (size1 === size2) return true;
              
              // Handle specific variations
              if (size1 === '5kg' && packagingName.includes('of 5kg')) return true;
              if (size1 === '1.5l' && (packagingName.includes('1,5l') || packagingName.includes('1_5l'))) return true;
              if (size1 === '1,5l' && (packagingName.includes('1.5l') || packagingName.includes('1_5l'))) return true;
              
              return false;
            };
            
            const productSize = extractSize(productName);
            if (process.env.NODE_ENV === 'development') {
              console.log('Extracted product size:', productSize);
            }
            
            if (productSize) {
              // Try different matching strategies
              const matchingStrategies = [
                // Strategy 1: Exact size match with package/emballage keywords
                (p) => {
                  const packagingName = p.productid?.toLowerCase() || '';
                  const packagingSize = extractSize(packagingName);
                  const hasSize = sizesMatch(productSize, packagingSize, packagingName);
                  const isPackaging = packagingName.includes('package') || packagingName.includes('emballage');
                  return hasSize && isPackaging;
                },
                // Strategy 2: Size match in packaging products only
                (p) => {
                  const packagingName = p.productid?.toLowerCase() || '';
                  const productType = p.producttype?.toLowerCase() || '';
                  const packagingSize = extractSize(packagingName);
                  const hasSize = sizesMatch(productSize, packagingSize, packagingName);
                  const isPackagingType = productType.includes('packaging') || productType.includes('emballage');
                  return hasSize && isPackagingType;
                },
                // Strategy 3: Flexible size matching with variations
                (p) => {
                  const packagingName = p.productid?.toLowerCase() || '';
                  const productType = p.producttype?.toLowerCase() || '';
                  const isPackagingType = productType.includes('packaging') || productType.includes('emballage');
                  
                  if (!isPackagingType) return false;
                  
                  // Use the flexible size matching function
                  const packagingSize = extractSize(packagingName);
                  return sizesMatch(productSize, packagingSize, packagingName);
                }
              ];
              
              // Try each strategy until we find a match
              for (let i = 0; i < matchingStrategies.length; i++) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Trying strategy ${i + 1} for product size:`, productSize);
                }
                matchingPackaging = packagingProducts.find(matchingStrategies[i]);
                if (matchingPackaging) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`✅ Found packaging using strategy ${i + 1}:`, {
                      productid: matchingPackaging.productid,
                      producttype: matchingPackaging.producttype
                    });
                  }
                  break;
                } else if (process.env.NODE_ENV === 'development') {
                  console.log(`❌ Strategy ${i + 1} failed`);
                }
              }
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Matching packaging found:', matchingPackaging ? {
                name: matchingPackaging.productid,
                type: matchingPackaging.producttype,
                description: matchingPackaging.description
              } : 'None');
              
              if (!matchingPackaging) {
                console.log('DEBUG: No packaging match found for product:', productName);
                console.log('DEBUG: Product type:', productType);
                console.log('DEBUG: Available packaging products:');
                packagingProducts.forEach(p => {
                  console.log(`  - ${p.productid} (${p.producttype})`);
                });
              }
            }
            
            if (matchingPackaging) {
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Setting packagingName to:', matchingPackaging.productid);
              }
              updated.packagingName = matchingPackaging.productid;
              // If quantity is already set, copy it to packaging
              if (updated.quantityProduced) {
                updated.packagingQuantity = updated.quantityProduced;
              }
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('❌ No packaging match found, clearing packaging field');
                console.log('❌ Product name was:', productName);
                console.log('❌ Product type was:', productType);
              }
              updated.packagingName = '';
              updated.packagingQuantity = '';
            }
          } else if (productType.includes('block ice') || productType === 'block ice' ||
                    productType.includes('bloc de glace') || productType === 'bloc de glace') {
            // For Block Ice, clear packaging
            updated.packagingName = '';
            updated.packagingQuantity = '';
          }
        }
      }
      
      // If quantity changes for Cube Ice, Water Bottling, or Water Cans, sync packaging quantity
      if (field === 'quantityProduced' && value && updated.productId) {
        const product = productMap.get(updated.productId);
        if (product) {
          const productType = product.producttype?.toLowerCase() || '';
          const isCubeIce = productType.includes('cube ice') || productType === 'cube ice' || 
                           productType.includes('glaçons') || productType === 'glaçons';
          const isWaterBottling = productType.includes('water bottling') || productType === 'water bottling' ||
                                 productType.includes('eau en bouteille') || productType === 'eau en bouteille';
          const isWaterCans = productType.includes('bidon') || productType.includes('water can') || productType.includes('water cans') ||
                             productType.includes('bidon d\'eau') || productType === 'bidon d\'eau';
          
          if ((isCubeIce || isWaterBottling || isWaterCans) && updated.packagingName) {
            updated.packagingQuantity = value;
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Updated entry:', {
          id: updated.id,
          productId: updated.productId,
          packagingName: updated.packagingName,
          field: field,
          value: value
        });
      }
      
      return updated;
    }));
  };

  const duplicateEntry = (id) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      const entry = prev[idx];
      const copy = {
        ...entry,
        id: Date.now(),
        quantityProduced: '',
        packagingQuantity: ''
      };
      const arr = [...prev];
      arr.splice(idx + 1, 0, copy);
      return arr;
    });
  };

  const removeRow = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addNewRow = () => {
    setEntries(prev => [...prev, {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      activityTypeId: '',
      productId: '',
      quantityProduced: '',
      packagingName: '',
      packagingQuantity: ''
    }]);
  };

  // Check for duplicate entries
  const checkForDuplicates = (entries) => {
    if (!existingProduction || existingProduction.length === 0) return null;
    
    for (const entry of entries) {
      const entryDate = new Date(entry.date).toDateString();
      
      const duplicate = existingProduction.find(production => {
        const productionDate = production.date?.toDate ? production.date.toDate().toDateString() : new Date(production.date).toDateString();
        return productionDate === entryDate && 
               production.activityTypeId === entry.activityTypeId && 
               production.productId === entry.productId;
      });
      
      if (duplicate) {
        const activityName = activityTypeMap.get(entry.activityTypeId)?.name || t('common.unknownActivity');
        const productName = productMap.get(entry.productId)?.productid || t('common.unknownProduct');
        return t('production.add.error.duplicateEntry', { productName, activityName, date: entryDate });
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (entries.length === 0) { setError(t('production.add.error.addAtLeastOne')); return; }
    
    // Check for duplicates before processing
    const duplicateError = checkForDuplicates(entries);
    if (duplicateError) {
      setError(duplicateError);
      return;
    }
    
    setIsSubmitting(true);
    try {
      for (const entry of entries) {
        if (!entry.date || !entry.activityTypeId || !entry.productId || !entry.quantityProduced) {
          setError(t('production.add.error.requiredFields')); setIsSubmitting(false); return;
        }
        
        // Validate that quantity produced is not zero
        if (Number(entry.quantityProduced) <= 0) {
          setError('Quantity produced must be greater than zero'); setIsSubmitting(false); return;
        }
        const product = productMap.get(entry.productId);
        // 1. Add production record
        const prodDoc = await addDoc(collection(firestore, "Production"), {
          date: new Date(entry.date),
          activityTypeId: entry.activityTypeId,
          activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
          productId: entry.productId,
          productName: product?.productid || '',
          quantityProduced: Number(entry.quantityProduced),
          packagingName: entry.packagingName,
          packagingQuantity: entry.packagingQuantity ? Number(entry.packagingQuantity) : 0,
          createdAt: serverTimestamp()
        });
        // 2. Add IN movement for produced product
        await inventoryService.addInventoryMovementWithSource({
          date: new Date(entry.date),
          movementType: 'IN',
          initialQuantity: 0, // Not tracked here
          quantityMoved: Number(entry.quantityProduced),
          remainingQuantity: 0, // Not tracked here
          productId: entry.productId,
          productName: product?.productid || '',
          activityTypeId: entry.activityTypeId,
          activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
          source: 'production',
          relatedId: prodDoc.id
        });
        // 3. Add OUT movement for packaging if needed
        const activityName = (activityTypeMap.get(entry.activityTypeId)?.name || '').toLowerCase();
        const productType = product?.producttype?.toLowerCase() || '';
        const isCubeIce = productType.includes('cube ice') || productType === 'cube ice' || 
                         productType.includes('glaçons') || productType === 'glaçons';
        const isWaterBottling = productType.includes('water bottling') || productType === 'water bottling' ||
                               productType.includes('eau en bouteille') || productType === 'eau en bouteille';
        const isWaterCans = productType.includes('bidon') || productType.includes('water can') || productType.includes('water cans') ||
                           productType.includes('bidon d\'eau') || productType === 'bidon d\'eau';
        
        if ((isCubeIce || isWaterBottling || isWaterCans || activityName.includes('cube') || activityName.includes('bottling')) && entry.packagingName && entry.packagingQuantity) {
          // Find packaging productId
          const packagingProduct = Array.from(productMap.values()).find(p => p.productid === entry.packagingName);
          if (packagingProduct) {
            await inventoryService.addInventoryMovementWithSource({
              date: new Date(entry.date),
              movementType: 'OUT',
              initialQuantity: 0,
              quantityMoved: Number(entry.packagingQuantity),
              remainingQuantity: 0,
              productId: packagingProduct.id,
              productName: packagingProduct.productid,
              activityTypeId: entry.activityTypeId,
              activityTypeName: activityTypeMap.get(entry.activityTypeId)?.name || '',
              source: 'consumption',
              relatedId: prodDoc.id
            });
          }
        }
      }
      router.push('/dashboard/production');
    } catch (err) {
      console.error(err);
      setError(t('production.add.error.failed'));
      setIsSubmitting(false);
    }
  };

  if (masterLoading) return (
          <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-600 font-medium">{t('common.loadingFormData')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('production.add.title')}</h1>
              <p className="text-gray-600 mt-1">{t('production.add.addDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/production')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('production.add.backToProduction')}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="border border-green-200 shadow-lg rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900">
              <thead>
                <tr className="bg-gradient-to-r from-red-50 to-red-100">
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider">{t('production.fields.date')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider">{t('production.fields.activityType')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider">{t('production.fields.product')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider text-right">{t('production.fields.quantity')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider">{t('production.fields.packaging')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider text-right">{t('production.fields.packagingQuantity')}</th>
                  <th className="px-3 py-4 font-semibold text-red-900 text-xs uppercase tracking-wider text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-red-50/50 transition-colors duration-200">
                    <td className="px-3 py-3">
                      <TextInput
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleEntryChange(entry.id, 'date', e.target.value)}
                        className="w-full text-sm focus:ring-red-500 focus:border-red-500 rounded-lg"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={entry.activityTypeId}
                        onChange={(e) => handleEntryChange(entry.id, 'activityTypeId', e.target.value)}
                        className="w-full text-sm focus:ring-red-500 focus:border-red-500 rounded-lg"
                      >
                        <option value="">{t('common.select')}</option>
                        {memoizedActivityTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {t(`products.activities.${type.name?.toLowerCase().replace(/\s+/g, '_')}`)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={entry.productId}
                        onChange={(e) => handleEntryChange(entry.id, 'productId', e.target.value)}
                        className="w-full text-sm focus:ring-red-500 focus:border-red-500 rounded-lg"
                        disabled={!entry.activityTypeId}
                      >
                        <option value="">{t('common.select')}</option>
                        {getFilteredProducts(entry.activityTypeId).map((product) => (
                          <option key={product.id} value={product.id}>
                            {getTranslatedProductName(product, t)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        type="number"
                        value={entry.quantityProduced}
                        onChange={(e) => handleEntryChange(entry.id, 'quantityProduced', e.target.value)}
                        className="w-full text-sm text-right focus:ring-red-500 focus:border-red-500 rounded-lg"
                        min={0}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                        {entry.packagingName ? (() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('🎯 DISPLAY DEBUG for entry:', entry.id);
                            console.log('🎯 packagingName value:', entry.packagingName);
                            console.log('🎯 packagingName type:', typeof entry.packagingName);
                          }
                          
                          // Find packaging product to get translated name
                          const packagingProduct = Array.from(productMap.values()).find(p => p.productid === entry.packagingName);
                          if (process.env.NODE_ENV === 'development') {
                            console.log('🎯 Found exact match packaging product:', packagingProduct ? packagingProduct.productid : 'None');
                          }
                          
                          if (packagingProduct) {
                            const translatedName = getTranslatedProductName(packagingProduct, t);
                            if (process.env.NODE_ENV === 'development') {
                              console.log('🎯 Translated packaging name:', translatedName);
                            }
                            
                            // Check if this is a packaging product and add prefix if needed
                            const isPackagingProduct = packagingProduct.producttype?.toLowerCase().includes('packaging') ||
                                                     packagingProduct.productid?.toLowerCase().includes('package');
                            
                            if (isPackagingProduct) {
                              // Add "Emballage pour" prefix to distinguish from main product
                              return `Emballage pour ${translatedName.replace(/^(Emballage pour |Package |Packaging )/i, '')}`;
                            }
                            
                            return translatedName;
                          } else {
                            // Fallback: try to find by partial match
                            const fallbackProduct = Array.from(productMap.values()).find(p => 
                              p.productid?.toLowerCase().includes(entry.packagingName.toLowerCase()) ||
                              entry.packagingName.toLowerCase().includes(p.productid?.toLowerCase())
                            );
                            if (process.env.NODE_ENV === 'development') {
                              console.log('🎯 Fallback product found:', fallbackProduct ? fallbackProduct.productid : 'None');
                            }
                            
                            if (fallbackProduct) {
                              const fallbackTranslated = getTranslatedProductName(fallbackProduct, t);
                              if (process.env.NODE_ENV === 'development') {
                                console.log('🎯 Fallback translated name:', fallbackTranslated);
                              }
                              
                              // Check if this is a packaging product and add prefix if needed
                              const isPackagingProduct = fallbackProduct.producttype?.toLowerCase().includes('packaging') ||
                                                       fallbackProduct.productid?.toLowerCase().includes('package');
                              
                              if (isPackagingProduct) {
                                // Add "Emballage pour" prefix to distinguish from main product
                                return `Emballage pour ${fallbackTranslated.replace(/^(Emballage pour |Package |Packaging )/i, '')}`;
                              }
                              
                              return fallbackTranslated;
                            } else {
                              console.log('🎯 No product found, returning raw packagingName:', entry.packagingName);
                              return entry.packagingName;
                            }
                          }
                        })() : t('production.fields.noPackaging')}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        type="number"
                        value={entry.packagingQuantity}
                        onChange={(e) => handleEntryChange(entry.id, 'packagingQuantity', e.target.value)}
                        className="w-full text-sm text-right focus:ring-red-500 focus:border-red-500 rounded-lg"
                        min={0}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center items-center space-x-2">
                        <Button
                          size="xs"
                          onClick={() => duplicateEntry(entry.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors duration-200"
                        >
                          <HiDuplicate size={16} />
                        </Button>
                        {entries.length > 1 && (
                          <Button
                            size="xs"
                            onClick={() => removeRow(entry.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors duration-200"
                          >
                            <HiTrash size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 px-6 py-4 bg-gray-50 border-t border-red-100">
            <div className="flex justify-between items-center">
              <Button 
                onClick={addNewRow} 
                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-sm transition-colors duration-200"
              >
                <HiPlus className="mr-2" /> {t('production.add.addRow')}
              </Button>
              <div className="flex items-center space-x-3">
                <Link href="/dashboard/production">
                  <Button className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm transition-colors duration-200">
                    {t('common.cancel')}
                  </Button>
                </Link>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors duration-200 disabled:bg-red-400"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                      {t('production.add.submitting')}
                    </>
                  ) : (
                    <>
                      {t('production.add.submit')} {entries.length} {entries.length === 1 ? t('production.add.entry') : t('production.add.entries')}
                    </>
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