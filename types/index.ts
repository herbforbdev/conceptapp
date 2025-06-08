// Master Data Types
import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  productid: string;
  producttype: string;
  description?: string;
  activitytypeid: string;
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
  type?: string;
  budgetCode?: number;
  createdAt?: Date;
  modifiedAt?: Date;
}

// Main Collection Types
export interface Sale {
  id: string;
  activityTypeId: string;
  activityTypeName?: string;
  amountFC: number;
  amountUSD: number;
  channel: string;
  date: Date;
  exchangeRate: number;
  modifiedAt?: Date;
  productId: string;
  productName?: string;
  quantitySold: number;
}

export interface Production {
  id: string;
  activityTypeId: string;
  activityTypeName: string;
  createdAt: Date;
  date: Date;
  packagingName?: string;
  packagingQuantity?: number;
  packagingUsed?: string;
  productName: string;
  productId: string;
  quantityProduced: number;
  updatedAt: Date;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  batchNumber?: string;
}

export interface Inventory {
  id: string;
  activityTypeId: string;
  activityTypeName?: string;
  date: Date;
  initialQuantity: number;
  modifiedAt?: Date;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  productId: string;
  productName?: string;
  quantityMoved: number;
  remainingQuantity: number;
}

export interface Cost {
  id: string;
  activityTypeId: string;
  activityTypeName: string;
  amountFC: number;
  amountUSD: number;
  date: Date;
  exchangeRate: number;
  expenseTypeId: string;
  expenseTypeName: string;
  modifiedAt?: Date;
}

// Summary Types
export interface SummaryData {
  totalUSD: number;
  totalCDF: number;
  count: number;
  average: number;
  growth: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}

// Period Summary Types
export interface PeriodSummary {
  current: {
    totalUSD: number;
    totalCDF: number;
    count: number;
  };
  previous: {
    totalUSD: number;
    totalCDF: number;
    count: number;
  };
  growth: number;
}

// Distribution Summary Types
export interface DistributionSummary {
  labels: string[];
  values: number[];
  percentages: number[];
  total: number;
}

// Cost Analysis Types
export interface CostMetrics {
  totalCosts: number;
  dailyAverage: number;
  topExpense: {
    type: string;
    amount: number;
  };
  growth: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface CostFilters {
  activityTypeId: string;
  expenseTypeId: string;
}

export interface User {
  id?: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'manager' | 'user';
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  invited?: boolean;
  invitedBy?: string;
  invitedAt?: Timestamp;
  // Phase 3: Enhanced profile fields
  phoneNumber?: string;
  company?: string;
  department?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  // Phase 3: Activity tracking
  totalLogins?: number;
  lastActiveAt?: Timestamp;
  sessionId?: string;
  ipAddress?: string;
  loginHistory?: UserLoginEntry[];
  // Phase 3: Preferences
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  weeklyReports?: boolean;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

// Phase 3: New interfaces for enhanced user management
export interface UserLoginEntry {
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  location?: string;
}

export interface UserActivity {
  id?: string;
  userId: string;
  action: 'login' | 'logout' | 'profile_update' | 'password_change' | 'role_change' | 'status_change' | 'data_access';
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  performedBy?: string; // For admin actions
}

export interface UserSession {
  id?: string;
  userId: string;
  sessionId: string;
  startTime: Timestamp;
  lastActivity: Timestamp;
  endTime?: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface AccessRequest {
  id: string;
  email: string;
  displayName: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt?: Date;
} 