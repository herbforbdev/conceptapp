"use client";

import React, { useEffect, useState, useMemo, memo, useCallback } from "react";
import { Label, Card, Button, TextInput, Select } from "flowbite-react";
import { useFirestoreCollection } from "../../../hooks/useFirestoreCollection";
import { firestore } from "../../../lib/firebase";
import { deleteDoc, doc, writeBatch, serverTimestamp, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  HiRefresh, 
  HiTrendingUp, 
  HiTrendingDown, 
  HiInbox, 
  HiShoppingCart, 
  HiPencil, 
  HiTrash, 
  HiPlus, 
  HiChevronLeft, 
  HiChevronRight,
  HiCheck,
  HiX
} from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";

import { saveSalesFilters, loadSalesFilters, STORAGE_KEYS } from "@/lib/utils/salesStateManagement";
import { useMasterData } from "@/hooks/useMasterData";
import TopCard from "@/components/shared/TopCard";
import { TIME_PERIODS } from '@/lib/constants/timePeriods';
import TimePeriodSelector from '@/components/shared/TimePeriodSelector';

// Dynamic import for ApexCharts
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Client-side only wrapper
const ClientOnly = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return children;
};
ClientOnly.displayName = 'ClientOnly';

// Add style definitions
const typeStyles = {
  "Total Sales": { bg: "bg-blue-600", text: "text-blue-700", icon: <HiInbox className="font-bold" />, title: "font-bold" },
  "Average Sale": { bg: "bg-green-600", text: "text-green-700", icon: <HiTrendingUp className="font-bold" />, title: "font-bold" },
  "Best Selling": { bg: "bg-yellow-600", text: "text-yellow-700", icon: <HiShoppingCart className="font-bold" />, title: "font-bold" },
  "Sales Growth": { bg: "bg-purple-600", text: "text-purple-700", icon: <HiTrendingUp className="font-bold" />, title: "font-bold" },
  default: { bg: "bg-blue-600", text: "text-blue-700", icon: <HiInbox /> }
};

// Update chart options to be functions that accept t
const getChartOptions = (t) => ({
  chart: {
    type: 'area',
    height: 350,
    toolbar: {
      show: false
    },
    background: 'transparent'
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'smooth',
    width: 5
  },
  colors: ['#3b82f6'],
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.4,
      gradientToColors: ['#60a5fa'],
      inverseColors: false,
      opacityFrom: 0.8,
      opacityTo: 0.3,
      stops: [0, 100]
    }
  },
  xaxis: {
    type: 'datetime',
    labels: {
      formatter: (value) => {
        const date = new Date(value);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit'
        });
      },
      style: {
        colors: '#64748b',
        fontSize: '14px'
      }
    }
  },
  yaxis: {
    title: {
      text: t('sales.charts.amount_usd') || 'Amount (USD)',
      style: {
        color: '#64748b'
      }
    },
    labels: {
      formatter: (value) => `$${value.toLocaleString()}`,
      style: {
        colors: '#64748b',
        fontSize: '14px'
      }
    }
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (value) => `$${value.toLocaleString()} USD`
    }
  },
  grid: {
    show: true,
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
    position: 'back'
  },
  legend: {
    show: false
  }
});

// Enhanced chart options for activity type chart
const getActivityTypeChartOptions = (t) => ({
  chart: {
    type: 'bar',
    toolbar: {
      show: false
    },
    height: 350
  },
  theme: {
    mode: 'light',
    palette: 'palette1'
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
      return `$${val.toLocaleString()}`
    },
    style: {
      fontSize: '14px',
      colors: ['#fff']
    }
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: [],
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '14px'
      }
    }
  },
  yaxis: {
    title: {
      text: t('sales.charts.amount_usd') || 'Amount (USD)',
      style: {
        color: '#64748b'
      }
    },
    labels: {
      style: {
        colors: '#64748b'
      },
      formatter: function (val) {
        return `$${val.toLocaleString()}`
      }
    }
  },
  fill: {
    opacity: 1,
    type: 'solid'
  },
  tooltip: {
    y: {
      formatter: function (val) {
        return `$${val.toLocaleString()} USD`;
      }
    }
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'right',
    floating: false,
    labels: {
      colors: '#000000'
    }
  },
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
});

// Add helper functions for date handling
const sortByDate = (a, b) => {
  if (!a.date || !b.date) return 0;
  const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
  const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
  return dateB.getTime() - dateA.getTime();
};

const formatCDF = (amount) => {
  if (!amount) return "0 CDF";
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const filterByPeriod = (data, period) => {
  if (!data || !Array.isArray(data)) return [];
  if (!period) return data;

  return data.filter(item => {
    if (!item.date) return false;
    const date = item.date.toDate ? item.date.toDate() : new Date(item.date);

    switch (period.type) {
      case 'year':
        return date.getFullYear() === period.year;
      case 'month':
        return date.getFullYear() === period.year && 
               date.getMonth() === period.month - 1;
      case 'custom':
        if (period.startDate && period.endDate) {
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          return date >= startDate && date <= endDate;
        }
        return true;
      default:
        return true;
    }
  });
};

// Memoize the table row component
const ProductRow = memo(({ product, productSales, activityType }) => {
  const totalCDF = productSales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0);
  const totalUSD = productSales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);
  const totalQty = productSales.reduce((sum, sale) => sum + (sale.quantitySold || 0), 0);

  return (
    <tr className="hover:bg-blue-50">
      <td className="px-6 py-4 pl-10">{product.productid}</td>
                      <td className="px-6 py-4 text-right">{String(totalQty.toLocaleString())}</td>
      <td className="px-6 py-4 text-right">
        {String(totalCDF.toLocaleString('fr-CD', { 
          style: 'currency', 
          currency: 'CDF',
          maximumFractionDigits: 0 
        }))}
      </td>
      <td className="px-6 py-4 text-right">
        {String(totalUSD.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD',
          maximumFractionDigits: 2 
        }))}
      </td>
    </tr>
  );
});

// Memoize the activity section component
const ActivitySection = memo(({ activityType, productsWithSales, filteredSales, summaryPeriod }) => {
  const activitySales = useMemo(() => {
    return filterByPeriod(
      filteredSales.filter(sale => sale.activityTypeId === activityType.id),
      summaryPeriod
    );
  }, [activityType.id, filteredSales, summaryPeriod]);

  const totals = useMemo(() => {
    return {
      cdf: activitySales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0),
      usd: activitySales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0),
      qty: activitySales.reduce((sum, sale) => sum + (sale.quantitySold || 0), 0)
    };
  }, [activitySales]);

  if (productsWithSales.length === 0) return null;

  return (
    <React.Fragment>
      <tr className="bg-blue-50/50">
        <td colSpan={4} className="px-6 py-3 font-semibold text-blue-900">
          {activityType.name}
        </td>
      </tr>
      
      {productsWithSales.map(product => (
        <ProductRow
          key={`${activityType.id}-${product.id}`}
          product={product}
          productSales={filterByPeriod(
            filteredSales.filter(sale => 
              sale.productId === product.id && 
              sale.activityTypeId === activityType.id
            ),
            summaryPeriod
          )}
          activityType={activityType}
        />
      ))}

      <tr className="bg-blue-50/30 font-semibold">
        <td className="px-6 py-4">Subtotal</td>
        <td className="px-6 py-4 text-right">{String(totals.qty.toLocaleString())}</td>
        <td className="px-6 py-4 text-right">
          {String(totals.cdf.toLocaleString('fr-CD', { 
            style: 'currency', 
            currency: 'CDF',
            maximumFractionDigits: 0 
          }))}
        </td>
        <td className="px-6 py-4 text-right">
          {String(totals.usd.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD',
            maximumFractionDigits: 2 
          }))}
        </td>
      </tr>
    </React.Fragment>
  );
});

// Add this helper function to get packaging products
const getPackagingForProduct = (productId, productMap) => {
  if (!productId || !productMap) return null;
  
  const mainProduct = productMap.get(productId);
  if (!mainProduct) return null;

  // Find exact matching packaging
  return Array.from(productMap.values())
    .find(p => {
      // Must be a packaging product
      const isPackaging = 
        p.producttype === 'Packaging For Water Bottling' ||
        p.producttype === 'Packaging For Cube Ice' ||
        p.producttype === 'Packaging for Ice Cube';

      // Must match activity type
      const matchesActivity = p.activitytypeid === mainProduct.activitytypeid;

      // Must match exact product name pattern
      const productId = mainProduct.productid;
      const expectedPackageId = `Package ${productId}`;
      const alternativePackageId = `Package ${productId.replace('.', ',')}`;
      const alternativePackageId2 = `Package ${productId.replace(',', '.')}`;

      const matchesProduct = 
        p.productid === expectedPackageId ||
        p.productid === alternativePackageId ||
        p.productid === alternativePackageId2;

      return isPackaging && matchesActivity && matchesProduct;
    });
};

