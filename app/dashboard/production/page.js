"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card, Button, TextInput, Select, Label, Dropdown } from "flowbite-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  HiCalendar, HiFilter, HiRefresh, HiTrendingUp, HiTrendingDown, 
  HiTrash, HiPencil, HiPlus, HiInbox, HiChevronDown, HiCube, HiClipboardList, HiArchive, HiCheck, HiX 
} from "react-icons/hi";
import { PiBeerBottleFill } from "react-icons/pi";
import { FaIndustry, FaCubes } from "react-icons/fa";
import { SiCodeblocks } from "react-icons/si";
import { deleteDoc, doc, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import TopCard from "@/components/shared/TopCard";
import { TIME_PERIODS } from '@/lib/constants/timePeriods';
import TimePeriodSelector from '@/components/shared/TimePeriodSelector';
import { useTranslation } from '@/lib/utils/localizationUtils';
import ErrorBoundary from '@/components/ErrorBoundary';

// Dynamic import for ApexCharts
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Client-only wrapper component
const ClientOnly = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return children;
};

// Import our custom hooks and utilities
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useMasterData } from "@/hooks/useMasterData";
import { formatDateConsistent } from "@/lib/utils/dateUtils";
import { calculatePeriodSummary, analyzeProduction, analyzePackagingUsage, calculateProductionEfficiency } from "@/lib/analysis/dataProcessing";

// Types
import { Production, Product, ActivityType } from "@/types";

// Initial state for date filters
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

// Update the formatDate function
const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    // Handle Firestore Timestamp
    if (timestamp.toDate) {
      return String(timestamp.toDate().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }));
    }
    // Handle Date objects
    if (timestamp instanceof Date) {
      return String(timestamp.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }));
    }
    // Handle string dates
    return String(new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }));
  } catch (error) {
    console.error("Error formatting date:", error, timestamp);
    return "Invalid Date";
  }
};

// Add this function before the component
const calculateProductionSummary = (
  filteredProductions, 
  lastMonthProduction,
  getDailyProduction, 
  getMonthlyProduction, 
  getLastMonthProduction, 
  calculateVariation, 
  formatDate
) => [
  {
    category: "Block Production",
    today: getDailyProduction(filteredProductions, formatDate(new Date()), "block"),
    month: getMonthlyProduction(filteredProductions, "block"),
    variation: calculateVariation(
      getMonthlyProduction(filteredProductions, "block"),
      getLastMonthProduction(lastMonthProduction, "block")
    ),
  },
  {
    category: "Ice Cubes Production",
    today: getDailyProduction(filteredProductions, formatDate(new Date()), "cubes"),
    month: getMonthlyProduction(filteredProductions, "cubes"),
    variation: calculateVariation(
      getMonthlyProduction(filteredProductions, "cubes"),
      getLastMonthProduction(lastMonthProduction, "cubes")
    ),
  },
  {
    category: "Bottles Production",
    today: getDailyProduction(filteredProductions, formatDate(new Date()), "bottles"),
    month: getMonthlyProduction(filteredProductions, "bottles"),
    variation: calculateVariation(
      getMonthlyProduction(filteredProductions, "bottles"),
      getLastMonthProduction(lastMonthProduction, "bottles")
    ),
  },
  {
    category: "Packaging Used",
    today: filteredProductions
      .filter(p => {
        if (!p.date) return false;
        
        // Check if the product uses packaging
        const usesPackaging = 
          // Either has explicit packaging
          (p.packagingName && p.packagingName !== "No packaging required") ||
          // Or is a bottle product
          (p.productName?.toLowerCase().includes("bottle") && !p.productName?.toLowerCase().includes("block")) ||
          // Or is an ice cube product
          (p.productName?.toLowerCase().includes("ice cube") && !p.productName?.toLowerCase().includes("block"));
        
        // Check if it's today's date
        const isToday = formatDate(p.date) === formatDate(new Date());
        
        return usesPackaging && isToday;
      })
      .reduce((acc, curr) => {
        // Use packagingQuantity if available, otherwise use production quantity
        return acc + (curr.packagingQuantity > 0 ? curr.packagingQuantity : curr.quantityProduced || 0);
      }, 0),
    
    month: filteredProductions
      .filter(p => {
        if (!p.date) return false;
        
        // Check if the product uses packaging
        const usesPackaging = 
          // Either has explicit packaging
          (p.packagingName && p.packagingName !== "No packaging required") ||
          // Or is a bottle product
          (p.productName?.toLowerCase().includes("bottle") && !p.productName?.toLowerCase().includes("block")) ||
          // Or is an ice cube product
          (p.productName?.toLowerCase().includes("ice cube") && !p.productName?.toLowerCase().includes("block"));
        
        // Check if it's this month
        let isCurrentMonth = false;
        try {
          const now = new Date();
          let prodDate;
          
          if (p.date && p.date.seconds) {
            prodDate = new Date(p.date.seconds * 1000);
          } else if (p.date instanceof Date) {
            prodDate = p.date;
          } else {
            prodDate = new Date(p.date);
          }
          
          isCurrentMonth = prodDate.getMonth() === now.getMonth() && 
                           prodDate.getFullYear() === now.getFullYear();
        } catch (err) {
          return false;
        }
        
        return usesPackaging && isCurrentMonth;
      })
      .reduce((acc, curr) => {
        // Use packagingQuantity if available, otherwise use production quantity
        return acc + (curr.packagingQuantity > 0 ? curr.packagingQuantity : curr.quantityProduced || 0);
      }, 0),
    
    variation: 0 // If needed, calculate variation
  },
];

// Add memoized filter maps
const useMemoizedFilters = (productions, productMap, activityTypeMap) => {
  return useMemo(() => {
    if (!productions || !productMap || !activityTypeMap) return null;

    // Pre-process dates once
    const dateMap = new Map();
    productions.forEach(prod => {
      if (prod.date) {
        try {
          dateMap.set(prod.id, prod.date.toDate ? prod.date.toDate() : new Date(prod.date));
        } catch (err) {
          console.error('Error parsing date for production:', prod.id);
        }
      }
    });

    // Pre-process product types
    const productTypeMap = new Map();
    productions.forEach(prod => {
      const product = productMap.get(prod.productId);
      if (product) {
        productTypeMap.set(prod.id, product.producttype);
      }
    });

    // Pre-process activity types
    const activityNameMap = new Map();
    productions.forEach(prod => {
      const activity = activityTypeMap.get(prod.activityTypeId);
      if (activity) {
        activityNameMap.set(prod.id, activity.name);
      }
    });

    return {
      dateMap,
      productTypeMap,
      activityNameMap
    };
  }, [productions, productMap, activityTypeMap]);
};

