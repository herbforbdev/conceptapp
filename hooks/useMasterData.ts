import { useFirestoreCollection } from './useFirestoreCollection';
import { useMemo } from 'react';
import { createProductMap, createActivityTypeMap, createExpenseTypeMap } from '@/lib/firestore/mappings';
import { Product } from '@/types/products';
import { ActivityType } from '@/types/activities';
import { ExpenseType } from '@/types/expenses';
import { GlAccount } from '@/types/accounts';
import { validateRelationships } from '@/lib/firestore/masterData';
import { createGlAccountMap, getDefaultSalesAccount, getPostableAccounts } from '@/lib/accounting/accountHelpers';

export interface MasterDataContextType {
  // Collections
  products: Product[];
  activityTypes: ActivityType[];
  expenseTypes: ExpenseType[];
  glAccounts: GlAccount[];
  
  // Maps for efficient lookups
  productMap: Map<string, Product>;
  activityTypeMap: Map<string, ActivityType>;
  expenseTypeMap: Map<string, ExpenseType>;
  glAccountMap: Map<string, GlAccount>;
  postableAccounts: GlAccount[];
  defaultSalesAccount: GlAccount | undefined;
  
  // Loading and error states
  loading: boolean;
  error: Error | null;
  
  // Helper functions
  getProductsByType: (type: string) => Product[];
  getProductsByActivity: (activityTypeId: string) => Product[];
  getPackagingProducts: (productId: string) => Product[];
  getExpenseTypesByCategory: (category: string) => ExpenseType[];
}

export function useMasterData(): MasterDataContextType {
  // Fetch collections
  const { data: products, loading: productsLoading, error: productsError } = useFirestoreCollection<Product>("Products");
  const { data: activityTypes, loading: activitiesLoading, error: activitiesError } = useFirestoreCollection<ActivityType>("ActivityTypes");
  const { data: expenseTypes, loading: expensesLoading, error: expensesError } = useFirestoreCollection<ExpenseType>("ExpenseTypes");
  const { data: glAccounts, loading: accountsLoading, error: accountsError } = useFirestoreCollection<GlAccount>("GlAccounts");

  // Create maps
  const productMap = useMemo(() => createProductMap(products || []), [products]);
  const activityTypeMap = useMemo(() => createActivityTypeMap(activityTypes as any || []), [activityTypes]);
  const expenseTypeMap = useMemo(() => createExpenseTypeMap(expenseTypes || []), [expenseTypes]);
  const glAccountMap = useMemo(() => createGlAccountMap(glAccounts || []), [glAccounts]);
  const postableAccounts = useMemo(() => getPostableAccounts(glAccounts || []), [glAccounts]);
  const defaultSalesAccount = useMemo(() => getDefaultSalesAccount(glAccounts || []), [glAccounts]);

  // Validate relationships
  const validationResult = useMemo(() => {
    if (!products || !activityTypes || !expenseTypes) {
      return { isValid: false, errors: ['Data not loaded yet'] };
    }
    return validateRelationships(products, activityTypes, expenseTypes);
  }, [products, activityTypes, expenseTypes]);

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
      (e as any).category?.toLowerCase() === category.toLowerCase()
    );
  };

  return {
    // Collections
    products: products || [],
    activityTypes: activityTypes || [],
    expenseTypes: expenseTypes || [],
    glAccounts: glAccounts || [],
    
    // Maps
    productMap,
    activityTypeMap,
    expenseTypeMap,
    glAccountMap,
    postableAccounts,
    defaultSalesAccount,
    
    // Loading and error states
    loading: productsLoading || activitiesLoading || expensesLoading,
    error: productsError || activitiesError || expensesError || accountsError,
    
    // Helper functions
    getProductsByType,
    getProductsByActivity,
    getPackagingProducts,
    getExpenseTypesByCategory
  };
} 