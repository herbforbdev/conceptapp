// Constants for localStorage keys
export const STORAGE_KEYS = {
  PRODUCTION_FILTERS: 'productionFilters',
  PRODUCTION_TIME_PERIOD: 'productionTimePeriod',
  PRODUCTION_DATE_FILTERS: 'productionDateFilters',
  PRODUCTION_ACTIVITY_TYPE: 'productionActivityType',
  PRODUCTION_PRODUCT: 'productionProduct',
  PRODUCTION_STATUS: 'productionStatus',
  PRODUCTION_MONTH: 'productionMonth'
};

// Save state to localStorage
export const saveState = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

// Load state from localStorage
export const loadState = (key, defaultValue = null) => {
  try {
    const savedState = localStorage.getItem(key);
    return savedState ? JSON.parse(savedState) : defaultValue;
  } catch (err) {
    console.error('Error loading state:', err);
    return defaultValue;
  }
};

// Clear state from localStorage
export const clearState = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error clearing state:', err);
  }
};

// Save all production filters
export const saveProductionFilters = (filters) => {
  Object.entries(filters).forEach(([key, value]) => {
    saveState(STORAGE_KEYS[key], value);
  });
};

// Load all production filters
export const loadProductionFilters = () => {
  return {
    selectedTimePeriod: loadState(STORAGE_KEYS.PRODUCTION_TIME_PERIOD, 'month'),
    dateFilters: loadState(STORAGE_KEYS.PRODUCTION_DATE_FILTERS, {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      week: Math.ceil(new Date().getDate() / 7),
      startDate: null,
      endDate: null
    }),
    selectedActivityType: loadState(STORAGE_KEYS.PRODUCTION_ACTIVITY_TYPE, ''),
    selectedProduct: loadState(STORAGE_KEYS.PRODUCTION_PRODUCT, ''),
    selectedStatus: loadState(STORAGE_KEYS.PRODUCTION_STATUS, ''),
    selectedMonth: loadState(STORAGE_KEYS.PRODUCTION_MONTH, '')
  };
};

// Clear all production filters
export const clearProductionFilters = () => {
  Object.values(STORAGE_KEYS).forEach(clearState);
}; 