// Add at the top of the file, before the component
const useProductionFilters = (productions, filterMaps, filters) => {
  const { selectedTimePeriod, dateFilters, selectedActivityType, selectedProduct } = filters;
  
  return useMemo(() => {
    if (!productions || !filterMaps) return [];
    
    const { dateMap, productTypeMap, activityNameMap } = filterMaps;
    
    return productions.filter(prod => {
      // Quick return if no date
      if (!dateMap.has(prod.id)) return false;
      
      const date = dateMap.get(prod.id);
      
      // Time period filter
      let matchesTimePeriod = true;
      switch (selectedTimePeriod) {
        case TIME_PERIODS.YEAR:
          matchesTimePeriod = date.getFullYear() === dateFilters.year;
          break;
        case TIME_PERIODS.MONTH:
          matchesTimePeriod = date.getFullYear() === dateFilters.year && 
                             date.getMonth() === dateFilters.month;
          break;
        case TIME_PERIODS.WEEK: {
          const firstDayOfMonth = new Date(dateFilters.year, dateFilters.month, 1);
          const weekOffset = firstDayOfMonth.getDay();
          const weekStart = new Date(dateFilters.year, dateFilters.month, 
            (dateFilters.week - 1) * 7 + 1 - weekOffset);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchesTimePeriod = date >= weekStart && date <= weekEnd;
          break;
        }
        case TIME_PERIODS.CUSTOM:
          if (dateFilters.startDate && dateFilters.endDate) {
            const startDate = new Date(dateFilters.startDate);
            const endDate = new Date(dateFilters.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            matchesTimePeriod = date >= startDate && date <= endDate;
          }
          break;
        default:
          matchesTimePeriod = true;
      }

      if (!matchesTimePeriod) return false;

      // Activity type filter
      if (selectedActivityType && 
          prod.activityTypeId !== selectedActivityType) {
        return false;
      }

      // Product filter
      if (selectedProduct && 
          prod.productId !== selectedProduct) {
        return false;
      }

      return true;
    });
  }, [productions, filterMaps, selectedTimePeriod, dateFilters, selectedActivityType, selectedProduct]);
};

// Add LoadingSpinner component
const LoadingSpinner = () => (
  <div className="min-h-screen p-4 md:p-8">
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading production data...</p>
      </div>
    </div>
  </div>
);

// Add ErrorMessage component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="min-h-screen p-4 md:p-8">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <p className="text-red-800">{message}</p>
      <Button
        color="failure"
        size="sm"
        onClick={onRetry}
        className="mt-2"
      >
        <HiRefresh className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  </div>
);

// Update the typeStyles object for the new cards
const typeStyles = {
  "Total Production": { bg: "bg-red-700", text: "text-red-700", icon: <HiCube /> },
  "Top Product": { bg: "bg-red-800", text: "text-red-800", icon: <HiTrendingUp /> },
  "Production Activities": { bg: "bg-red-600", text: "text-red-600", icon: <HiClipboardList /> },
  "Most Used Packaging": { bg: "bg-red-700", text: "text-red-700", icon: <HiArchive /> },
  "Activity Distribution": { bg: "bg-red-500", text: "text-red-500", icon: <HiFilter /> },
  default: { bg: "bg-red-400", text: "text-red-400", icon: <HiInbox /> },
};

// Update the calculateTopCards function
const calculateTopCards = (productions) => {
  if (!productions || !Array.isArray(productions)) return {
    totalProduction: { today: 0, month: 0, allTime: 0 },
    topProduct: { name: 'None', quantity: 0 },
    productionActivities: { today: 0, week: 0, month: 0 },
    topPackaging: { name: 'None', quantity: 0 },
    activityDistribution: { name: 'None', percentage: 0 }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // 1. Total Quantity Produced
  const totalProduction = {
    today: productions
      .filter(p => {
        const prodDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
        return prodDate >= today;
      })
      .reduce((sum, p) => sum + (Number(p.quantityProduced) || 0), 0),
    month: productions
      .filter(p => {
        const prodDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
        return prodDate >= startOfMonth;
      })
      .reduce((sum, p) => sum + (Number(p.quantityProduced) || 0), 0),
    allTime: productions
      .reduce((sum, p) => sum + (Number(p.quantityProduced) || 0), 0)
  };

  // 2. Most Produced Product
  const productionByProduct = productions.reduce((acc, p) => {
    const key = p.productName || 'Unknown Product';
    if (!acc[key]) acc[key] = 0;
    acc[key] += Number(p.quantityProduced) || 0;
    return acc;
  }, {});
  
  const topProduct = Object.entries(productionByProduct)
    .sort(([,a], [,b]) => b - a)
    .map(([name, quantity]) => ({ name, quantity }))[0] || { name: 'None', quantity: 0 };

  // 3. Number of Production Activities
  const productionActivities = {
    today: productions.filter(p => {
      const prodDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
      return prodDate >= today;
    }).length,
    week: productions.filter(p => {
      const prodDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
      return prodDate >= startOfWeek;
    }).length,
    month: productions.filter(p => {
      const prodDate = p.date?.toDate ? p.date.toDate() : new Date(p.date);
      return prodDate >= startOfMonth;
    }).length
  };

  // 4. Most Used Packaging
  const packagingUsage = productions.reduce((acc, p) => {
    if (p.packagingName && p.packagingQuantity) {
      const key = p.packagingName;
      if (!acc[key]) acc[key] = 0;
      acc[key] += Number(p.packagingQuantity) || 0;
    }
    return acc;
  }, {});
  
  const topPackaging = Object.entries(packagingUsage)
    .sort(([,a], [,b]) => b - a)
    .map(([name, quantity]) => ({ name, quantity }))[0] || { name: 'None', quantity: 0 };

  // 5. Activity Type Distribution
  const activityCount = productions.reduce((acc, p) => {
    const type = p.activityTypeName || 'Unknown';
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {});
  
  const totalActivities = Object.values(activityCount).reduce((sum, count) => sum + count, 0);
  const activityDistribution = Object.entries(activityCount)
    .sort(([,a], [,b]) => b - a)
    .map(([name, count]) => ({
      name,
      percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0
    }))[0] || { name: 'None', percentage: 0 };

  return {
    totalProduction,
    topProduct,
    productionActivities,
    topPackaging,
    activityDistribution
  };
};

// Add this helper function at the top of the file
const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// Add base chart options
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      align: 'center',
      labels: {
        boxWidth: 10,
        padding: 20,
        color: '#4c5c68'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1f2937',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 10,
      displayColors: true
    }
  }
};

// Update chart options with smaller font sizes and date format
const chartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10
        },
        callback: function(value, index, values) {
          const date = new Date(value);
          return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit'
          });
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#E5E7EB'
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10
        }
      }
    }
  },
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      ...baseChartOptions.plugins.legend,
      labels: {
        ...baseChartOptions.plugins.legend.labels,
        font: {
          size: 11
        }
      }
    }
  }
};

// Import state management utilities
import { saveProductionFilters, loadProductionFilters, STORAGE_KEYS } from "@/lib/utils/stateManagement";

// Add this helper function at the top
const getPackagingForProduct = (productId, productMap) => {
  if (!productId || !productMap) return null;
  const product = productMap.get(productId);
  if (!product) return null;

  // Check if product is block ice - no packaging needed
  if (product.producttype === 'Block Ice') return null;

  // For cube ice and water bottling, find matching packaging
  return Array.from(productMap.values()).find(p => {
    const isPackaging = p.producttype?.toLowerCase().includes('packaging');
    const matchesActivity = p.activitytypeid === product.activitytypeid;
    const mainName = product.productid?.toLowerCase() || '';
    const packagingName = p.productid?.toLowerCase() || '';
    const mainSize = mainName.match(/\d+[,.]?\d*\s*(kg|l|ml)/i)?.[0]?.replace(' ', '') || '';
    const packagingSize = packagingName.match(/\d+[,.]?\d*\s*(kg|l|ml)/i)?.[0]?.replace(' ', '') || '';
    
    return isPackaging && matchesActivity && mainSize && mainSize === packagingSize;
  });
};

// Add these helpers after imports and before the main component
const getTranslatedProductName = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid || product.name || 'Unknown';
  try {
    // Try to find a translation key based on product type and name
    if (product.producttype) {
      const key = `products.types.${product.producttype.toLowerCase()}`;
      const translated = t(key);
      if (translated && translated !== key) {
        return String(translated);
      }
    }
    // Return the raw name if no translation found
    return String(name);
  } catch (error) {
    console.warn('Translation error for product:', name, error);
  }
  return String(name);
};
const getTranslatedActivityTypeName = (activityType, t) => {
  if (!activityType) return 'N/A';
  const name = activityType.name || activityType;
  if (!name) return 'N/A';
  const key = `products.activities.${name.toLowerCase().replace(/\s+/g, '_')}`;
  const translated = t(key);
  return String(translated && translated !== key ? translated : name);
};

// Add fallback translation for unknown and no packaging
const getFallback = (t, key = 'common.unknown') => String(t(key) || 'N/A');
const getNoPackaging = (t) => String(t('production.table.noPackagingRequired') || 'No packaging required');

