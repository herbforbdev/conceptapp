// Constants for localStorage keys
export const STORAGE_KEYS = {
  SALES_TIME_PERIOD: 'salesTimePeriod',
  SALES_DATE_FILTERS: 'salesDateFilters',
  SALES_ACTIVITY_TYPE: 'salesActivityType',
  SALES_PRODUCT: 'salesProduct',
  SALES_CHANNEL: 'salesChannel',
  SALES_STATUS: 'salesStatus',
  SALES_MONTH: 'salesMonth'
};

// Save state to localStorage
export const saveState = (key, value) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

// Load state from localStorage
export const loadState = (key, defaultValue = null) => {
  try {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(key);
      return savedState ? JSON.parse(savedState) : defaultValue;
    }
    return defaultValue;
  } catch (err) {
    console.error('Error loading state:', err);
    return defaultValue;
  }
};

// Clear state from localStorage
export const clearState = (key) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error clearing state:', err);
  }
};

// Save all sales filters
export const saveSalesFilters = (filters) => {
  try {
    if (typeof window !== 'undefined') {
      if (filters.selectedTimePeriod) {
        localStorage.setItem(STORAGE_KEYS.SALES_TIME_PERIOD, filters.selectedTimePeriod);
      }
      if (filters.dateFilters) {
        localStorage.setItem(STORAGE_KEYS.SALES_DATE_FILTERS, JSON.stringify(filters.dateFilters));
      }
      if (filters.selectedActivityType !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SALES_ACTIVITY_TYPE, filters.selectedActivityType);
      }
      if (filters.selectedProduct !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SALES_PRODUCT, filters.selectedProduct);
      }
      if (filters.selectedChannel !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SALES_CHANNEL, filters.selectedChannel);
      }
      if (filters.selectedStatus !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SALES_STATUS, filters.selectedStatus);
      }
      if (filters.selectedMonth !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SALES_MONTH, filters.selectedMonth);
      }
    }
  } catch (err) {
    console.error('Error saving sales filters:', err);
  }
};

// Load all sales filters
export const loadSalesFilters = () => {
  try {
    if (typeof window !== 'undefined') {
      return {
        selectedTimePeriod: localStorage.getItem(STORAGE_KEYS.SALES_TIME_PERIOD) || 'month',
        dateFilters: JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES_DATE_FILTERS)) || getCurrentDateFilters(),
        selectedActivityType: localStorage.getItem(STORAGE_KEYS.SALES_ACTIVITY_TYPE) || '',
        selectedProduct: localStorage.getItem(STORAGE_KEYS.SALES_PRODUCT) || '',
        selectedChannel: localStorage.getItem(STORAGE_KEYS.SALES_CHANNEL) || '',
        selectedStatus: localStorage.getItem(STORAGE_KEYS.SALES_STATUS) || '',
        selectedMonth: localStorage.getItem(STORAGE_KEYS.SALES_MONTH) || ''
      };
    }
    return {
      selectedTimePeriod: 'month',
      dateFilters: getCurrentDateFilters(),
      selectedActivityType: '',
      selectedProduct: '',
      selectedChannel: '',
      selectedStatus: '',
      selectedMonth: ''
    };
  } catch (err) {
    console.error('Error loading sales filters:', err);
    return {
      selectedTimePeriod: 'month',
      dateFilters: getCurrentDateFilters(),
      selectedActivityType: '',
      selectedProduct: '',
      selectedChannel: '',
      selectedStatus: '',
      selectedMonth: ''
    };
  }
};

// Clear all sales filters
export const clearSalesFilters = () => {
  Object.values(STORAGE_KEYS).forEach(clearState);
};

// Get current date filters
const getCurrentDateFilters = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    week: Math.ceil(now.getDate() / 7),
    startDate: null,
    endDate: null
  };
}; 