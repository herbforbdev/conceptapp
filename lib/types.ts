export interface Product {
  id: string;
  productid: string;
  producttype: string;
  activitytypeid: string;
  name?: string;
  description?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface ActivityType {
  id: string;
  activityid: string;
  name: string;
  description?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface Sale {
  id: string;
  date: Date;
  productId: string;
  quantitySold: number;
  amountFC: number;
  amountUSD: number;
  exchangeRate: number;
  channel: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Production {
  id: string;
  date: Date;
  productId: string;
  productName: string;
  activityTypeId: string;
  activityTypeName: string;
  quantityProduced: number;
  packagingName?: string;
  packagingUsed?: string;
  packagingQuantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Inventory {
  id: string;
  date: Date;
  productId: string;
  movementType: 'OPENING' | 'IN' | 'OUT' | 'ADJUSTMENT';
  initialQuantity: number;
  quantityMoved: number;
  remainingQuantity: number;
  activityTypeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Cost {
  id: string;
  date: Date;
  expenseTypeId: string;
  activityTypeId: string;
  amountFC: number;
  amountUSD: number;
  exchangeRate: number;
  modifiedAt?: Date;
} 