// Helper for robust fallback rendering
const renderCellValue = (value, t, type = 'unknown') => {
  if (value === null || value === undefined || value === '') {
    return String(t(type === 'notAvailable' ? 'common.notAvailable' : 'common.unknown') || 'N/A');
  }
  if (typeof value === 'string' && value.trim().toLowerCase() === 'no packaging required') {
    return String(t('production.table.noPackagingRequired') || 'No packaging required');
  }
  // Ensure we always return a string
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// Add this function before the main component
const safeT = (t, key, fallback) => {
  try {
    const value = t(key);
    // Only return if it's a string or number, never an object
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    // If translation returns an object or undefined, use fallback
    return String(fallback || key);
  } catch (error) {
    console.warn(`Translation error for key "${key}":`, error);
    return String(fallback || key);
  }
};

export default function ProductionPage() {
  // 1. Context hooks
  const router = useRouter();
  const { t } = useTranslation();
  
  // 2. Data fetching hooks
  const { 
    products,
    activityTypes,
    productMap, 
    activityTypeMap, 
    loading: masterDataLoading,
    getProductsByType,
    getProductsByActivity
  } = useMasterData();

  const { 
    data: productions, 
    loading: productionsLoading 
  } = useFirestoreCollection("Production");

  // CRITICAL FIX: Stable date references to prevent hydration mismatches
  const stableNow = useMemo(() => new Date(), []);
  const stableCurrentYear = useMemo(() => stableNow.getFullYear(), [stableNow]);
  const stableCurrentMonth = useMemo(() => stableNow.getMonth(), [stableNow]);

  // 3. State hooks - group all useState calls together
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Consolidated filter state
  const [filters, setFilters] = useState(() => {
    const savedFilters = loadProductionFilters();
    return {
      selectedActivityType: savedFilters.selectedActivityType || '',
      selectedProduct: savedFilters.selectedProduct || '',
      selectedTimePeriod: TIME_PERIODS.MONTH,
      dateFilters: savedFilters.dateFilters || getCurrentDateFilters(),
      selectedMonth: savedFilters.selectedMonth || '',
      selectedStatus: savedFilters.selectedStatus || ''
    };
  });

  // Destructure dateFilters, selectedTimePeriod, selectedMonth, selectedActivityType, selectedProduct, and selectedStatus from filters
  const { selectedTimePeriod, dateFilters, selectedMonth, selectedActivityType, selectedProduct, selectedStatus } = filters;

  // Selection states
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Data states
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [productionSummary, setProductionSummary] = useState({
    blockIce: { total: 0, products: [] },
    cubeIce: { total: 0, products: [] },
    bottles: { total: 0, products: [] }
  });

  // Add editing state
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // Add sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Summary section state (independent of table filters)
  const [summaryMonth, setSummaryMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('summary_selectedMonth');
      return saved !== null ? Number(saved) : stableCurrentMonth + 1;
    }
    return stableCurrentMonth + 1;
  });
  const [summaryYear, setSummaryYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('summary_selectedYear');
      return saved !== null ? Number(saved) : stableCurrentYear;
    }
    return stableCurrentYear;
  });

  // Chart view mode state
  const [chartViewMode, setChartViewMode] = useState('individual'); // 'individual' or 'grouped'

  // 4. Memoized values - group all useMemo calls together
  const filterMaps = useMemo(() => {
    if (!productions || !productMap || !activityTypeMap) return null;

    const dateMap = new Map();
    const productTypeMap = new Map();
    const activityNameMap = new Map();

    productions.forEach(prod => {
      // Date mapping
      if (prod.date) {
        try {
          dateMap.set(prod.id, prod.date.toDate ? prod.date.toDate() : new Date(prod.date));
        } catch (err) {
          console.error('Error parsing date for production:', prod.id);
        }
      }

      // Product type mapping
      const product = productMap.get(prod.productId);
      if (product) {
        productTypeMap.set(prod.id, product.producttype);
      }

      // Activity type mapping
      const activity = activityTypeMap.get(prod.activityTypeId);
      if (activity) {
        activityNameMap.set(prod.id, activity.name);
      }
    });

    return { dateMap, productTypeMap, activityNameMap };
  }, [productions, productMap, activityTypeMap]);

  // Memoize activity types for select options
  const memoizedActivityTypes = useMemo(() => {
    // Create a Map to ensure unique activity types by ID
    const uniqueActivityTypes = new Map();
    
    Array.from(activityTypeMap.values())
      .forEach(type => {
        // Only add if not already in map (prevents duplicates)
        if (!uniqueActivityTypes.has(type.id)) {
          uniqueActivityTypes.set(type.id, {
            id: type.id,
            name: type.name || type.activityid || 'Unknown Activity'
          });
        }
      });

    // Convert back to array and sort
    return Array.from(uniqueActivityTypes.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [activityTypeMap]);

  // Memoize products for select options
  const memoizedProducts = useMemo(() => {
    // Create a Map to ensure unique products by ID
    const uniqueProducts = new Map();
    
    Array.from(productMap.values())
      .filter(p => !p.producttype?.toLowerCase().includes('packaging'))
      .forEach(product => {
        // Only add if not already in map (prevents duplicates)
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, {
            id: product.id,
            name: product.productid || product.name || 'Unknown Product'
          });
        }
      });

    // Convert back to array and sort
    return Array.from(uniqueProducts.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [productMap]);

  // Memoize packaging products for select options
  const memoizedPackagingProducts = useMemo(() => {
    // Create a Map to ensure unique packaging products by ID
    const uniquePackaging = new Map();
    
    Array.from(productMap.values())
      .filter(p => p.producttype?.toLowerCase().includes('packaging'))
      .forEach(product => {
        // Only add if not already in map (prevents duplicates)
        if (!uniquePackaging.has(product.id)) {
          uniquePackaging.set(product.id, product);
        }
      });

    // Convert back to array and sort
    return Array.from(uniquePackaging.values())
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
  }, [productMap]);

  // Update the filteredProducts definition to prevent duplicates
  const filteredProducts = useMemo(() => {
    // Create a Map to ensure uniqueness by ID
    const uniqueProducts = new Map();
    
    Array.from(productMap.values())
      .filter(product => 
        product && 
        typeof product.producttype === 'string' && 
        !product.producttype.toLowerCase().includes('packaging')
      )
      .forEach(product => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });

    return Array.from(uniqueProducts.values())
      .sort((a, b) => {
        const aName = a.productid || a.name || '';
        const bName = b.productid || b.name || '';
        return aName.localeCompare(bName);
      });
  }, [productMap]);

  // Memoize filtered production data
  const filteredProductionData = useMemo(() => {
    if (!productions || !filterMaps) return [];
    
    const { dateMap } = filterMaps;
    
    return productions.filter(prod => {
      // Skip if no date
      if (!prod.date) return false;
      
      const date = prod.date.toDate ? prod.date.toDate() : new Date(prod.date);
      
      // Time period filter
      let matchesTimePeriod = true;
      switch (selectedTimePeriod) {
        case TIME_PERIODS.YEAR:
          matchesTimePeriod = date.getFullYear() === dateFilters.year;
          break;
        case TIME_PERIODS.MONTH:
          if (filters.selectedMonth) {
            matchesTimePeriod = date.getMonth() === (parseInt(filters.selectedMonth) - 1) &&
                               date.getFullYear() === dateFilters.year;
          } else {
            // When no specific month is selected (allMonths), show all months for the year
            matchesTimePeriod = date.getFullYear() === dateFilters.year;
          }
          break;
        case TIME_PERIODS.WEEK: {
          const firstDayOfMonth = new Date(dateFilters.year, dateFilters.month, 1);
          const weekOffset = firstDayOfMonth.getDay();
          const weekStart = new Date(dateFilters.year, dateFilters.month, 
            (dateFilters.week - 1) * 7 + 1 - weekOffset);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchesTimePeriod = date >= weekStart && date <= weekEnd;
          break;
        }
        case TIME_PERIODS.CUSTOM:
          if (dateFilters.startDate && dateFilters.endDate) {
            const startDate = new Date(dateFilters.startDate);
            const endDate = new Date(dateFilters.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            matchesTimePeriod = date >= startDate && date <= endDate;
          }
          break;
      }

      if (!matchesTimePeriod) return false;

      // Activity type filter
      if (filters.selectedActivityType && prod.activityTypeId !== filters.selectedActivityType) {
        return false;
      }

      // Product filter
      if (filters.selectedProduct && prod.productId !== filters.selectedProduct) {
        return false;
      }

      return true;
    });
  }, [productions, filterMaps, filters]);

  // Filter productions for summary/charts by summary selectors
  const summaryFilteredProductions = useMemo(() => {
    if (!productions) return [];
    return productions.filter(prod => {
      const date = prod.date?.toDate ? prod.date.toDate() : new Date(prod.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return month === summaryMonth && year === summaryYear;
    });
  }, [productions, summaryMonth, summaryYear]);

  // Add the memoized chart data
  const chartDataMemo = useMemo(() => {
    if (!summaryFilteredProductions?.length) {
      return {
        productChart: null,
        activityChart: null
      };
    }

    // Group data by product and activity
    const productData = new Map();
    const activityData = new Map();

    summaryFilteredProductions.forEach(prod => {
      // Product data - handle both individual and grouped modes
      let dataKey;
      if (chartViewMode === 'grouped') {
        // Group by product type
        let foundProduct = productMap.get(prod.productId);
        if (!foundProduct) {
          foundProduct = Array.from(productMap.values()).find(p => p.id?.trim() === prod.productId?.trim());
        }
        const productType = foundProduct?.producttype || 'Unknown';
        // Translate product type safely
        if (productType === 'Block Ice') {
          dataKey = safeT(t, 'products.types.blockIce', 'Block Ice');
        } else if (productType === 'Cube Ice') {
          dataKey = safeT(t, 'products.types.cubeIce', 'Cube Ice');
        } else if (productType === 'Water Bottling') {
          dataKey = safeT(t, 'products.types.waterBottling', 'Water Bottling');
        } else {
          dataKey = productType;
        }
      } else {
        // Individual product mode
        let foundProduct = productMap.get(prod.productId);
        if (!foundProduct) {
          foundProduct = Array.from(productMap.values()).find(p => p.id?.trim() === prod.productId?.trim());
        }
        dataKey = getTranslatedProductName(foundProduct, t) || foundProduct?.productid || 'Unknown';
      }
      
      const currentProductData = productData.get(dataKey) || 0;
      productData.set(dataKey, currentProductData + (prod.quantityProduced || 0));

      // Activity data
      const activityName = getTranslatedActivityTypeName(activityTypeMap.get(prod.activityTypeId), t) || 'Unknown';
      const currentActivityData = activityData.get(activityName) || 0;
      activityData.set(activityName, currentActivityData + (prod.quantityProduced || 0));
    });

    // Convert to chart series format - with safe translation handling
    const safeQuantityText = safeT(t, 'production.charts.quantityProduced', 'Quantity Produced');
    const safeUnitsText = safeT(t, 'production.charts.units', 'units');
    
    const productSeries = [{
      name: safeQuantityText,
      data: Array.from(productData.values())
    }];

    const activitySeries = [{
      name: safeQuantityText,
      data: Array.from(activityData.values())
    }];

    return {
      productChart: {
        options: {
          chart: {
            type: 'bar',
            toolbar: {
              show: false
            },
            height: 350
          },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: '55%',
              endingShape: 'rounded',
              borderRadius: 4,
              distributed: true
            }
          },
          dataLabels: {
            enabled: true,
            formatter: function (val) {
              return val.toLocaleString()
            },
            style: {
              fontSize: '12px',
              colors: ['#fff']
            }
          },
          stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
          },
          xaxis: {
            categories: Array.from(productData.keys()),
            labels: {
              style: {
                colors: '#64748b',
                fontSize: '12px'
              },
              rotate: -45,
              rotateAlways: true
            }
          },
          yaxis: {
            title: {
              text: safeQuantityText,
              style: {
                color: '#64748b'
              }
            },
            labels: {
              style: {
                colors: '#64748b'
              },
              formatter: function (val) {
                return val.toLocaleString()
              }
            }
          },
          fill: {
            opacity: 1,
            type: 'gradient',
            gradient: {
              shade: 'light',
              type: "vertical",
              shadeIntensity: 0.25,
              gradientToColors: undefined,
              inverseColors: true,
              opacityFrom: 0.85,
              opacityTo: 0.85,
              stops: [50, 100]
            }
          },
          tooltip: {
            y: {
              formatter: function (val) {
                return val.toLocaleString() + ' ' + safeUnitsText;
              }
            }
          },
          legend: {
            position: 'top',
            horizontalAlign: 'right',
            floating: true,
            offsetY: -25,
            offsetX: -5
          },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        },
        series: productSeries
      },
      activityChart: {
        options: {
          chart: {
            type: 'bar',
            toolbar: {
              show: false
            },
            height: 350
          },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: '55%',
              endingShape: 'rounded',
              borderRadius: 4,
              distributed: true
            }
          },
          dataLabels: {
            enabled: true,
            formatter: function (val) {
              return val.toLocaleString()
            },
            style: {
              fontSize: '12px',
              colors: ['#fff']
            }
          },
          stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
          },
          xaxis: {
            categories: Array.from(activityData.keys()),
            labels: {
              style: {
                colors: '#64748b',
                fontSize: '12px'
              },
              rotate: -45,
              rotateAlways: true
            }
          },
          yaxis: {
            title: {
              text: safeQuantityText,
              style: {
                color: '#64748b'
              }
            },
            labels: {
              style: {
                colors: '#64748b'
              },
              formatter: function (val) {
                return val.toLocaleString()
              }
            }
          },
          fill: {
            opacity: 1,
            type: 'gradient',
            gradient: {
              shade: 'light',
              type: "vertical",
              shadeIntensity: 0.25,
              gradientToColors: undefined,
              inverseColors: true,
              opacityFrom: 0.85,
              opacityTo: 0.85,
              stops: [50, 100]
            }
          },
          tooltip: {
            y: {
              formatter: function (val) {
                return val.toLocaleString() + ' ' + safeUnitsText;
              }
            }
          },
          legend: {
            position: 'top',
            horizontalAlign: 'right',
            floating: true,
            offsetY: -25,
            offsetX: -5
          },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        },
        series: activitySeries
      }
    };
  }, [summaryFilteredProductions, productMap, activityTypeMap, t, chartViewMode]);

  // Memoize pagination data
  const paginationData = useMemo(() => {
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredProductions.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredProductions.length / entriesPerPage);

    return {
      indexOfLastEntry,
      indexOfFirstEntry,
      currentEntries,
      totalPages
    };
  }, [currentPage, entriesPerPage, filteredProductions]);

  // 5. Callbacks - group all useCallback calls together
  const handleFilterChange = useCallback((type, value) => {
    switch (type) {
      case 'activityType':
        setFilters(prev => ({ ...prev, selectedActivityType: value }));
        break;
      case 'product':
        setFilters(prev => ({ ...prev, selectedProduct: value }));
        break;
      case 'timePeriod':
        setFilters(prev => ({ ...prev, selectedTimePeriod: value }));
        break;
      case 'dateFilters':
        setFilters(prev => ({ ...prev, ...value }));
        break;
      case 'month':
        setFilters(prev => ({ ...prev, selectedMonth: value }));
        break;
    }
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteDoc(doc(firestore, "Production", id));
      router.refresh();
    } catch (err) {
      console.error("Error deleting production record:", err);
    }
  }, [router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Create a new batch
      const batch = writeBatch(firestore);
      
      // Add delete operations to batch
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Production", id);
        batch.delete(docRef);
      });
      
      // Commit the batch
      await batch.commit();
      
      // Reset selection state
      setSelectedItems([]);
      setSelectAll(false);
      
      // Refresh the page
      router.refresh();
    } catch (err) {
      console.error("Error bulk deleting production records:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, router]);

  // Add editing functions
  const startEditing = (production) => {
    setEditingId(production.id);
    setEditingData({
      date: production.date ? new Date(production.date.seconds * 1000).toISOString().split('T')[0] : '',
      productId: production.productId || '',
      productName: production.productName || '',
      quantityProduced: production.quantityProduced || '',
      activityTypeId: production.activityTypeId || '',
      activityTypeName: production.activityTypeName || '',
      packagingName: production.packagingName || '',
      packagingQuantity: production.packagingQuantity || '',
      status: production.status || 'completed'
    });
  };

  const saveEditing = async () => {
    if (!editingId || !editingData) return;

    try {
      const docRef = doc(firestore, "Production", editingId);
      await updateDoc(docRef, {
        ...editingData,
        date: new Date(editingData.date),
        quantityProduced: Number(editingData.quantityProduced),
        packagingQuantity: Number(editingData.packagingQuantity),
        modifiedAt: serverTimestamp()
      });
      
      setEditingId(null);
      setEditingData({});
      router.refresh();
    } catch (err) {
      console.error("Error updating production:", err);
      setError("Failed to update production");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  // Update mass edit function with proper functionality
  const handleMassEdit = async () => {
    if (selectedItems.length === 0) return;
    
    const updates = {
      date: editingData.date,
      activityTypeId: editingData.activityTypeId,
      activityTypeName: editingData.activityTypeName,
      productId: editingData.productId,
      productName: editingData.productName,
      quantityProduced: editingData.quantityProduced,
      packagingName: editingData.packagingName,
      packagingQuantity: editingData.packagingQuantity,
      modifiedAt: serverTimestamp()
    };
    
    try {
      const batch = writeBatch(firestore);
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Production", id);
        batch.update(docRef, updates);
      });
      
      await batch.commit();
      setSelectedItems([]);
      setEditingData({});
      router.refresh();
    } catch (error) {
      console.error("Error updating items:", error);
    }
  };

  // Add sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Add sorted data computation
  const sortedData = useMemo(() => {
    if (!paginationData.currentEntries) return [];
    
    return [...paginationData.currentEntries].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle date sorting
      if (sortField === 'date') {
        aValue = new Date(a.date?.seconds * 1000);
        bValue = new Date(b.date?.seconds * 1000);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [paginationData.currentEntries, sortField, sortDirection]);

  // 6. Effects - group all useEffect calls together
  useEffect(() => {
    setMounted(true);
  }, []);

  // Combine loading states into a single effect
  useEffect(() => {
    setIsLoading(productionsLoading || masterDataLoading);
  }, [productionsLoading, masterDataLoading]);

  useEffect(() => {
    if (!productionsLoading && productions?.length) {
      console.log("Production data loaded successfully");
    }
  }, [productionsLoading, productions]);

  useEffect(() => {
    setFilteredProductions(filteredProductionData);
  }, [filteredProductionData]);

  useEffect(() => {
    if (selectAll) {
      setSelectedItems(paginationData.currentEntries.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  }, [selectAll, paginationData.currentEntries]);

  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
  }, [currentPage]);

  // Update the top cards calculation to use summary data
  const topCardsData = useMemo(() => {
    return calculateTopCards(summaryFilteredProductions);
  }, [summaryFilteredProductions]);

  // Update the summary data calculation with null checks
  const summaryData = useMemo(() => {
    if (!summaryFilteredProductions || !Array.isArray(summaryFilteredProductions)) {
      return [];
    }

    // Calculate grand total first
    const grandTotal = summaryFilteredProductions.reduce((sum, prod) => 
      sum + (Number(prod.quantityProduced) || 0), 0
    );

    // Group productions by activity type ID to avoid duplicates
    const summary = summaryFilteredProductions.reduce((acc, prod) => {
      if (!prod) return acc;

      // Use activity type ID as key to prevent duplicates
      const activityTypeId = prod.activityTypeId || 'unknown';
      const activityTypeObj = activityTypeMap.get(activityTypeId);
      const activityTypeName = activityTypeObj?.name || prod.activityTypeName || 'Unknown Activity';
      
      const quantity = Number(prod.quantityProduced) || 0;
      const productId = prod.productId || 'unknown';
      
      if (!acc[activityTypeId]) {
        acc[activityTypeId] = {
          name: activityTypeName,
          total: 0,
          products: {}
        };
      }
      acc[activityTypeId].total += quantity;
      if (!acc[activityTypeId].products[productId]) {
        acc[activityTypeId].products[productId] = 0;
      }
      acc[activityTypeId].products[productId] += quantity;
      
      return acc;
    }, {});

    // Convert to final format with proper percentage calculations
    return Object.entries(summary || {})
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([activityTypeId, data]) => {
        // Calculate activity type percentage of grand total
        const activityPercentage = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;

        // Sort products by translated name first, then by quantity
        const sortedProducts = Object.entries(data.products || {})
          .map(([productId, quantity]) => {
            // Get product name for sorting
            let foundProduct = productMap.get(productId);
            if (!foundProduct) {
              foundProduct = Array.from(productMap.values()).find(p => p.id?.trim() === productId?.trim());
            }
            const productName = getTranslatedProductName(foundProduct, t) || foundProduct?.productid || productId;
            
            return {
              productId,
              quantity,
              productName,
              percentage: data.total > 0 ? (quantity / data.total) * 100 : 0
            };
          })
          .sort((a, b) => {
            // Sort by product name alphabetically, then by quantity descending
            const nameCompare = a.productName.localeCompare(b.productName);
            return nameCompare !== 0 ? nameCompare : b.quantity - a.quantity;
          });

        return {
          activityTypeId,
          activityType: data.name,
          total: data.total,
          percentage: activityPercentage,
          products: sortedProducts
        };
      });
  }, [summaryFilteredProductions, activityTypeMap, productMap, t]);

  // Save filters whenever they change
  useEffect(() => {
    saveProductionFilters({
      PRODUCTION_TIME_PERIOD: filters.selectedTimePeriod,
      PRODUCTION_DATE_FILTERS: filters.dateFilters,
      PRODUCTION_ACTIVITY_TYPE: filters.selectedActivityType,
      PRODUCTION_PRODUCT: filters.selectedProduct,
      PRODUCTION_STATUS: filters.selectedStatus,
      PRODUCTION_MONTH: filters.selectedMonth
    });
  }, [
    filters.selectedTimePeriod,
    filters.dateFilters,
    filters.selectedActivityType,
    filters.selectedProduct,
    filters.selectedStatus,
    filters.selectedMonth
  ]);

  // Compute available years for the records filter bar (from production data)
  const availableRecordYears = useMemo(() => {
    if (!productions) return [];
    const yearsSet = new Set();
    productions.forEach(prod => {
      const date = prod.date?.toDate ? prod.date.toDate() : new Date(prod.date);
      yearsSet.add(date.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [productions]);

  // Persist summary selectors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('summary_selectedMonth', summaryMonth.toString());
      localStorage.setItem('summary_selectedYear', summaryYear.toString());
    }
  }, [summaryMonth, summaryYear]);

  // Early returns - after all hooks
  if (!mounted) return null;
  if (isLoading) return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">{String(t('production.loading.data'))}</p>
        </div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-800">{error}</p>
        <Button
          color="failure"
          size="sm"
          onClick={handleRefresh}
          className="mt-2"
        >
          <HiRefresh className="mr-2 h-4 w-4" />
                      {String(t('common.refresh'))}
        </Button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4 md:p-8 font-inter">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-red-900">{String(t('production.overview'))}</h1>
        
        {/* Replace the old time period selector with the new component */}
        <ClientOnly>
          <TimePeriodSelector
            selectedPeriod={filters.selectedTimePeriod}
            onPeriodChange={setFilters}
            startDate={filters.dateFilters.startDate}
            endDate={filters.dateFilters.endDate}
            onDateRangeChange={(start, end) => {
              setFilters(prev => ({
                ...prev,
                dateFilters: {
                  ...prev.dateFilters,
                  startDate: start,
                  endDate: end
                }
              }));
            }}
            className="text-red-900"
          />
        </ClientOnly>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <TopCard 
          title={safeT(t, 'production.metrics.totalProduction', 'Total Production')} 
          value={String(`${(topCardsData?.totalProduction?.month || 0).toLocaleString()} ${safeT(t, 'production.metrics.units', 'units')}`)}
          subValue={String(`${safeT(t, 'common.today', 'Today')}: ${(topCardsData?.totalProduction?.today || 0).toLocaleString()}`)}
          icon={<HiCube size={16} />}
          type="Total Production"
        />
        <TopCard 
          title={safeT(t, 'production.metrics.topProduct', 'Top Product')} 
          value={String(topCardsData?.topProduct?.name || 'N/A')}
          subValue={String(`${(topCardsData?.topProduct?.quantity || 0).toLocaleString()} ${safeT(t, 'production.metrics.units', 'units')}`)}
          icon={<HiTrendingUp size={16} />}
          type="Production Rate"
        />
        <TopCard 
          title={safeT(t, 'production.metrics.productionActivities', 'Production Activities')} 
          value={String(`${topCardsData?.productionActivities?.week || 0} ${safeT(t, 'production.metrics.entries', 'entries')}`)}
          subValue={String(`${safeT(t, 'common.today', 'Today')}: ${topCardsData?.productionActivities?.today || 0}`)}
          icon={<HiClipboardList size={16} />}
          type="Efficiency"
        />
        <TopCard 
          title={safeT(t, 'production.metrics.mostUsedPackaging', 'Most Used Packaging')} 
          value={String(topCardsData?.topPackaging?.name || 'N/A')}
          subValue={String(`${(topCardsData?.topPackaging?.quantity || 0).toLocaleString()} ${safeT(t, 'production.metrics.used', 'used')}`)}
          icon={<HiArchive size={16} />}
          type="Stock Level"
        />
        <TopCard 
          title={safeT(t, 'production.metrics.activityDistribution', 'Activity Distribution')} 
          value={String(getTranslatedActivityTypeName({ name: topCardsData?.activityDistribution?.name || 'None' }, t) || 'N/A')}
          subValue={String(`${(topCardsData?.activityDistribution?.percentage || 0).toFixed(1)}% ${safeT(t, 'production.metrics.ofTotal', 'of total')}`)}
          icon={<HiFilter size={16} />}
          type="Production Rate"
        />
      </div>

      {/* Production Records Section */}
      <Card className="mb-6 bg-white border border-red-300 shadow-xl rounded-2xl overflow-hidden">
        {/* Enhanced Header with Actions and Filters */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 rounded-t-2xl">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-2">{t('production.records')}</h2>
                <p className="text-sm text-red-600">{t('production.description')}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <Button
                    color="failure"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(t('common.deleteConfirm'))) {
                        handleBulkDelete();
                      }
                    }}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 shadow-sm text-white"
                  >
                    <HiTrash className="mr-2 h-4 w-4" />
                    {t('common.delete')} ({selectedItems.length})
                  </Button>
                )}
                <Button
                  color="gray"
                  size="sm"
                  onClick={handleRefresh}
                  className="bg-white text-red-600 hover:bg-red-50 border border-red-200 shadow-sm"
                >
                  <HiRefresh className="h-4 w-4" />
                </Button>
                <Link href="/dashboard/production/add">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                    <HiPlus className="h-4 w-4" />
                    
                  </Button>
                </Link>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-2">
              <div className="w-full">
                <Label htmlFor="yearSelect">{t('production.fields.year') || 'Year'}</Label>
                <Select
                  id="yearSelect"
                  value={dateFilters.year || ''}
                  onChange={e => {
                    const newYear = parseInt(e.target.value, 10);
                    setFilters(prev => ({
                      ...prev,
                      dateFilters: {
                        ...prev.dateFilters,
                        year: newYear,
                        month: prev.selectedMonth ? parseInt(prev.selectedMonth, 10) - 1 : new Date().getMonth()
                      }
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full"
                  disabled={selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{t('production.filters.allYears') || 'All Years'}</option>
                  {availableRecordYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
              <div className="w-full">
                <Label htmlFor="monthSelect">{t('production.fields.month') || 'Month'}</Label>
                <Select
                  id="monthSelect"
                  value={selectedMonth || ''}
                  onChange={e => {
                    const newMonth = e.target.value;
                    setFilters(prev => ({
                      ...prev,
                      selectedMonth: newMonth,
                      dateFilters: {
                        ...prev.dateFilters,
                        month: newMonth ? parseInt(newMonth, 10) - 1 : new Date().getMonth(),
                        year: prev.dateFilters.year
                      }
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full"
                  disabled={selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{safeT(t, 'production.filters.allMonths', 'All Months')}</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                    const translationKey = `months.${monthName.toLowerCase()}`;
                    const translatedMonth = safeT(t, translationKey, monthName);
                    return (
                      <option key={i + 1} value={i + 1}>
                        {translatedMonth}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div className="w-full">
                <Label htmlFor="activityType">{t('production.filters.activityType')}</Label>
                <Select
                  id="activityType"
                  value={selectedActivityType}
                  onChange={e => setFilters(prev => ({ ...prev, selectedActivityType: e.target.value }))}
                  className="mt-1 w-full"
                >
                  <option value="">{t('production.filters.allActivityTypes')}</option>
                  {activityTypes?.map(type => (
                    <option key={type.id} value={type.id}>
                                                  {String(getTranslatedActivityTypeName(type, t) || type.name || 'Unknown Activity')}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full">
                <Label htmlFor="product">{t('production.filters.product')}</Label>
                <Select
                  id="product"
                  value={selectedProduct}
                  onChange={e => setFilters(prev => ({ ...prev, selectedProduct: e.target.value }))}
                  className="mt-1 w-full"
                >
                  <option value="">{t('production.filters.allProducts')}</option>
                  {filteredProducts
                    .sort((a, b) => (a.productid || a.name || '').localeCompare(b.productid || b.name || ''))
                    .map(product => (
                      <option key={product.id} value={product.id}>
                                                    {String(getTranslatedProductName(product, t) || 'Unknown Product')}
                      </option>
                    ))}
                </Select>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.selectedTimePeriod === TIME_PERIODS.CUSTOM && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate" className="text-red-900 font-medium mb-1.5 block">
                    {t('common.startDate')}
                  </Label>
                  <TextInput
                    type="date"
                    id="startDate"
                    value={filters.dateFilters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFilters: { ...prev.dateFilters, startDate: e.target.value } }))}
                    className="w-full bg-white border-red-200 text-gray-900 focus:ring-red-500 focus:border-red-500 rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-red-900 font-medium mb-1.5 block">
                    {t('common.endDate')}
                  </Label>
                  <TextInput
                    type="date"
                    id="endDate"
                    value={filters.dateFilters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFilters: { ...prev.dateFilters, endDate: e.target.value } }))}
                    className="w-full bg-white border-red-200 text-gray-900 focus:ring-red-500 focus:border-red-500 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add mass edit button right after the filters */}
        <div className="flex justify-between items-center mb-4">
          {selectedItems.length > 0 && (
            <Button
              size="sm"
              onClick={handleMassEdit}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              <HiPencil className="mr-2 h-4 w-4" />
              Edit Selected ({selectedItems.length})
            </Button>
          )}
        </div>

        {/* Table Section */}
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900 rounded-xl overflow-hidden">
              <thead className="bg-red-50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-4">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => {
                        setSelectAll(!selectAll);
                        if (!selectAll) {
                          setSelectedItems(paginationData.currentEntries.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-red-900 cursor-pointer hover:bg-red-100"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      {t('production.table.date')}
                      {sortField === 'date' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-red-900 cursor-pointer hover:bg-red-100"
                    onClick={() => handleSort('activityTypeName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('production.table.activity')}
                      {sortField === 'activityTypeName' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-red-900 cursor-pointer hover:bg-red-100"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center gap-1">
{t('production.table.productAndQuantity')}
                      {sortField === 'productName' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-red-900">{t('production.table.packaging')}</th>
                  <th 
                    className="px-6 py-4 font-semibold text-red-900 cursor-pointer hover:bg-red-100"
                    onClick={() => handleSort('packagingQuantity')}
                  >
                    <div className="flex items-center gap-1">
                      {t('production.table.packagingQuantity')}
                      {sortField === 'packagingQuantity' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-red-900">{t('production.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {sortedData.map(production => (
                  <tr key={production.id} className="bg-white hover:bg-red-50/50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(production.id)}
                        onChange={() => {
                          if (selectedItems.includes(production.id)) {
                            setSelectedItems(prev => prev.filter(item => item !== production.id));
                          } else {
                            setSelectedItems(prev => [...prev, production.id]);
                          }
                        }}
                        className="rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4c5c68] font-semibold">
                      {editingId === production.id ? (
                        <TextInput
                          type="date"
                          value={editingData.date}
                          onChange={e => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full"
                        />
                                              ) : (
                          String(formatDate(production.date))
                        )}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {editingId === production.id ? (
                        <Select
                          value={editingData.activityTypeId}
                          onChange={e => setEditingData(prev => ({ ...prev, activityTypeId: e.target.value }))}
                        >
                          <option value="">{t('production.filters.allActivityTypes')}</option>
                          {memoizedActivityTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {String(getTranslatedActivityTypeName(type, t) || type.name || 'Unknown Activity')}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${(() => {
                          const activityName = (activityTypeMap.get(production.activityTypeId)?.name || '').toLowerCase();
                          if (activityName.includes('block') || activityName.includes('bloc')) return 'bg-purple-100 text-purple-800 border border-purple-200';
                          if (activityName.includes('cube') || activityName.includes('glaçon')) return 'bg-blue-100 text-blue-800 border border-blue-200';
                          if (activityName.includes('bottling') || activityName.includes('bouteille')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                          if (activityName.includes('bidon') || activityName.includes('water can')) return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
                          return 'bg-gray-100 text-gray-800 border border-gray-200';
                        })()}`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${(() => {
                            const activityName = (activityTypeMap.get(production.activityTypeId)?.name || '').toLowerCase();
                            if (activityName.includes('block') || activityName.includes('bloc')) return 'bg-purple-500';
                            if (activityName.includes('cube') || activityName.includes('glaçon')) return 'bg-blue-500';
                            if (activityName.includes('bottling') || activityName.includes('bouteille')) return 'bg-emerald-500';
                            if (activityName.includes('bidon') || activityName.includes('water can')) return 'bg-cyan-500';
                            return 'bg-gray-500';
                          })()}`}></span>
                          {String(getTranslatedActivityTypeName(activityTypeMap.get(production.activityTypeId), t) || getFallback(t))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {editingId === production.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={editingData.productId}
                            onChange={e => setEditingData(prev => ({ ...prev, productId: e.target.value }))}
                          >
                            <option value="">{t('production.filters.allProducts')}</option>
                            {memoizedProducts.map(product => (
                              <option key={product.id} value={product.id}>
                                {String(getTranslatedProductName(productMap.get(product.id), t) || 'Unknown Product')}
                              </option>
                            ))}
                          </Select>
                          <TextInput
                            type="number"
                            value={editingData.quantityProduced}
                            onChange={e => setEditingData(prev => ({ ...prev, quantityProduced: e.target.value }))}
                            className="w-24"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${(() => {
                            const product = productMap.get(production.productId);
                            const productType = (product?.producttype || '').toLowerCase();
                            const productName = (product?.productid || '').toLowerCase();
                            
                            // Product type-based colors (different from activity colors)
                            if (productType.includes('block') || productName.includes('block') || productName.includes('bloc')) return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
                            if (productType.includes('cube') || productName.includes('cube') || productName.includes('glaçon')) return 'bg-sky-100 text-sky-800 border border-sky-200';
                            if (productType.includes('bottle') || productType.includes('bouteille') || productName.includes('bouteille')) return 'bg-teal-100 text-teal-800 border border-teal-200';
                            if (productType.includes('bidon') || productType.includes('water can') || productName.includes('bidon')) return 'bg-orange-100 text-orange-800 border border-orange-200';
                            if (productType.includes('packaging') || productType.includes('emballage') || productName.includes('emballage')) return 'bg-amber-100 text-amber-800 border border-amber-200';
                            return 'bg-slate-100 text-slate-800 border border-slate-200';
                          })()}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${(() => {
                              const product = productMap.get(production.productId);
                              const productType = (product?.producttype || '').toLowerCase();
                              const productName = (product?.productid || '').toLowerCase();
                              
                              if (productType.includes('block') || productName.includes('block') || productName.includes('bloc')) return 'bg-indigo-500';
                              if (productType.includes('cube') || productName.includes('cube') || productName.includes('glaçon')) return 'bg-sky-500';
                              if (productType.includes('bottle') || productType.includes('bouteille') || productName.includes('bouteille')) return 'bg-teal-500';
                              if (productType.includes('bidon') || productType.includes('water can') || productName.includes('bidon')) return 'bg-orange-500';
                              if (productType.includes('packaging') || productType.includes('emballage') || productName.includes('emballage')) return 'bg-amber-500';
                              return 'bg-slate-500';
                            })()}`}></span>
                            {String(getTranslatedProductName(productMap.get(production.productId), t) || getFallback(t))}
                          </div>
                                                      <span className="font-mono font-semibold text-gray-700">{String(production.quantityProduced ?? getFallback(t))}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#4c5c68] font-semibold">
                      {editingId === production.id ? (
                        <Select
                          value={editingData.packagingName}
                          onChange={e => setEditingData(prev => ({ ...prev, packagingName: e.target.value }))}
                        >
                          <option value="">{getNoPackaging(t)}</option>
                          {memoizedPackagingProducts.map(p => (
                            <option key={p.id} value={p.productid}>
                              {String(getTranslatedProductName(p, t) || p?.productid || 'Unknown Product')}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        (() => {
                          if (!production.packagingName) {
                            return getNoPackaging(t);
                          }
                          // Find packaging product by name to get translated name
                          const packagingProduct = memoizedPackagingProducts.find(p => p.productid === production.packagingName);
                          return packagingProduct ? getTranslatedProductName(packagingProduct, t) : production.packagingName;
                        })()
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {editingId === production.id ? (
                        <TextInput
                          type="number"
                          value={editingData.packagingQuantity}
                          onChange={e => setEditingData(prev => ({ ...prev, packagingQuantity: e.target.value }))}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-mono text-[#4c5c68] font-semibold">
                          {String(production.packagingQuantity) || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === production.id ? (
                        <div className="flex gap-2">
                          <Button
                            color="success"
                            size="xs"
                            onClick={saveEditing}
                            className="bg-green-600 hover:bg-green-700 shadow-sm"
                          >
                            <HiCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            color="failure"
                            size="xs"
                            onClick={cancelEditing}
                            className="bg-red-600 hover:bg-red-700 shadow-sm"
                          >
                            <HiX className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            color="info"
                            size="xs"
                            onClick={() => startEditing(production)}
                            className="bg-red-100 text-red-600 hover:bg-red-200 shadow-sm"
                          >
                            <HiPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() => handleDelete(production.id)}
                            className="bg-red-600 hover:bg-red-700 shadow-sm"
                          >
                            <HiTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {filteredProductions.length > entriesPerPage && (
            <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-red-100">
              <span className="text-sm text-red-700">
                {String(t('table.showing'))} {paginationData.indexOfFirstEntry + 1} {String(t('table.to'))} {Math.min(paginationData.indexOfLastEntry, filteredProductions.length)} {String(t('table.of'))} {filteredProductions.length} {String(t('table.entries'))}
              </span>
              <div className="flex gap-2">
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 shadow-sm transition-colors duration-200"
                >
                                      {String(t('common.previous'))}
                </Button>
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages))}
                  disabled={currentPage === paginationData.totalPages}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 shadow-sm transition-colors duration-200"
                >
                                      {String(t('common.next'))}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Trend Charts and Summary Table Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Production Summary Table - Left Side */}
        <div className="col-span-5">
          <Card className="border border-red-200 rounded-lg bg-white h-full">
            <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-semibold text-red-900 rounded-t-2xl">{safeT(t, 'production.summary.title', 'Production Summary')}</h3>
              <div className="flex gap-2">
                <Select
                  id="summaryYear"
                  value={summaryYear}
                  onChange={e => setSummaryYear(Number(e.target.value))}
                  className="w-28 text-xs text-[#4c5c68] font-semibold"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
                <Select
                  id="summaryMonth"
                  value={summaryMonth}
                  onChange={e => setSummaryMonth(Number(e.target.value))}
                  className="w-32 text-xs text-[#4c5c68] font-semibold"
                >
                  <option value="">{safeT(t, 'production.filters.allMonths', 'All Months')}</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                    const translationKey = `months.${monthName.toLowerCase()}`;
                    const translatedMonth = safeT(t, translationKey, monthName);
                    return (
                      <option key={i + 1} value={i + 1}>
                        {translatedMonth}
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>  
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-900 border border-red-100 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-[#4c5c68] text-red-900">{safeT(t, 'production.summary.activityType', 'Activity Type')}</th>
                    <th className="px-6 py-3 font-semibold text-[#4c5c68] text-red-900 text-center">{safeT(t, 'production.summary.quantity', 'Quantity')}</th>
                    <th className="px-6 py-3 font-semibold text-[#4c5c68] text-red-900 text-center">{safeT(t, 'production.summary.percentageTotal', 'Percentage')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-red-100/50">
                  {summaryData.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-red-50/30 transition-all duration-200 ease-in-out transform hover:scale-[1.01] hover:shadow-md">
                        <td className="px-8 py-5 font-semibold text-gray-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                          {String(safeT(t, `products.activities.${(activityTypeMap.get(item.activityTypeId)?.name || item.activityType || 'unknown').toLowerCase().replace(/\s+/g, '_')}`, String(getTranslatedActivityTypeName(activityTypeMap.get(item.activityTypeId), t) || item.activityType || 'Unknown')))}
                        </td>
                        <td className="px-8 py-5 text-center font-semibold text-red-700">
                          {String(item.total.toLocaleString())}
                        </td>
                        <td className="px-8 py-5 text-center text-gray-800">
                          <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded-full text-xs inline-flex items-center">
                            <span className="w-1 h-1 rounded-full bg-red-500 mr-1"></span>
                            {String(item.percentage.toFixed(1))}%
                          </span>
                        </td>
                      </tr>
                      {/* Product breakdown rows */}
                      {item.products.map((product, prodIndex) => (
                        <tr key={`${index}-${prodIndex}`} className="bg-red-50/20">
                          <td className="px-12 py-3 text-[#4c5c68] font-semibold text-xs">
                            {String((() => {
                              // Try exact match first, then trimmed match for products with space issues
                              let foundProduct = productMap.get(product.productId);
                              if (!foundProduct) {
                                // Look for product with trimmed ID
                                foundProduct = Array.from(productMap.values()).find(p => p.id?.trim() === product.productId?.trim());
                              }
                              return getTranslatedProductName(foundProduct, t) || foundProduct?.productid || product.productId;
                            })())}
                          </td>
                          <td className="px-8 py-3 text-center text-gray-600">
                            {String(product.quantity.toLocaleString())}
                          </td>
                          <td className="px-8 py-3 text-center">
                            <span className="text-gray-500 text-xs">
                              {String(product.percentage.toFixed(1))}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="bg-gradient-to-r from-red-100 via-red-50 to-red-100 font-bold text-red-900 border-t-2 border-red-200">
                    <td className="px-8 py-5 rounded-bl-xl flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                      <span>{safeT(t, 'production.summary.totalProduction', 'Total Production')}</span>
                    </td>
                    <td className="px-8 py-5 text-center text-red-800">
                      {String(summaryData.reduce((sum, item) => sum + item.total, 0).toLocaleString())}
                    </td>
                    <td className="px-8 py-5 text-center rounded-br-xl text-gray-800">
                      <span className="bg-red-200 text-red-800 px-3 py-1.5 rounded-full text-xs inline-flex items-center">
                        <span className="w-1 h-1 rounded-full bg-red-600 mr-1"></span>
                        100%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Charts - Right Side */}
        <div className="col-span-7 flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex flex-col items-center mb-4">
              <h3 className="text-lg font-semibold text-[#4c5c68] mb-3 text-center">{String(t('production.charts.productionTrends'))}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{String(t('production.charts.viewBy')) || 'View by'}:</span>
                <Select
                  value={chartViewMode}
                  onChange={(e) => setChartViewMode(e.target.value)}
                  className="w-40 text-sm border-gray-300 rounded-md"
                >
                  <option value="individual">{String(t('production.charts.individualProducts')) || 'Individual Products'}</option>
                  <option value="grouped">{String(t('production.charts.productTypes')) || 'Product Types'}</option>
                </Select>
              </div>
            </div>
            <div className="h-[350px]">
              <ClientOnly>
                {chartDataMemo?.productChart?.options && chartDataMemo?.productChart?.series && (
                  <Chart 
                    options={{
                      ...chartDataMemo.productChart.options,
                      chart: {
                        type: 'bar',
                        background: 'transparent',
                        toolbar: { show: false }
                      },
                      colors: ['#008080', '#f59e42', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'],
                      xaxis: {
                        ...chartDataMemo.productChart.options.xaxis,
                        labels: {
                          style: { fontSize: '12px', colors: '#64748b' }
                        }
                      },
                      yaxis: {
                        ...chartDataMemo.productChart.options.yaxis,
                        labels: {
                          style: { fontSize: '12px', colors: '#64748b' }
                        }
                      },
                      legend: {
                        show: false
                      }
                    }}
                    series={chartDataMemo.productChart.series}
                    type="bar"
                    height="100%"
                  />
                )}
              </ClientOnly>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-[#4c5c68] text-center">{String(t('production.charts.productionByActivity'))}</h3>
            <div className="h-[350px]">
              <ClientOnly>
                {chartDataMemo?.activityChart?.options && chartDataMemo?.activityChart?.series && (
                  <Chart 
                    options={{
                      ...chartDataMemo.activityChart.options,
                      chart: {
                        type: 'bar',
                        background: 'transparent',
                        toolbar: { show: false }
                      },
                      colors: ['#008080', '#f59e42', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'],
                      xaxis: {
                        ...chartDataMemo.activityChart.options.xaxis,
                        labels: {
                          style: { fontSize: '12px', colors: '#64748b' }
                        }
                      },
                      yaxis: {
                        ...chartDataMemo.activityChart.options.yaxis,
                        labels: {
                          style: { fontSize: '12px', colors: '#64748b' }
                        }
                      },
                      legend: {
                        show: false
                      }
                    }}
                    series={chartDataMemo.activityChart.series}
                    type="bar"
                    height="100%"
                  />
                )}
              </ClientOnly>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
