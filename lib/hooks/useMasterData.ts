import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { useMemo } from 'react';
import { createProductMap, createActivityTypeMap, createExpenseTypeMap } from '../firestore/mappings';
import { Product, ActivityType, ExpenseType } from '../types';
import { validateRelationships } from '../firestore/masterData';

export interface MasterDataContextType {
  // Collections
  products: Product[];
  activityTypes: ActivityType[];
  expenseTypes: ExpenseType[];
  
  // Maps for efficient lookups
  productMap: Map<string, Product>;
  activityTypeMap: Map<string, ActivityType>;
  expenseTypeMap: Map<string, ExpenseType>;
  
  // Loading and error states
  loading: boolean;
  error: Error | null;
  
  // Validation state
  isValid: boolean;
  validationErrors: string[];
  
  // Helper functions
  getProductsByType: (type: string) => Product[];
  getProductsByActivity: (activityTypeId: string) => Product[];
  getPackagingProducts: (productId: string) => Product[];
  getExpenseTypesByCategory: (category: string) => ExpenseType[];
}

export function useMasterData(): MasterDataContextType {
  const { data: products, loading: productsLoading, error: productsError } = useFirestoreCollection("Products");
  const { data: activityTypes, loading: activityTypesLoading, error: activityTypesError } = useFirestoreCollection("ActivityTypes");
  const { data: expenseTypes, loading: expenseTypesLoading, error: expenseTypesError } = useFirestoreCollection("ExpenseTypes");

  // Create maps for efficient lookups
  const productMap = useMemo(() => createProductMap(products || []), [products]);
  const activityTypeMap = useMemo(() => createActivityTypeMap(activityTypes || []), [activityTypes]);
  const expenseTypeMap = useMemo(() => createExpenseTypeMap(expenseTypes || []), [expenseTypes]);

  // Validate relationships
  const { valid, errors } = useMemo(() => 
    validateRelationships(productMap, activityTypeMap),
    [productMap, activityTypeMap]
  );

  // Helper functions
  const getProductsByType = (type: string): Product[] => {
    return Array.from(productMap.values()).filter(p => 
      p.producttype?.toLowerCase() === type.toLowerCase()
    );
  };

  const getProductsByActivity = (activityTypeId: string): Product[] => {
    return Array.from(productMap.values()).filter(p => 
      p.activitytypeid === activityTypeId
    );
  };

  const getPackagingProducts = (productId: string): Product[] => {
    const mainProduct = productMap.get(productId);
    if (!mainProduct) return [];

    return Array.from(productMap.values()).filter(p => 
      p.producttype?.toLowerCase().includes('packaging') &&
      p.activitytypeid === mainProduct.activitytypeid
    );
  };

  const getExpenseTypesByCategory = (category: string): ExpenseType[] => {
    return Array.from(expenseTypeMap.values()).filter(e => 
      e.category?.toLowerCase() === category.toLowerCase()
    );
  };

  return {
    // Collections
    products: products || [],
    activityTypes: activityTypes || [],
    expenseTypes: expenseTypes || [],
    
    // Maps
    productMap,
    activityTypeMap,
    expenseTypeMap,
    
    // Loading and error states
    loading: productsLoading || activityTypesLoading || expenseTypesLoading,
    error: productsError || activityTypesError || expenseTypesError,
    
    // Validation state
    isValid: valid,
    validationErrors: errors,
    
    // Helper functions
    getProductsByType,
    getProductsByActivity,
    getPackagingProducts,
    getExpenseTypesByCategory
  };
} 