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
  const [glAccounts, setGlAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { language } = useLanguage();
  const { translateProduct, translateProductType, translateActivityType, translateExpenseType } = useMasterDataTranslation();

  useEffect(() => {
    const fetchMasterData = async () => {
      // Skip fetching if firestore is not available (SSR)
      if (!firestore) {
        setLoading(false);
        return;
      }
      
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

        const glAccountsSnapshot = await getDocs(collection(firestore, 'GlAccounts'));
        const glAccountsData = glAccountsSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setGlAccounts(glAccountsData);

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
      // Use translated names but preserve original fields
      productid: product.translatedName,
      producttype: product.translatedType,
      // Ensure activitytypeid is preserved
      activitytypeid: product.activitytypeid
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
      name: type.translatedName
    }]));
  }, [expenseTypes]);

  const glAccountMap = useMemo(() => {
    const map = new Map();
    glAccounts.forEach(account => {
      if (account.id) map.set(account.id, account);
      if (account.code) map.set(account.code, account);
    });
    return map;
  }, [glAccounts]);

  const postableAccounts = useMemo(() => {
    return glAccounts
      .filter(account => account.isPostable && account.isActive !== false)
      .sort((a, b) => String(a.code).localeCompare(String(b.code), 'fr', { numeric: true }));
  }, [glAccounts]);

  const defaultSalesAccount = useMemo(() => {
    return glAccounts.find(account =>
      account.isDefaultSalesAccount &&
      account.isActive !== false &&
      account.class === '7' &&
      account.isPostable
    );
  }, [glAccounts]);

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
    glAccounts,
    
    // Maps for efficient lookups
    productMap,
    activityTypeMap,
    expenseTypeMap,
    glAccountMap,
    postableAccounts,
    defaultSalesAccount,
    
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