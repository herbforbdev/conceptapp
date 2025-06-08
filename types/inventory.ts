import { Timestamp } from 'firebase/firestore';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryEntry {
  id: string;
  date: Timestamp;
  movementType: MovementType;
  initialQuantity: number;
  quantityMoved: number;
  remainingQuantity: number;
  productId: string;
  productName: string;
  activityTypeId: string;
  activityTypeName: string;
  source?: 'production' | 'consumption' | 'sales' | 'manual';
  relatedId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InventoryStats {
  totalInventory: number;
  monthlyMovements: number;
  blockIceStock: number;
  cubeIceStock: number;
  waterBottlingStock: number;
  packagingStock: number;
}

export interface InventoryFilters {
  timePeriod: string;
  month?: number;
  year?: number;
  week?: number;
  startDate?: string;
  endDate?: string;
  activityType?: string;
  product?: string;
  movementType?: MovementType;
} 