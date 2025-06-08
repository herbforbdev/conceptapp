import { Product } from '@/types/products';
import { ActivityType } from '@/types/activities';
import { ExpenseType } from '@/types/expenses';

/**
 * Utility functions for handling master data relationships and lookups
 */

// Get product details with activity type info
export const getProductWithActivity = (
  productId: string,
  productMap: Map<string, Product>,
  activityTypeMap: Map<string, ActivityType>
): { product: Product | null; activityType: ActivityType | null } => {
  const product = productMap.get(productId) || null;
  const activityType = product?.activitytypeid ? (activityTypeMap.get(product.activitytypeid) || null) : null;
  return { product, activityType };
};

// Get expense type with budget info
export const getExpenseTypeWithBudget = (
  expenseTypeId: string,
  expenseTypeMap: Map<string, ExpenseType>
): { expenseType: ExpenseType | null; hasBudget: boolean } => {
  const expenseType = expenseTypeMap.get(expenseTypeId) || null;
  return {
    expenseType,
    hasBudget: (expenseType as any)?.budgetCode !== undefined && (expenseType as any).budgetCode > 0
  };
};

// Get packaging products for a given product
export const getPackagingForProduct = (
  productId: string,
  productMap: Map<string, Product>
): Product[] => {
  const mainProduct = productMap.get(productId);
  if (!mainProduct) return [];

  return Array.from(productMap.values()).filter(p => 
    p.producttype?.toLowerCase().includes('packaging') &&
    p.activitytypeid === mainProduct.activitytypeid
  );
};

// Get all products of a specific type
export const getProductsByType = (
  productType: string,
  productMap: Map<string, Product>
): Product[] => {
  return Array.from(productMap.values()).filter(p => 
    p.producttype?.toLowerCase() === productType.toLowerCase()
  );
};

// Get all products for an activity type
export const getProductsByActivity = (
  activityTypeId: string,
  productMap: Map<string, Product>
): Product[] => {
  return Array.from(productMap.values()).filter(p => 
    p.activitytypeid === activityTypeId
  );
};

// Get expense types by category
export const getExpenseTypesByCategory = (
  category: string,
  expenseTypeMap: Map<string, ExpenseType>
): ExpenseType[] => {
  return Array.from(expenseTypeMap.values()).filter(e => 
    (e as any).category?.toLowerCase() === category.toLowerCase()
  );
};

// Get activity types with their products
export const getActivityTypesWithProducts = (
  activityTypeMap: Map<string, ActivityType>,
  productMap: Map<string, Product>
): Map<string, { activityType: ActivityType; products: Product[] }> => {
  const result = new Map();
  
  activityTypeMap.forEach((activityType, id) => {
    const products = Array.from(productMap.values()).filter(p => 
      p.activitytypeid === id
    );
    result.set(id, { activityType, products });
  });
  
  return result;
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRelationships(
  products: Product[],
  activityTypes: ActivityType[],
  expenseTypes: ExpenseType[]
): ValidationResult {
  const errors: string[] = [];

  // Check if all products have valid activity type references
  const activityTypeIds = new Set(activityTypes.map(a => a.id));
  products.forEach(product => {
    if (product.activitytypeid && !activityTypeIds.has(product.activitytypeid)) {
      errors.push(`Product ${product.productid} references non-existent activity type ${product.activitytypeid}`);
    }
  });

  // Check if all expense types have valid categories
  const validCategories = ['operational', 'administrative', 'maintenance', 'other'];
  expenseTypes.forEach(expense => {
    if ((expense as any).category && !validCategories.includes((expense as any).category.toLowerCase())) {
      errors.push(`Expense type ${expense.name} has invalid category ${(expense as any).category}`);
    }
  });

  // Check for duplicate product IDs
  const productIds = new Set<string>();
  products.forEach(product => {
    if (productIds.has(product.productid)) {
      errors.push(`Duplicate product ID found: ${product.productid}`);
    }
    productIds.add(product.productid);
  });

  // Check for duplicate activity type names
  const activityNames = new Set<string>();
  activityTypes.forEach(activity => {
    if (activityNames.has(activity.name.toLowerCase())) {
      errors.push(`Duplicate activity type name found: ${activity.name}`);
    }
    activityNames.add(activity.name.toLowerCase());
  });

  // Check for duplicate expense type names
  const expenseNames = new Set<string>();
  expenseTypes.forEach(expense => {
    if (expenseNames.has(expense.name.toLowerCase())) {
      errors.push(`Duplicate expense type name found: ${expense.name}`);
    }
    expenseNames.add(expense.name.toLowerCase());
  });

  return {
    isValid: errors.length === 0,
    errors
  };
} 