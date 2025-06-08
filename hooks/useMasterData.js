import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { useMasterDataTranslation } from './useMasterDataTranslation';
import { masterDataTranslations } from '@/lib/translations/masterData';

export function useMasterData() {
  const [products, setProducts] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { language } = useLanguage();
  const { translateProduct, translateProductType, translateActivityType, translateExpenseType } = useMasterDataTranslation();

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsSnapshot = await getDocs(collection(firestore, 'Products'));
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          translatedName: masterDataTranslations.products[doc.data().productid]?.[language] || doc.data().productid,
          translatedType: masterDataTranslations.productTypes[doc.data().producttype]?.[language] || doc.data().producttype
        }));
        setProducts(productsData);

        // Fetch activity types
        const activityTypesSnapshot = await getDocs(collection(firestore, 'ActivityTypes'));
        const activityTypesData = activityTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          translatedName: masterDataTranslations.activityTypes[doc.data().name]?.[language] || doc.data().name
        }));
        setActivityTypes(activityTypesData);

        // Fetch expense types
        const expenseTypesSnapshot = await getDocs(collection(firestore, 'ExpenseTypes'));
        const expenseTypesData = expenseTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          translatedName: masterDataTranslations.expenseTypes[doc.data().name]?.[language] || doc.data().name
        }));
        setExpenseTypes(expenseTypesData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching master data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchMasterData();
  }, [language]); // Re-fetch when language changes to update translations

  // Create memoized maps for efficient lookups
  const productMap = useMemo(() => {
    return new Map(products.map(product => [product.id, {
      ...product,
      // Use translated names
      productid: product.translatedName,
      producttype: product.translatedType
    }]));
  }, [products]);

  const activityTypeMap = useMemo(() => {
    return new Map(activityTypes.map(type => [type.id, {
      ...type,
      // Use translated name
      name: type.translatedName
    }]));
  }, [activityTypes]);

  const expenseTypeMap = useMemo(() => {
    return new Map(expenseTypes.map(type => [type.id, {
      ...type,
      // Use translated name
      name: type.translatedName
    }]));
  }, [expenseTypes]);

  // Helper functions
  const getProductsByType = (type) => {
    if (!type) return [];
    return products.filter(p => p.producttype === type);
  };

  const getProductsByActivity = (activityTypeId) => {
    if (!activityTypeId) return [];
    return products.filter(p => p.activitytypeid === activityTypeId);
  };

  const getPackagingProducts = (productId) => {
    if (!productId) return [];
    const product = productMap.get(productId);
    if (!product) return [];
    
    return products.filter(p => 
      p.producttype?.includes('Packaging') && 
      p.activitytypeid === product.activitytypeid
    );
  };

  const getExpenseTypesByCategory = (category) => {
    if (!category) return [];
    return expenseTypes.filter(t => t.category === category);
  };

  // Validation state
  const isValid = useMemo(() => {
    return products.length > 0 && activityTypes.length > 0 && expenseTypes.length > 0;
  }, [products, activityTypes, expenseTypes]);

  const validationErrors = useMemo(() => {
    const errors = [];
    if (products.length === 0) errors.push('No products found');
    if (activityTypes.length === 0) errors.push('No activity types found');
    if (expenseTypes.length === 0) errors.push('No expense types found');
    return errors;
  }, [products, activityTypes, expenseTypes]);

  return {
    // Collections
    products,
    activityTypes,
    expenseTypes,
    
    // Maps for efficient lookups
    productMap,
    activityTypeMap,
    expenseTypeMap,
    
    // Loading and error states
    loading,
    error,
    
    // Validation state
    isValid,
    validationErrors,
    
    // Helper functions
    getProductsByType,
    getProductsByActivity,
    getPackagingProducts,
    getExpenseTypesByCategory,
  };
} 