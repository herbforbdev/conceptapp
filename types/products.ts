import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  productid: string;
  productname: string;
  producttype: string;
  activitytypeid: string;
  description?: string;
  unit?: string;
  price?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isActive?: boolean;
}

export interface ProductType {
  id: string;
  name: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isActive?: boolean;
} 