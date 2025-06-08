/**
 * Mapping utilities for efficient Firestore data retrieval and lookups
 * These functions create Maps for O(1) lookups instead of O(n) array searches
 */

import { Product } from '@/types/products';
import { ActivityType } from '../../types/index';
import { ExpenseType } from '@/types/expenses';

/**
 * Creates a Map for efficient product lookups by id, productid, or name
 * @param products - Array of product objects from Firestore
 * @returns Map with product identifiers as keys and product objects as values
 */
export function createProductMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    if (product.id) map.set(product.id, product);
    if (product.productid) map.set(product.productid, product);
    if (product.productname) map.set(product.productname, product);
  }
  return map;
}

/**
 * Creates a Map for efficient activity type lookups by id, activityid, or name
 * @param activityTypes - Array of activity type objects from Firestore
 * @returns Map with activity type identifiers as keys and activity type objects as values
 */
export function createActivityTypeMap(activityTypes: ActivityType[]): Map<string, ActivityType> {
  const map = new Map<string, ActivityType>();
  for (const type of activityTypes) {
    if (type.id) map.set(type.id, type);
    if (type.activityid) map.set(type.activityid, type);
    if (type.name) map.set(type.name, type);
  }
  return map;
}

/**
 * Creates a Map for efficient expense type lookups by id or name
 * @param expenseTypes - Array of expense type objects from Firestore
 * @returns Map with expense type identifiers as keys and expense type objects as values
 */
export function createExpenseTypeMap(expenseTypes: ExpenseType[]): Map<string, ExpenseType> {
  const map = new Map<string, ExpenseType>();
  for (const type of expenseTypes) {
    if (type.id) map.set(type.id, type);
    if (type.name) map.set(type.name, type);
  }
  return map;
}

/**
 * Utility function to get a product by any identifier
 * @param productMap - Map of products created with createProductMap
 * @param id - Product identifier (id, productid, or name)
 * @returns Product object or undefined if not found
 */
export function getProduct(productMap: Map<string, Product>, id: string): Product | undefined {
  return productMap.get(id);
}

/**
 * Utility function to get an activity type by any identifier
 * @param activityTypeMap - Map of activity types created with createActivityTypeMap
 * @param id - Activity type identifier (id, activityid, or name)
 * @returns Activity type object or undefined if not found
 */
export function getActivityType(activityTypeMap: Map<string, ActivityType>, id: string): ActivityType | undefined {
  return activityTypeMap.get(id);
}

/**
 * Utility function to get an expense type by any identifier
 * @param expenseTypeMap - Map of expense types created with createExpenseTypeMap
 * @param id - Expense type identifier (id, category, or name)
 * @returns Expense type object or undefined if not found
 */
export function getExpenseType(expenseTypeMap: Map<string, ExpenseType>, id: string): ExpenseType | undefined {
  return expenseTypeMap.get(id);
}

/**
 * Utility function to determine product category based on name or type
 * @param product - Product object
 * @returns Category string: "Ice Blocks", "Ice Cubes", "Bottles", or "Uncategorized"
 */
export function getProductCategory(product: Product): string {
  const type = product.producttype?.toLowerCase() || '';
  if (type.includes('packaging')) return 'packaging';
  if (type === 'block ice') return 'block_ice';
  if (type === 'cube ice') return 'cube_ice';
  if (type === 'water bottling') return 'water_bottling';
  return 'other';
} 