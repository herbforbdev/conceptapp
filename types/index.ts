// Master Data Types
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
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  active: boolean;
  invited: boolean;
  photoURL?: string;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
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