// Color palettes
const channelColors = [
  { bg: 'bg-purple-50', text: 'text-purple-900' },
  { bg: 'bg-pink-50', text: 'text-pink-900' },
  { bg: 'bg-blue-50', text: 'text-blue-900' }
];
const productColors = [
  { bg: 'bg-green-50', text: 'text-green-900' },
  { bg: 'bg-teal-50', text: 'text-teal-900' },
  { bg: 'bg-cyan-50', text: 'text-cyan-900' },
  { bg: 'bg-orange-50', text: 'text-orange-900' }
];
const activityColors = [
  { bg: 'bg-yellow-50', text: 'text-yellow-900' },
  { bg: 'bg-amber-50', text: 'text-amber-900' },
  { bg: 'bg-lime-50', text: 'text-lime-900' }
];
function getColorIdx(str, arr) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % arr.length;
}

// Add this helper function after imports and before the main component
const getTranslatedProductName = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid || product.name || 'Unknown';
  if (!name) return 'N/A';
  const lower = name.toLowerCase();
  const type = product.producttype?.toLowerCase();
  const includesAny = (str, terms) => terms.some(term => str.includes(term));
  try {
    if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
      if (includesAny(lower, ['cube ice', 'glaçons'])) {
        if (lower.includes('1kg')) return String(t('products.items.packaging.cubeIce.1kg') || name);
        if (lower.includes('2kg')) return String(t('products.items.packaging.cubeIce.2kg') || name);
        if (lower.includes('5kg')) return String(t('products.items.packaging.cubeIce.5kg') || name);
      }
      if (includesAny(lower, ['water', 'eau'])) {
        if (lower.includes('600ml')) return String(t('products.items.packaging.waterBottling.600ml') || name);
        if (lower.includes('750ml')) return String(t('products.items.packaging.waterBottling.750ml') || name);
        if (lower.includes('1.5l') || lower.includes('1,5l')) return String(t('products.items.packaging.waterBottling.1_5L') || name);
        if (lower.includes('5l')) return String(t('products.items.packaging.waterBottling.5L') || name);
      }
      return String(name);
    }
    if (type === 'block ice' || includesAny(lower, ['bloc de glace', 'block ice'])) {
      if (lower.includes('5kg')) return String(t('products.items.blockIce.5kg') || name);
      if (lower.includes('8kg')) return String(t('products.items.blockIce.8kg') || name);
      if (lower.includes('30kg')) return String(t('products.items.blockIce.30kg') || name);
    }
    if (type === 'cube ice' || includesAny(lower, ['glaçons', 'cube ice', 'ice cube'])) {
      if (lower.includes('1kg')) return String(t('products.items.cubeIce.1kg') || name);
      if (lower.includes('2kg')) return String(t('products.items.cubeIce.2kg') || name);
      if (lower.includes('5kg')) return String(t('products.items.cubeIce.5kg') || name);
    }
    if (type === 'water bottling' || includesAny(lower, ['eau en bouteille', 'bottled water', 'water bottle'])) {
      if (lower.includes('600ml')) return String(t('products.items.waterBottling.600ml') || name);
      if (lower.includes('750ml')) return String(t('products.items.waterBottling.750ml') || name);
      if (lower.includes('1.5l') || lower.includes('1,5l')) return String(t('products.items.waterBottling.1_5L') || name);
      if (lower.includes('5l')) return String(t('products.items.waterBottling.5L') || name);
    }
  } catch (error) {
    console.warn('Translation error for product:', name, error);
  }
  return String(name);
};

// Improved normalization for translation keys
const normalizeActivityKey = (name) => {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const getTranslatedActivityTypeName = (activityType, t) => {
  if (!activityType) return 'N/A';
  const name = activityType.name || activityType.activityid || activityType;
  if (!name) return 'N/A';
  
  // First try hardcoded translation map for existing entries
  const activityTypeTranslationMap = {
    "Block Ice": "block_ice",
    "Cube Ice & Water Bottling": "cube_ice_water_bottling"
  };
  
  if (activityTypeTranslationMap[name]) {
    const translated = t(`masterData.activities.${activityTypeTranslationMap[name]}`, '');
    if (translated && translated !== `masterData.activities.${activityTypeTranslationMap[name]}`) {
      return String(translated);
    }
  }
  
  // Try dynamic key generation for new entries
  const keyVariations = [
    // Direct key in activities (not nested under types)
    name.replace(/\s+/g, '_').replace(/&/g, '_').toLowerCase(),
    // With French characters
    name.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/à/g, 'a').replace(/ç/g, 'c'),
    // Original with underscores
    name.replace(/\s+/g, '_').toLowerCase(),
    // CamelCase version
    name.replace(/\s+/g, '').replace(/&/g, ''),
    // Without spaces in lowercase
    name.replace(/\s+/g, '').toLowerCase(),
    // Legacy products.activities pattern
    `products.activities.${normalizeActivityKey(name)}`
  ];
  
  // Try each variation - activities are directly under masterData.activities, not under types
  for (const key of keyVariations) {
    const translated = t(`masterData.activities.${key}`, '');
    if (translated && translated !== `masterData.activities.${key}`) {
      return String(translated);
    }
  }
  
  // Also try under types structure for backward compatibility
  for (const key of keyVariations) {
    const translated = t(`masterData.activities.types.${key}`, '');
    if (translated && translated !== `masterData.activities.types.${key}`) {
      return String(translated);
    }
  }
  
  // Try legacy pattern
  for (const key of keyVariations) {
    if (key.startsWith('products.activities.')) {
      const translated = t(key, '');
      if (translated && translated !== key) {
        return String(translated);
      }
    }
  }
  
  // Fallback to original name (perfect for French entries added via master-data page)
  return String(name);
};

const getTranslatedChartLabel = (label, t) => {
  if (!label) return 'N/A';
  
  try {
    if (typeof label === 'number') {
      // If it's a timestamp
      const date = new Date(label);
      if (!isNaN(date.getTime())) {
        const month = date.toLocaleString('default', { month: 'short' });
        const key = `months.${month.toLowerCase()}_short`;
        
        const translated = t(key);
        if (translated && translated !== key) {
          return String(translated);
        }
        
        return String(month);
      }
    }
    
    // Try to translate directly
    const key = `chart.labels.${String(label).toLowerCase().replace(/\s+/g, '_')}`;
    const translated = t(key);
    
    return String(translated && translated !== key ? translated : label);
  } catch (error) {
    console.warn('Translation error for chart label:', label, error);
    return String(label);
  }
};

// Add safeT function to ensure translations always return strings
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

