import { Timestamp } from 'firebase/firestore';

export interface ExpenseType {
  id: string;
  name: string;
  budget?: number;
  description?: string;
  isActive?: boolean;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Expense {
  id: string;
  expenseTypeId: string;
  activityTypeId: string;
  date: Timestamp;
  amountFC: number;
  amountUSD: number;
  exchangeRate: number;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
} 