// Main component
export default function SalesPage() {
  // Setup navigation and context
  const router = useRouter();
  const { t } = useLanguage();

  // CRITICAL FIX: Create stable date references to prevent hydration mismatches and infinite renders
  const stableNow = useMemo(() => new Date(), []);
  const stableCurrentYear = useMemo(() => stableNow.getFullYear(), [stableNow]);
  const stableCurrentMonth = useMemo(() => stableNow.getMonth(), [stableNow]);

  // Data fetching hooks
  const { data: sales, loading: salesLoading, refetch: refetchSales } = useFirestoreCollection("Sales");
  const { 
    products,
    activityTypes,
    productMap,
    activityTypeMap,
    loading: masterDataLoading 
  } = useMasterData();

  // 1. All useState hooks grouped together
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Summary period state for filtering by year/month
  const [summaryPeriod, setSummaryPeriod] = useState({
    year: new Date().getFullYear(),
    month: 0 // 0 = All Months, 1+ = specific month
  });

  // Product type filter for summary tables
  const [selectedProductType, setSelectedProductType] = useState('');
  
  // Active tab state for summary tables
  const [activeTab, setActiveTab] = useState('products');

  // Time period states
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS.MONTH);
  const [dateFilters, setDateFilters] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      week: Math.ceil(now.getDate() / 7),
      startDate: null,
      endDate: null
    };
  });

  // Filter state
  const [filters, setFilters] = useState(() => {
    const savedFilters = loadSalesFilters();
    return {
      selectedYear: savedFilters.selectedYear || stableCurrentYear,
      selectedMonth: savedFilters.selectedMonth || '',
      selectedActivityType: savedFilters.selectedActivityType || '',
      selectedProduct: savedFilters.selectedProduct || '',
      selectedChannel: savedFilters.selectedChannel || '',
      selectedStatus: savedFilters.selectedStatus || '',
      dateFilters: savedFilters.dateFilters || {
        year: stableCurrentYear,
        month: stableCurrentMonth,
        week: 0,
        startDate: null,
        endDate: null
      },
      selectedTimePeriod: savedFilters.selectedTimePeriod || TIME_PERIODS.MONTH
    };
  });

  // Save filters whenever they change
  useEffect(() => {
    saveSalesFilters({
      selectedTimePeriod: filters.selectedTimePeriod,
      selectedActivityType: filters.selectedActivityType,
      selectedProduct: filters.selectedProduct,
      dateFilters: filters.dateFilters
    });
  }, [filters]);

  // Compute available years for filtering
  const availableYears = useMemo(() => {
    if (!sales) return [];
    const yearsSet = new Set();
    sales.forEach(sale => {
      const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      yearsSet.add(date.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales]);

  // Month names for dropdown
  const MONTHS = useMemo(() => [
    t('filters.allMonths', 'All Months'),
    t('months.january', 'January'),
    t('months.february', 'February'),
    t('months.march', 'March'),
    t('months.april', 'April'),
    t('months.may', 'May'),
    t('months.june', 'June'),
    t('months.july', 'July'),
    t('months.august', 'August'),
    t('months.september', 'September'),
    t('months.october', 'October'),
    t('months.november', 'November'),
    t('months.december', 'December')
  ], [t]);

  // Compute available years for the records filter bar (from sales data)
  const availableRecordYears = useMemo(() => {
    if (!sales) return [];
    const yearsSet = new Set();
    sales.forEach(sale => {
      const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      yearsSet.add(date.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      
      // If changing time period, update date filters accordingly
      if (key === 'selectedTimePeriod') {
        const now = new Date();
        console.log('Changing time period to:', value); // Debug log
        
        switch (value) {
          case TIME_PERIODS.YEAR:
            updated.dateFilters = {
              year: now.getFullYear(),
              month: null,
              week: null,
              startDate: null,
              endDate: null
            };
            break;
          case TIME_PERIODS.MONTH:
            updated.dateFilters = {
              year: now.getFullYear(),
              month: now.getMonth(),
              week: null,
              startDate: null,
              endDate: null
            };
            break;
          case TIME_PERIODS.WEEK:
            updated.dateFilters = {
              year: now.getFullYear(),
              month: now.getMonth(),
              week: Math.ceil(now.getDate() / 7),
              startDate: null,
              endDate: null
            };
            break;
          case TIME_PERIODS.ALL:
            updated.dateFilters = {
              year: null,
              month: null,
              week: null,
              startDate: null,
              endDate: null
            };
            break;
          case TIME_PERIODS.CUSTOM:
            // Keep existing custom dates if any
            break;
          default:
            updated.dateFilters = {
              year: now.getFullYear(),
              month: now.getMonth(),
              week: null,
              startDate: null,
              endDate: null
            };
        }
      }
      
      return updated;
    });
    setCurrentPage(1);
  }, []);

  // Mass edit states
  const [massEditMode, setMassEditMode] = useState(false);
  const [massEditData, setMassEditData] = useState({
    date: "",
    activityTypeId: "",
    channel: ""
  });

  // Inline edit states
  const [editingRow, setEditingRow] = useState(null);
  const [editingData, setEditingData] = useState(null);

  // Create a Set of unique product IDs for efficient lookup
  const uniqueProductIds = useMemo(() => {
    const seen = new Set();
    return Array.from(productMap.values()).reduce((acc, product) => {
      if (!seen.has(product.id)) {
        seen.add(product.id);
        acc.push(product);
      }
      return acc;
    }, []);
  }, [productMap]);

  // Get unique product types for filter dropdown
  const uniqueProductTypes = useMemo(() => {
    const types = new Set();
    Array.from(productMap.values()).forEach(product => {
      if (product.producttype && 
          !product.producttype.includes('Packaging') && 
          !product.producttype.includes('Emballage')) {
        types.add(product.producttype);
      }
    });
    return Array.from(types).sort();
  }, [productMap]);

  // Track if initial product type has been set
  const [hasSetInitialProductType, setHasSetInitialProductType] = useState(false);

  // Set default product type to Block Ice when data loads (only once)
  useEffect(() => {
    if (uniqueProductTypes.length > 0 && !hasSetInitialProductType) {
      // Find Block Ice or Bloc de glace in the available types
      const blockIceType = uniqueProductTypes.find(type => 
        type === 'Block Ice' || 
        type === 'Bloc de glace' || 
        type === 'Bloc de Glace' ||
        type.toLowerCase().includes('bloc')
      );
      
      if (blockIceType) {
        setSelectedProductType(blockIceType);
      } else {
        setSelectedProductType(uniqueProductTypes[0]);
      }
      setHasSetInitialProductType(true);
    }
  }, [uniqueProductTypes, hasSetInitialProductType]);

  // Helper function to get unique products by activity type
  const getUniqueProductsByActivityType = useCallback((activityTypeId) => {
    if (!activityTypeId) return [];
    
    return Array.from(uniqueProductIds)
      .filter(product => {
        // Basic validation
        if (!product || !product.producttype) return false;
        
        // Match activity ID - Trim whitespace from both IDs
        const matchesActivity = (product.activitytypeid || '').trim() === activityTypeId.trim();
        
        // Exclude packaging products - these are never sold
        const productType = product.producttype || '';
        const isNotPackaging = 
          !productType.includes('Packaging') &&
          !productType.includes('Emballage') &&
          !product.productid?.includes('Package');

        return matchesActivity && isNotPackaging;
      })
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
  }, [uniqueProductIds]);

  // Update filteredProducts to use the new helper
  const filteredProducts = useMemo(() => {
    if (!filters.selectedActivityType) {
      // If no activity type selected, show all products (excluding packaging)
      return Array.from(uniqueProductIds)
        .filter(product => {
          if (!product || !product.productid) return false;
          
          // Exclude packaging products - never sold
          const productType = product.producttype || '';
          const isNotPackaging = 
            !productType.includes('Packaging') &&
            !productType.includes('Emballage') &&
            !product.productid?.includes('Package');
            
          return isNotPackaging;
        })
        .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
    } else {
      // If activity type is selected, show only products for that activity
      return getUniqueProductsByActivityType(filters.selectedActivityType);
    }
  }, [uniqueProductIds, filters.selectedActivityType, getUniqueProductsByActivityType]);

  // 3. Add calculateSalesMetrics as a memoized function
  const calculateSalesMetrics = useCallback((filteredSales) => {
    if (!filteredSales?.length) return {
      totalSales: { count: 0, amountUSD: 0, amountFC: 0 },
      averageSale: { amountUSD: 0 },
      bestSellingProduct: { product: null, quantity: 0 },
      salesGrowth: { percentage: 0, trend: 'neutral' }
    };

    // 1. Total Sales
    const totalSales = {
      count: filteredSales.length,
      amountUSD: filteredSales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0),
      amountFC: filteredSales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0),
      amountCDF: filteredSales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0)
    };

    // 2. Average Daily Sales
    const salesByDate = filteredSales.reduce((acc, sale) => {
      const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      const dateKey = date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          amountUSD: 0,
          count: 0
        };
      }
      acc[dateKey].amountUSD += sale.amountUSD || 0;
      acc[dateKey].count++;
      return acc;
    }, {});

    const uniqueDays = Object.keys(salesByDate).length;
    const averageSale = {
      amountUSD: uniqueDays > 0 ? totalSales.amountUSD / uniqueDays : 0
    };

    // 3. Best Selling Product (by Quantity)
    const productSales = filteredSales.reduce((acc, sale) => {
      const productId = sale.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: productMap.get(productId),
          quantity: 0
        };
      }
      acc[productId].quantity += sale.quantitySold || 0;
      return acc;
    }, {});

    const bestSellingProduct = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)[0] || { product: null, quantity: 0 };

    // 4. Sales Growth
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthSales = filteredSales.filter(sale => {
      const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear;
    }).reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const lastMonthSales = filteredSales.filter(sale => {
      const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      return saleDate.getMonth() === lastMonth && 
             saleDate.getFullYear() === lastMonthYear;
    }).reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);

    const growthPercentage = lastMonthSales === 0 
      ? 100 
      : ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;

    const salesGrowth = {
      percentage: growthPercentage,
      trend: growthPercentage > 0 ? 'up' : growthPercentage < 0 ? 'down' : 'neutral'
    };

    return {
      totalSales,
      averageSale,
      bestSellingProduct,
      salesGrowth
    };
  }, [productMap]);

  // 5. All useCallback hooks for event handlers
  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0 || !confirm('Are you sure you want to delete these items?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Sales", id);
        batch.delete(docRef);
      });
      await batch.commit();
      setSelectedItems([]);
      handleRefresh();
    } catch (error) {
      console.error("Error deleting items:", error);
      alert("Failed to delete items");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, handleRefresh]);

  // Update filteredProducts to use the new getProductsByActivityType
  const filteredSalesData = useMemo(() => {
    if (!sales) return { data: [], totalPages: 0 };
    return {
      data: sales.filter(sale => {
        // ...other filters...
        // Month/year filter
        if (filters.selectedTimePeriod === TIME_PERIODS.MONTH && (filters.selectedMonth || filters.selectedYear)) {
          const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
          const yearMatch = filters.selectedYear ? date.getFullYear() === parseInt(filters.selectedYear, 10) : true;
          const monthMatch = filters.selectedMonth ? date.getMonth() === parseInt(filters.selectedMonth, 10) - 1 : true;
          if (!yearMatch || !monthMatch) return false;
        }
        // ...rest of the filter logic...
        if (filters.searchTerm?.trim()) {
          const term = filters.searchTerm.toLowerCase().trim();
          const product = productMap.get(sale.productId);
          const activityType = activityTypeMap.get(sale.activityTypeId);
          if (!(
            product?.productid?.toLowerCase().includes(term) ||
            activityType?.name?.toLowerCase().includes(term) ||
            sale.channel?.toLowerCase().includes(term) ||
            sale.amountUSD?.toString().includes(term) ||
            sale.amountFC?.toString().includes(term)
          )) {
            return false;
          }
        }
        if (filters.selectedActivityType && sale.activityTypeId !== filters.selectedActivityType) {
          return false;
        }
        if (filters.selectedProduct && sale.productId !== filters.selectedProduct) {
          return false;
        }
        if (filters.selectedChannel && sale.channel !== filters.selectedChannel) {
          return false;
        }
        return true;
      }),
      totalPages: Math.ceil(sales.length / entriesPerPage)
    };
  }, [sales, filters, productMap, activityTypeMap, entriesPerPage]);

  // Compute data filtered by summary period (year & month)
  const periodData = useMemo(() => {
    // If month is 0 (All Months), filter by year only
    if (summaryPeriod.month === 0) {
      return filterByPeriod(filteredSalesData.data, {
        type: 'year',
        year: summaryPeriod.year
      });
    }
    
    return filterByPeriod(filteredSalesData.data, {
      type: 'month',
      year: summaryPeriod.year,
      month: summaryPeriod.month
    });
  }, [filteredSalesData.data, summaryPeriod]);

  // Filter data based on the summary section time period for top cards (same as costs page)
  const topCardData = useMemo(() => {
    if (!sales) return [];
    
    // If month is 0 (All Months), filter by year only
    if (summaryPeriod.month === 0) {
      return filterByPeriod(sales, {
        type: 'year',
        year: summaryPeriod.year
      });
    }
    
    return filterByPeriod(sales, {
      type: 'month',
      year: summaryPeriod.year,
      month: summaryPeriod.month
    });
  }, [sales, summaryPeriod]);

  // 7. All useEffect hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(salesLoading || masterDataLoading);
  }, [salesLoading, masterDataLoading]);

  useEffect(() => {
    if (selectAll) {
      setSelectedItems(filteredSalesData.data.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  }, [selectAll, filteredSalesData.data]);

  // Add this state near other state declarations
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'asc'
  });

  // Add this function before the return statement
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Loading state
  if (!mounted || loading || !sales || !products || !activityTypes) {
    return (
              <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('sales.loading.title')}</p>
          <p className="text-sm text-gray-500 mt-2">
            {!sales && t('sales.loading.sales')}
            {!products && t('sales.loading.products')}
            {!activityTypes && t('sales.loading.activityTypes')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
              <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Add mass edit handler
  const handleMassEdit = async () => {
    if (!selectedItems.length) return;
    
    try {
      setIsSubmitting(true);
      const batch = writeBatch(firestore);
      
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Sales", id);
        const updates = {};
        
        if (massEditData.date) {
          updates.date = new Date(massEditData.date);
        }
        if (massEditData.channel) {
          updates.channel = massEditData.channel;
        }
        if (massEditData.activityTypeId) {
          updates.activityTypeId = massEditData.activityTypeId;
          updates.activityTypeName = activityTypeMap.get(massEditData.activityTypeId)?.name || 'Unknown Activity';
        }
        
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = serverTimestamp();
          batch.update(docRef, updates);
        }
      });
      
      await batch.commit();
      setMassEditMode(false);
      setMassEditData({ date: "", channel: "", activityTypeId: "" });
      setSelectedItems([]);
      handleRefresh();
    } catch (error) {
      console.error('Mass edit error:', error);
      setError('Failed to update records');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add inline edit handler
  const handleInlineEdit = async (id) => {
    if (!editingData) return;
    
    try {
      const docRef = doc(firestore, "Sales", id);
      const updates = {
        ...editingData,
        updatedAt: serverTimestamp()
      };
      
      // Convert date if it was changed
      if (updates.date) {
        updates.date = new Date(updates.date);
      }
      
      // Update activity type name if it was changed
      if (updates.activityTypeId) {
        updates.activityTypeName = activityTypeMap.get(updates.activityTypeId)?.name || 'Unknown Activity';
      }

      // Update product name if product was changed
      if (updates.productId) {
        const product = productMap.get(updates.productId);
        updates.productName = product?.productid || 'Unknown Product';
      }
      
      await updateDoc(docRef, updates);
      setEditingRow(null);
      setEditingData(null);
      handleRefresh();
    } catch (error) {
      console.error('Inline edit error:', error);
      setError('Failed to update record');
    }
  };

  // Rest of the component render logic...
  return (
          <div className="min-h-screen p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-900">{safeT(t, 'sales.title', 'Sales')}</h1>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(() => {
          const metrics = calculateSalesMetrics(topCardData);
          
          return (
            <>
              <TopCard 
                title={safeT(t, 'sales.metrics.totalSales', 'Total Sales')}
                value={String(`${metrics.totalSales.count.toLocaleString()} ${safeT(t, 'sales.records', 'records')}`)}
                subValue={String(metrics.totalSales.amountUSD.toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: 'USD',
                  maximumFractionDigits: 0
                }))}
                icon={<HiInbox size={16} />}
                type="Total Sales"
              />
              <TopCard 
                title={safeT(t, 'sales.metrics.averageSale', 'Average Sale')}
                value={String(metrics.averageSale.amountUSD.toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }))}
                subValue={String(safeT(t, 'sales.metrics.perDay', 'per day'))}
                icon={<HiTrendingUp size={16} />}
                type="Average Sale"
              />
              <TopCard 
                title={safeT(t, 'sales.metrics.bestSelling', 'Best Selling')}
                value={String(metrics.bestSellingProduct.product?.productid || 'N/A')}
                subValue={String(`${metrics.bestSellingProduct.quantity.toLocaleString()} ${safeT(t, 'sales.metrics.units', 'units')}`)}
                icon={<HiShoppingCart size={16} />}
                type="Best Selling"
              />
              <TopCard 
                title={safeT(t, 'sales.metrics.salesGrowth', 'Sales Growth')}
                value={String(`${Math.abs(metrics.salesGrowth.percentage).toFixed(1)}%`)}
                subValue={String(safeT(t, 'sales.metrics.vsLastMonth', 'vs Last Month'))}
                icon={metrics.salesGrowth.trend === 'up' 
                  ? <HiTrendingUp size={16} />
                  : <HiTrendingDown size={16} />
                }
                type="Sales Growth"
                trend={metrics.salesGrowth.trend === 'up' ? 'up' : 'down'}
              />
            </>
          );
        })()}
      </div>

      {/* Sales Records Table with Merged Filters */}
      <Card className="mb-6 bg-white border-2 border-gray-300">
        {/* Enhanced Header with Actions and Filters */}
        <div className="border-b border-gray-200 rounded-t-2xl" style={{backgroundColor: '#f6f2ec'}}>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 rounded-t-2xl">
              <div>
                <h5 className="text-xl font-bold leading-none text-gray-900 uppercase mb-1">{t('sales.records')}</h5>
                <p className="text-sm text-gray-700">{t('sales.overview')}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <Button
                    color="failure"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(t('sales.confirmations.deleteSelected'))) {
                        handleBulkDelete();
                      }
                    }}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3"
                  >
                    <HiTrash className="h-4 w-4 mr-2" />
                    {t('sales.actions.delete')} ({selectedItems.length})
                  </Button>
                )}
                <Button
                  color="gray"
                  size="sm"
                  onClick={handleRefresh}
                  className="bg-amber-100 text-amber-600 hover:bg-amber-200 font-medium px-3"
                >
                  <HiRefresh className="h-4 w-4" />
                </Button>
                <Link href="/dashboard/sales/add">
                  <Button 
                    color="primary" 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-3"
                  >
                    <HiPlus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-2">
              {/* Year filter */}
              <div>
                <Label htmlFor="yearSelect">{safeT(t, 'sales.fields.year', 'Year')}</Label>
                <Select
                  id="yearSelect"
                  value={filters.selectedYear || ''}
                  onChange={e => {
                    const year = parseInt(e.target.value, 10);
                    setFilters(prev => ({
                      ...prev,
                      selectedYear: year,
                      selectedTimePeriod: TIME_PERIODS.MONTH,
                      dateFilters: {
                        ...prev.dateFilters,
                        year,
                        month: prev.selectedMonth ? parseInt(prev.selectedMonth, 10) - 1 : new Date().getMonth()
                      }
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1"
                  disabled={filters.selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{safeT(t, 'sales.filters.allYears', 'All Years')}</option>
                  {availableRecordYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
              {/* Month filter */}
              <div>
                <Label htmlFor="monthSelect">{safeT(t, 'sales.fields.month', 'Month')}</Label>
                <Select
                  id="monthSelect"
                  value={filters.selectedMonth || ''}
                  onChange={e => {
                    const month = e.target.value;
                    setFilters(prev => ({
                      ...prev,
                      selectedMonth: month,
                      selectedTimePeriod: TIME_PERIODS.MONTH,
                      dateFilters: {
                        ...prev.dateFilters,
                        month: month ? parseInt(month, 10) - 1 : stableCurrentMonth,
                        year: prev.selectedYear || stableCurrentYear
                      }
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1"
                  disabled={filters.selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{safeT(t, 'sales.filters.allMonths', 'All Months')}</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {safeT(t, `months.${new Date(0, i).toLocaleString('default', { month: 'long' }).toLowerCase()}`, new Date(0, i).toLocaleString('default', { month: 'long' }))}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="activityTypeSelect">{safeT(t, 'sales.fields.activityType', 'Activity Type')}</Label>
                <Select
                  id="activityTypeSelect"
                  value={filters.selectedActivityType}
                  onChange={(e) => handleFilterChange('selectedActivityType', e.target.value)}
                  className="mt-1"
                >
                  <option value="">{safeT(t, 'sales.filters.allActivityTypes', 'All Activity Types')}</option>
                  {activityTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {safeT(t, `products.activities.${(type.name || '').toLowerCase().replace(/\s+|&/g, '_')}`, type.name || 'Unknown')}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="product">{t('sales.fields.product')}</Label>
                <Select
                  id="product"
                  value={filters.selectedProduct}
                  onChange={(e) => handleFilterChange('selectedProduct', e.target.value)}
                  className="mt-1"
                >
                  <option value="">{t('sales.filters.allProducts')}</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {getTranslatedProductName(product, t)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="channel">{t('sales.fields.channel')}</Label>
                <Select
                  id="channel"
                  value={filters.selectedChannel}
                  onChange={(e) => handleFilterChange('selectedChannel', e.target.value)}
                  className="mt-1"
                >
                  <option value="">{t('sales.filters.allChannels')}</option>
                  <option value="OnSite">{t('sales.channels.onSite', 'On-Site')}</option>
                  <option value="Truck Delivery">{t('sales.channels.truckDelivery', 'Truck Delivery')}</option>
                  <option value="Motorcycle Delivery">{t('sales.channels.motorcycleDelivery', 'Motorcycle Delivery')}</option>
                </Select>
              </div>
            </div>
          </div>
        </div>
        {/* Table Section (unchanged) */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-900">
            <thead className="text-stone-50" style={{backgroundColor: '#e6d9c9'}}>
              <tr>
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={() => {
                      setSelectAll(!selectAll);
                      if (!selectAll) {
                        setSelectedItems(filteredSalesData.data.map(item => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    className="h-4 w-4 text-amber-600 border-amber-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort('date')}>
                  <div className="flex items-center">{t('sales.fields.date')}{sortConfig.key === 'date' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort('product')}>
                  <div className="flex items-center">{t('sales.fields.product')}{sortConfig.key === 'product' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort('channel')}>
                  <div className="flex items-center">{t('sales.fields.channel')}{sortConfig.key === 'channel' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:opacity-80" onClick={() => handleSort('activityType')}>
                  <div className="flex items-center">{t('sales.fields.activityType')}{sortConfig.key === 'activityType' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold text-center cursor-pointer hover:opacity-80" onClick={() => handleSort('amountFC')}>
                  <div className="flex items-center justify-center">{t('sales.fields.amountFC')}{sortConfig.key === 'amountFC' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold text-center">{t('sales.fields.exchangeRate')}</th>
                <th className="px-6 py-3 font-semibold text-center cursor-pointer hover:opacity-80" onClick={() => handleSort('amountUSD')}>
                  <div className="flex items-center justify-center">{t('sales.fields.amountUSD')}{sortConfig.key === 'amountUSD' && (<span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>)}</div>
                </th>
                <th className="px-6 py-3 font-semibold text-center">{t('sales.common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-stone-300">
              {filteredSalesData.data
                .sort((a, b) => {
                  const direction = sortConfig.direction === 'asc' ? 1 : -1;
                  
                  switch (sortConfig.key) {
                    case 'date':
                      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                      return (dateA.getTime() - dateB.getTime()) * direction;
                    
                    case 'product':
                      const productA = productMap.get(a.productId)?.productid || '';
                      const productB = productMap.get(b.productId)?.productid || '';
                      return productA.localeCompare(productB) * direction;
                    
                    case 'channel':
                      return (a.channel || '').localeCompare(b.channel || '') * direction;
                    
                    case 'activityType':
                      const activityA = activityTypeMap.get(a.activityTypeId)?.name || '';
                      const activityB = activityTypeMap.get(b.activityTypeId)?.name || '';
                      return activityA.localeCompare(activityB) * direction;
                    
                    case 'amountFC':
                      return (a.amountFC - b.amountFC) * direction;
                    
                    case 'amountUSD':
                      return (a.amountUSD - b.amountUSD) * direction;
                    
                    default:
                      return 0;
                  }
                })
                .slice(
                  (currentPage - 1) * entriesPerPage,
                  currentPage * entriesPerPage
                ).map((sale, index) => (
                  <tr
                    key={sale.id}
                    className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                      index % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                    } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(sale.id)}
                        onChange={() => {
                          if (selectedItems.includes(sale.id)) {
                            setSelectedItems(prev => prev.filter(id => id !== sale.id));
                          } else {
                            setSelectedItems(prev => [...prev, sale.id]);
                          }
                        }}
                        className="h-4 w-4 text-stone-600 border-stone-300 rounded"
                      />
                    </td>
                    {editingRow === sale.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <TextInput
                            type="date"
                            value={editingData.date || sale.date?.toDate().toISOString().split('T')[0]}
                            onChange={(e) => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={editingData.productId || sale.productId}
                            onChange={(e) => {
                              const selectedProduct = productMap.get(e.target.value);
                              setEditingData(prev => ({ 
                                ...prev, 
                                productId: e.target.value,
                                productName: selectedProduct?.productid || t('sales.table.unknownProduct')
                              }));
                            }}
                            className="w-full"
                          >
                            <option value="">Select Product</option>
                            {filteredProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {getTranslatedProductName(product, t)}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={editingData.channel || sale.channel}
                            onChange={(e) => setEditingData(prev => ({ ...prev, channel: e.target.value }))}
                            className="w-full"
                          >
                            <option value="">{t('sales.filters.allChannels')}</option>
                            <option value="OnSite">{t('sales.channels.onSite')}</option>
                            <option value="Truck Delivery">{t('sales.channels.truckDelivery')}</option>
                            <option value="Motorcycle Delivery">{t('sales.channels.motorcycleDelivery')}</option>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <Select
                            value={editingData.activityTypeId || sale.activityTypeId}
                            onChange={(e) => {
                              const selectedActivity = activityTypeMap.get(e.target.value);
                              setEditingData(prev => ({ 
                                ...prev, 
                                activityTypeId: e.target.value,
                                activityTypeName: selectedActivity?.name || 'Unknown Activity'
                              }));
                            }}
                            className="w-full"
                          >
                            <option value="">{t('sales.filters.allActivityTypes')}</option>
                            {activityTypes?.map((type) => (
                              <option key={type.id} value={type.id}>
                                {getTranslatedActivityTypeName(type, t)}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-6 py-4 text-right font-medium font-mono">
                          <TextInput
                            type="number"
                            value={editingData.amountFC || sale.amountFC}
                            onChange={(e) => {
                              const fc = Number(e.target.value);
                              const usd = fc / (editingData.exchangeRate || sale.exchangeRate || 2500);
                              setEditingData(prev => ({ 
                                ...prev, 
                                amountFC: fc,
                                amountUSD: Number(usd.toFixed(2))
                              }));
                            }}
                            className="w-full text-right font-mono"
                          />
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          <TextInput
                            type="number"
                            value={editingData.exchangeRate || sale.exchangeRate || ''}
                            onChange={(e) => {
                              const rate = Number(e.target.value);
                              const fc = editingData.amountFC || sale.amountFC;
                              setEditingData(prev => ({
                                ...prev,
                                exchangeRate: rate,
                                amountUSD: fc ? Number((fc / rate).toFixed(2)) : prev.amountUSD
                              }));
                            }}
                            className="w-full text-center font-mono"
                          />
                        </td>
                        <td className="px-6 py-4 text-right font-medium font-mono">
                          <TextInput
                            type="number"
                            value={editingData.amountUSD || sale.amountUSD}
                            onChange={(e) => {
                              const usd = Number(e.target.value);
                              const rate = editingData.exchangeRate || sale.exchangeRate || 2500;
                              setEditingData(prev => ({ 
                                ...prev, 
                                amountUSD: usd,
                                amountFC: Number((usd * rate).toFixed(2))
                              }));
                            }}
                            className="w-full text-right font-mono"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              color="success"
                              size="xs"
                              onClick={() => handleInlineEdit(sale.id)}
                              className="h-8 w-8 p-0 flex items-center justify-center bg-green-100 text-green-600 hover:bg-green-200 border border-green-200"
                            >
                              <HiCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              color="gray"
                              size="xs"
                              onClick={() => {
                                setEditingRow(null);
                                setEditingData(null);
                              }}
                              className="h-8 w-8 p-0 flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                            >
                              <HiX className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {String(sale.date?.toDate().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) || 'N/A')}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const product = productMap.get(sale.productId);
                            const idx = getColorIdx(product?.productid, productColors);
                            const { bg, text } = productColors[idx];
                            return (
                              <span className={`inline-block ${bg} rounded-lg px-3 py-1 font-semibold ${text}`}>
                                {getTranslatedProductName(product, t)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const idx = getColorIdx(sale.channel, channelColors);
                            const { bg, text } = channelColors[idx];
                            return (
                              <span className={`inline-block ${bg} rounded-lg px-3 py-1 font-semibold ${text}`}>
                                {t(`sales.channels.${sale.channel?.replace(/\s+/g, '').toLowerCase()}`, sale.channel)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const name = activityTypeMap.get(sale.activityTypeId)?.name || 'Unknown Activity';
                            const idx = getColorIdx(name, activityColors);
                            const { bg, text } = activityColors[idx];
                            return (
                              <span className={`inline-block ${bg} rounded-lg px-3 py-1 font-semibold ${text}`}>
                                {getTranslatedActivityTypeName(activityTypeMap.get(sale.activityTypeId), t)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-900 font-mono">
                          {formatCDF(sale.amountFC)}
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          {String(sale.exchangeRate || 'N/A')}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-green-700 font-mono">
                          {String(sale.amountUSD?.toLocaleString('en-US', { 
                            style: 'currency', 
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }) || '$0.00')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              color="info"
                              size="xs"
                              onClick={() => {
                                setEditingRow(sale.id);
                                setEditingData({});
                              }}
                              className="h-8 w-8 p-0 flex items-center justify-center bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
                            >
                              <HiPencil className="h-4 w-4" />
                            </Button>
                            <Button
                              color="failure"
                              size="xs"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this sale?')) {
                                  deleteDoc(doc(firestore, "Sales", sale.id))
                                    .then(handleRefresh);
                                }
                              }}
                              className="h-8 w-8 p-0 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
                            >
                              <HiTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Pagination */}
          {filteredSalesData.data.length > entriesPerPage && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200" style={{backgroundColor: '#eee5db'}}>
              <span className="text-sm text-gray-700">
                {t('sales.table.showing', {
                  start: (currentPage - 1) * entriesPerPage + 1,
                  end: Math.min(currentPage * entriesPerPage, filteredSalesData.data.length),
                  total: filteredSalesData.data.length
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-gray-700 hover:opacity-80 disabled:opacity-50 shadow-sm border border-gray-300" 
                  style={{backgroundColor: '#f6f2ec'}}
                >
                  {t('sales.table.previous')}
                </Button>
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredSalesData.data.length / entriesPerPage)))}
                  disabled={currentPage === Math.ceil(filteredSalesData.data.length / entriesPerPage)}
                  className="text-gray-700 hover:opacity-80 disabled:opacity-50 shadow-sm border border-gray-300"
                  style={{backgroundColor: '#f6f2ec'}}
                >
                  {t('sales.table.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary Section */}
      <div className="mb-6">
        {/* Year & Month Selector */}
        <div className="flex flex-col md:flex-row justify-start md:justify-between items-center gap-4 bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex gap-2 w-full md:w-auto">
            <Select
              value={summaryPeriod.year}
              onChange={(e) => {
                setSummaryPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }));
              }}
              className="w-18 bg-white border-amber-200 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
            <Select
              value={summaryPeriod.month}
              onChange={(e) => {
                setSummaryPeriod(prev => ({ ...prev, month: parseInt(e.target.value) }));
              }}
              className="w-34 bg-white border-amber-200 text-amber-900 focus:border-amber-500 focus:ring-amber-500"
            >
              {MONTHS.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </Select>
          </div>
        </div>
        
        {/* Tabbed Summary Tables */}
        <Card className="overflow-hidden">
          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('products')}
                className={`${
                  activeTab === 'products'
                    ? "border-amber-600 text-stone-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } flex items-center py-4 px-6 border-b-2 font-medium`}
              >
                {t('sales.summary.byProduct')}
              </button>
              <button
                onClick={() => setActiveTab('activities')}
                className={`${
                  activeTab === 'activities'
                    ? "border-amber-500 text-stone-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } flex items-center py-4 px-6 border-b-2 font-medium`}
              >
                {t('sales.summary.byActivityType')}
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`${
                  activeTab === 'channels'
                    ? "border-green-300 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } flex items-center py-4 px-6 border-b-2 font-medium`}
              >
                {t('sales.summary.byChannel')}
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                          <h3 className="text-lg font-semibold mb-4 text-gray-900">{t('sales.summary.byProduct')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-900">
                             <thead className="rounded-lg" style={{backgroundColor: '#f6f2ec'}}>
                 <tr>
                   <th className="px-6 py-3 font-semibold text-base text-gray-900 text-left">{t('sales.fields.product')}</th>
                   <th className="px-6 py-3 font-semibold text-base text-gray-900 text-center">{t('sales.fields.amountUSD')}</th>
                   <th className="px-6 py-3 font-semibold text-base text-gray-900 text-center">{t('common.amount_cdf')}</th>
                   <th className="px-6 py-3 font-semibold text-base text-gray-900 text-center">{t('sales.summary.percentageOfTotal')}</th>
                 </tr>
               </thead>
                             <tbody className="divide-y divide-gray-200">
                 {(() => {
                   const metrics = calculateSalesMetrics(periodData);
                   
                   // Group sales by individual products, then by product type
                   const productSalesMap = periodData.reduce((acc, sale) => {
                     const product = productMap.get(sale.productId);
                     if (!product) return acc;
                     
                     const productType = product.producttype || t('sales.summary.unknownType');
                     const productName = product.productid || t('sales.summary.unknownProduct');
                     
                     if (!acc[productType]) acc[productType] = {};
                     if (!acc[productType][productName]) {
                       acc[productType][productName] = { 
                         totalUSD: 0, 
                         totalCDF: 0, 
                         product 
                       };
                     }
                     
                     acc[productType][productName].totalUSD += sale.amountUSD || 0;
                     acc[productType][productName].totalCDF += sale.amountFC || 0;
                     return acc;
                   }, {});

                   const rows = [];
                   
                   // Process each product type
                   Object.entries(productSalesMap)
                     .sort(([a], [b]) => a.localeCompare(b))
                     .forEach(([productType, products]) => {
                       // Calculate product type totals
                       const productTypeUSD = Object.values(products).reduce((sum, p) => sum + p.totalUSD, 0);
                       const productTypeCDF = Object.values(products).reduce((sum, p) => sum + p.totalCDF, 0);
                       
                       // Add product type header with totals
                       rows.push(
                         <tr key={`header-${productType}`} style={{backgroundColor: '#fdfbf9'}}>
                           <td className="px-6 py-3 font-semibold text-base text-gray-900">
                             {productType}
                           </td>
                           <td className="px-6 py-3 font-semibold text-base text-center">
                             <span className="inline-block rounded-lg px-3 py-2 font-semibold text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#e6d9c9'}}>
                               {productTypeUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                             </span>
                           </td>
                           <td className="px-6 py-3 font-semibold text-base text-center">
                             <span className="inline-block rounded-lg px-3 py-2 font-semibold text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#eee5db'}}>
                               {productTypeCDF.toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                             </span>
                           </td>
                           <td className="px-6 py-3 font-semibold text-base text-center">
                             <span className="inline-block rounded-lg px-3 py-2 font-semibold text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#f6f2ec'}}>
                               {metrics.totalSales.amountUSD > 0 ? ((productTypeUSD / metrics.totalSales.amountUSD) * 100).toFixed(1) : 0}%
                             </span>
                           </td>
                         </tr>
                       );
                       
                       // Add individual products for this type
                       Object.entries(products)
                         .sort(([a], [b]) => a.localeCompare(b))
                         .forEach(([productName, data]) => {
                           rows.push(
                             <tr
                              key={`${productType}-${productName}`}
                              className="transition-all duration-200 border-b border-purple-100 last:border-b-0 bg-white hover:shadow-lg hover:scale-[1.02] hover:bg-white"
                            >
                               <td className="px-6 py-3 font-normal text-base text-gray-900 text-left pl-12">
                                 {getTranslatedProductName(data.product, t)}
                               </td>
                               <td className="px-6 py-3 font-normal text-base text-center">
                                 <span className="inline-block rounded-lg px-3 py-2 font-normal text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#f6f2ec'}}>
                                   {data.totalUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                                 </span>
                               </td>
                               <td className="px-6 py-3 font-normal text-base text-center">
                                 <span className="inline-block rounded-lg px-3 py-2 font-normal text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#f6f2ec'}}>
                                   {(data.totalCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                                 </span>
                               </td>
                               <td className="px-6 py-3 text-center font-normal text-base text-gray-900">
                                 <span className="inline-block rounded-lg px-3 py-2 font-normal text-gray-900 shadow-sm border border-gray-200" style={{backgroundColor: '#f6f2ec'}}>
                                   {metrics.totalSales.amountUSD > 0 ? ((data.totalUSD / metrics.totalSales.amountUSD) * 100).toFixed(1) : 0}%
                                 </span>
                               </td>
                             </tr>
                           );
                         });
                     });

                   // Add total row
                   rows.push(
                     <tr key="total" className="font-semibold border-t-2 border-gray-300" style={{backgroundColor: '#f6f2ec'}}>
                       <td className="px-6 py-3 text-base text-left text-gray-900 font-semibold">Total</td>
                       <td className="px-6 py-3 text-base text-center">
                         <span className="inline-block rounded-lg px-3 py-2 font-semibold text-gray-900 shadow-md border border-gray-200" style={{backgroundColor: '#eee5db'}}>
                           {metrics.totalSales.amountUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                         </span>
                       </td>
                       <td className="px-6 py-3 text-base text-center">
                         <span className="inline-block rounded-lg px-3 py-2 font-semibold text-gray-900 shadow-md border border-gray-200" style={{backgroundColor: '#f6f2ec'}}>
                           {(metrics.totalSales.amountCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                         </span>
                       </td>
                       <td className="px-6 py-3 text-base text-center text-gray-900 font-semibold"></td>
                     </tr>
                   );

                   return rows;
                 })()}
               </tbody>
             </table>
          </div>
                </div>
              )}
            
            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">{t('sales.summary.byActivityType')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-900">
              <thead className="rounded-lg" style={{backgroundColor: '#f8efe6'}}>
                <tr>
                  <th className="px-6 py-3 font-semibold text-left text-amber-900">{t('sales.fields.activityType')}</th>
                  <th className="px-6 py-3 font-semibold text-center text-amber-900">{t('sales.fields.amountUSD')}</th>
                  <th className="px-6 py-3 font-semibold text-center text-amber-900">{t('common.amount_cdf')}</th>
                  <th className="px-6 py-3 font-semibold text-center text-amber-900">{t('sales.summary.percentageOfTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const metrics = calculateSalesMetrics(periodData);
                  // Group sales by activityTypeId
                  const activitySalesMap = periodData.reduce((acc, sale) => {
                    const activityType = activityTypeMap.get(sale.activityTypeId);
                    const normalizedName = activityType?.name ? activityType.name.toLowerCase().replace(/\s+/g, '_') : null;
                    const key = normalizedName || 'undefined';
                    if (!acc[key]) acc[key] = { totalUSD: 0, totalCDF: 0, activityType };
                    acc[key].totalUSD += sale.amountUSD || 0;
                    acc[key].totalCDF += sale.amountFC || 0;
                    return acc;
                  }, {});
                  const rows = Object.entries(activitySalesMap)
                    .filter(([key, data]) => key !== 'undefined')
                    .sort(([, a], [, b]) => b.totalUSD - a.totalUSD)
                    .slice(0, 5) // Limit to 5 rows for consistent height
                                      .map(([key, data], index) => (
                    <tr
                      key={key}
                      className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                        index % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                      } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                    >
                        <td className="px-6 py-4 font-normal text-amber-900 text-left">{getTranslatedActivityTypeName(data.activityType, t)}</td>
                        <td className="px-6 py-4 font-normal text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-normal text-amber-900 shadow-sm border" style={{backgroundColor: '#f4ebe2', borderColor: '#e3c7ab'}}>
                            {data.totalUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-normal text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-normal text-amber-900 shadow-sm border" style={{backgroundColor: '#f4ebe2', borderColor: '#e3c7ab'}}>
                            {(data.totalCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                          </span>
                        </td>
                                                 <td className="px-6 py-4 text-center font-medium text-gray-900">
                           <span className="inline-block rounded-lg px-3 py-2 font-medium text-amber-900 shadow-sm border" style={{backgroundColor: '#f4ebe2', borderColor: '#e3c7ab'}}>
                             {metrics.totalSales.amountUSD>0?((data.totalUSD/metrics.totalSales.amountUSD)*100).toFixed(1):0}%
                           </span>
                         </td>
                      </tr>
                    ));
                  // Add fallback for unknown/missing activityTypeId
                  const unknown = activitySalesMap['undefined'];
                  if (unknown && unknown.totalUSD > 0 && rows.length < 5) {
                    rows.push(
                      <tr
                      key="unknown"
                      className="transition-all duration-200 border-b border-purple-100 bg-white hover:shadow-lg hover:scale-[1.02] hover:bg-white"
                    >
                        <td className="px-6 py-4 font-medium text-gray-900 text-center">{t('common.undefined', 'Non défini')}</td>
                        <td className="px-6 py-4 font-medium text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-medium text-amber-900 shadow-sm border" style={{backgroundColor: '#e3c7ab', borderColor: '#e1c4a5'}}>
                            {unknown.totalUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-medium text-amber-900 shadow-sm border" style={{backgroundColor: '#e5ceb7', borderColor: '#e3c7ab'}}>
                            {(unknown.totalCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                          </span>
                        </td>
                                                 <td className="px-6 py-4 text-center font-medium text-gray-900">
                           <span className="inline-block rounded-lg px-3 py-2 font-semibold text-amber-900 shadow-sm border" style={{backgroundColor: '#e1c4a5', borderColor: '#e3c7ab'}}>
                             {metrics.totalSales.amountUSD>0?((unknown.totalUSD/metrics.totalSales.amountUSD)*100).toFixed(1):0}%
                           </span>
                         </td>
                      </tr>
                    );
                  }
                  
                  // Add empty rows to maintain consistent height (5 rows total)
                  const emptyRowsNeeded = Math.max(0, 5 - rows.length);
                  for (let i = 0; i < emptyRowsNeeded; i++) {
                    rows.push(
                      <tr key={`empty-activity-${i}`} className="h-12">
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                      </tr>
                    );
                  }
                  
                  return (
                    <>
                      {rows}
                      <tr className="font-semibold border-t-2" style={{backgroundColor: '#f8efe6', borderColor: '#e3c7ab'}}>
                        <td className="px-6 py-4 text-base text-left text-amber-900">Total </td>
                        <td className="px-6 py-4 text-base text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-semibold text-amber-900 shadow-md border" style={{backgroundColor: '#e1c4a5', borderColor: '#e3c7ab'}}>
                            {metrics.totalSales.amountUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2})}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-center">
                          <span className="inline-block rounded-lg px-3 py-2 font-semibold text-amber-900 shadow-md border" style={{backgroundColor: '#e3c7ab', borderColor: '#e1c4a5'}}>
                            {(metrics.totalSales.amountCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0})}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-center text-amber-900 font-bold"></td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
                </div>
              )}
            
            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div>
          <h3 className="text-lg font-semibold mb-4 text-green-900">{t('sales.summary.byChannel')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-900">
              <thead className="bg-green-50 rounded-lg">
                <tr>
                  <th className="px-6 py-3 font-semibold text-left">{t('sales.fields.channel')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('sales.fields.amountUSD')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('common.amount_cdf')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('sales.summary.percentageOfTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {(() => {
                  const metrics = calculateSalesMetrics(periodData);
                  const channelSales = periodData.reduce((acc, sale) => {
                    const channel = sale.channel || 'Unknown';
                    if (!acc[channel]) {
                      acc[channel] = {
                        totalUSD: 0,
                        totalCDF: 0,
                        count: 0
                      };
                    }
                    acc[channel].totalUSD += sale.amountUSD || 0;
                    acc[channel].totalCDF += sale.amountFC || 0;
                    acc[channel].count++;
                    return acc;
                  }, {});
                  const rows = Object.entries(channelSales)
                    .sort(([, a], [, b]) => b.totalUSD - a.totalUSD)
                    .slice(0, 5) // Limit to 5 rows for consistent height
                                      .map(([channel, data], index) => (
                    <tr
                      key={channel}
                      className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${
                        index % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'
                      } hover:shadow-lg hover:scale-[1.02] hover:bg-white`}
                    >
                        <td className="px-6 py-4 font-normal text-green-900 text-left">{t(`sales.channels.${channel}`, channel)}</td>
                        <td className="px-6 py-4 text-center font-normal text-green-900">
                          <span className="inline-block rounded-lg bg-green-50 px-3 py-2 font-normal text-green-900 shadow-sm border border-green-100">
                            {String(data.totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-normal text-green-900">
                          <span className="inline-block rounded-lg bg-green-50 px-3 py-2 font-normal text-green-900 shadow-sm border border-green-100">
                            {String((data.totalCDF || 0).toLocaleString('en-US', { style: 'currency', currency: 'CDF', maximumFractionDigits: 0 }))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-green-900">
                          <span className="inline-block rounded-lg bg-green-50 px-3 py-2 font-medium text-green-900 shadow-sm border border-green-100">
                            {String(((data.totalUSD / metrics.totalSales.amountUSD) * 100).toFixed(1))}%
                          </span>
                        </td>
                      </tr>
                    ));
                  
                  // Add empty rows to maintain consistent height (5 rows total)
                  const emptyRowsNeeded = Math.max(0, 5 - rows.length);
                  for (let i = 0; i < emptyRowsNeeded; i++) {
                    rows.push(
                      <tr key={`empty-channel-${i}`} className="h-12">
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                        <td className="px-6 py-4">&nbsp;</td>
                      </tr>
                    );
                  }
                  
                  return (
                    <>
                      {rows}
                      <tr className="bg-green-50 font-semibold border-t-2 border-green-200">
                        <td className="px-6 py-4 text-base text-left">Total</td>
                        <td className="px-6 py-4 text-base text-center">
                          <span className="inline-block rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-900 shadow-sm border border-green-100">
                            {String(metrics.totalSales.amountUSD.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-center">
                          <span className="inline-block rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-900 shadow-sm border border-green-100">
                            {String((metrics.totalSales.amountCDF || 0).toLocaleString('en-US',{style:'currency',currency:'CDF',maximumFractionDigits:0}))}
                          </span>
                        </td>
                        <td className="px-6 py-4 bg-green-50 text-base text-center shadow-sm border border-green-100"></td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
                </div>
              )}
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-[#4c5c68] text-center">{t('sales.charts.trend')}</h3>
          <div className="h-[350px]">
            <ClientOnly>
              {(() => {
                const salesByDate = periodData.reduce((acc, sale) => {
                  const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
                  const timestamp = date.getTime();
                  if (!acc[timestamp]) {
                    acc[timestamp] = {
                      totalUSD: 0,
                      count: 0
                    };
                  }
                  acc[timestamp].totalUSD += sale.amountUSD || 0;
                  acc[timestamp].count++;
                  return acc;
                }, {});
                const sortedEntries = Object.entries(salesByDate).sort(([a], [b]) => Number(a) - Number(b));
                if (sortedEntries.length === 0) {
                  return <div className="h-full flex items-center justify-center text-gray-400">{t('common.noData', 'Pas de données')}</div>;
                }
                const series = [{
                  name: 'Sales',
                  data: sortedEntries.map(([timestamp, data]) => ({
                    x: Number(timestamp),
                    y: data.totalUSD
                  }))
                }];
                return (
                  <Chart 
                    options={getChartOptions(t)}
                    series={series}
                    type="area"
                    height="100%"
                  />
                );
              })()}
            </ClientOnly>
          </div>
        </Card>

        {/* Sales Distribution Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-[#4c5c68] text-center">{t('sales.charts.byActivity')}</h3>
          <div className="h-[350px]">
            <ClientOnly>
              {(() => {
                const activitySales = {};
                periodData.forEach(sale => {
                  const activityName = activityTypeMap.get(sale.activityTypeId)?.name || 'Other';
                  if (!activitySales[activityName]) {
                    activitySales[activityName] = 0;
                  }
                  activitySales[activityName] += sale.amountUSD || 0;
                });
                const data = Object.entries(activitySales)
                  .map(([name, value]) => ({
                    x: name,
                    y: value
                  }))
                  .sort((a, b) => b.y - a.y)
                  .slice(0, 6);
                if (data.length === 0) {
                  return <div className="text-gray-400">{t('common.noData', 'Pas de données')}</div>;
                }
                const series = [{
                  name: 'Sales',
                  data: data.map(item => item.y)
                }];
                
                const chartOptions = {
                  ...getActivityTypeChartOptions(t),
                  xaxis: {
                    ...getActivityTypeChartOptions(t).xaxis,
                    categories: data.map(item => getTranslatedActivityTypeName({ name: item.x }, t))
                  }
                };
                
                return (
                  <Chart
                    options={chartOptions}
                    series={series}
                    type="bar"
                    height="100%"
                  />
                );
              })()}
            </ClientOnly>
          </div>
        </Card>
      </div>

      {/* Add Mass Edit Panel */}
      {selectedItems.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              {t('sales.massEdit.title', { count: selectedItems.length })}
            </h3>
            <Button
              color="gray"
              size="sm"
              onClick={() => setMassEditMode(!massEditMode)}
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 font-medium"
            >
              {massEditMode ? t('sales.massEdit.cancel') : t('sales.massEdit.edit')}
            </Button>
          </div>
          
          {massEditMode && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="massDate">Date</Label>
                <TextInput
                  id="massDate"
                  type="date"
                  value={massEditData.date}
                  onChange={(e) => setMassEditData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="massChannel">Channel</Label>
                <Select
                  id="massChannel"
                  value={massEditData.channel}
                  onChange={(e) => setMassEditData(prev => ({ ...prev, channel: e.target.value }))}
                >
                  <option value="">No Change</option>
                  <option value="OnSite">On-Site</option>
                  <option value="Truck Delivery">Truck Delivery</option>
                  <option value="Motorcycle Delivery">Motorcycle Delivery</option>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="massActivityType">Activity Type</Label>
                <Select
                  id="massActivityType"
                  value={massEditData.activityTypeId}
                  onChange={(e) => setMassEditData(prev => ({ ...prev, activityTypeId: e.target.value }))}
                >
                  <option value="">No Change</option>
                  {activityTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {t(`sales.activityTypes.${type.id}`) !== `sales.activityTypes.${type.id}` ? t(`sales.activityTypes.${type.id}`) : type.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={handleMassEdit}
                  disabled={isSubmitting || !Object.values(massEditData).some(Boolean)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isSubmitting ? 'Updating...' : 'Update Selected'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}