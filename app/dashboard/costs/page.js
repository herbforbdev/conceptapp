"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Card,
  Button,
  Select,
  TextInput,
} from 'flowbite-react';
import Link from 'next/link';
import {
  getCosts,
  updateCost,
  deleteCost,
  batchDeleteCosts,
} from '@/services/firestore/costsService';
import { useMasterData } from '@/hooks/useMasterData';
import { useLanguage } from '@/context/LanguageContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  HiPencil,
  HiTrash,
  HiCheck,
  HiX,
  HiPlus,
  HiCurrencyDollar,
  HiTrendingUp,
  HiTrendingDown,
  HiInbox,
  HiRefresh,
} from 'react-icons/hi';
import TopCard from "@/components/shared/TopCard";
import TableHeader from "@/components/shared/TableHeader";
import { TIME_PERIODS } from '@/lib/constants/timePeriods';
import dynamic from 'next/dynamic';
import { getTranslatedChartOptions } from '@/components/shared/ChartTitle';


// Dynamic import for ApexCharts
const Chart = dynamic(() => import('../../../app/apexcharts'), { ssr: false });

// React Query client
const queryClient = new QueryClient();

export default function CostsPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <CostsPage />
    </QueryClientProvider>
  );
}

function CostsPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // Tab state for summary section
  const [summaryTab, setSummaryTab] = useState('tables');
  
  // Initialize state with default values
  const [filters, setFilters] = useState({
    selectedMonth: '',
    selectedYear: new Date().getFullYear(),
    selectedTimePeriod: TIME_PERIODS.MONTH,
    dateFilters: { startDate: new Date(), endDate: new Date() },
    selectedActivityType: '',
    selectedExpenseType: '',
    selectedStatus: ''
  });

  // Summary section state
  const [summaryMonth, setSummaryMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('summary_selectedMonth');
      return saved !== null ? Number(saved) : new Date().getMonth();
    }
    // fallback for SSR
    return new Date().getMonth();
  });
  const [summaryYear, setSummaryYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('summary_selectedYear');
      return saved !== null ? Number(saved) : new Date().getFullYear();
    }
    // fallback for SSR
    return new Date().getFullYear();
  });

  // Save summary filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('summary_selectedMonth', summaryMonth);
      localStorage.setItem('summary_selectedYear', summaryYear);
    }
  }, [summaryMonth, summaryYear]);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMonth = localStorage.getItem('costs_selectedMonth');
      const savedYear = localStorage.getItem('costs_selectedYear');
      const savedFilters = localStorage.getItem('costs_filters');

      if (savedFilters) {
        try {
          const parsedFilters = JSON.parse(savedFilters);
          setFilters(prev => ({ ...prev, ...parsedFilters }));
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }

      if (savedMonth) {
        setFilters(prev => ({ ...prev, selectedMonth: savedMonth }));
      }

      if (savedYear) {
        setFilters(prev => ({ ...prev, selectedYear: parseInt(savedYear) }));
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
        if (typeof window !== 'undefined') {
      localStorage.setItem('costs_filters', JSON.stringify(filters));
      localStorage.setItem('costs_selectedMonth', filters.selectedMonth);
      localStorage.setItem('costs_selectedYear', filters.selectedYear);
    }
  }, [filters]);

  // Move PERIOD_LABELS and getPeriodLabel here so t is always defined
  const PERIOD_LABELS = {
    ALL: t('costs.periods.all'),
    YEAR: t('costs.periods.year'),
    MONTH: t('costs.periods.month'),
    PREVIOUS_MONTH: t('costs.periods.previous_month'),
    QUARTERLY: t('costs.periods.quarterly'),
    WEEK: t('costs.periods.week'),
    TODAY: t('costs.periods.today'),
    CUSTOM: t('costs.periods.custom')
  };
  const getPeriodLabel = (key) => PERIOD_LABELS[key] || key;

  // Move CARD_STYLES here so it is always defined in the component scope - Updated with neutral grey palette
  const CARD_STYLES = {
    totalCosts: {
      bg: 'bg-[#FCF8F8]',
      text: 'text-black',
      iconWrapper: '',
      icon: (
        <span className="bg-white/10 backdrop-blur-sm p-2 rounded-lg flex items-center justify-center border border-white/20">
          <HiCurrencyDollar className="h-7 w-7 text-black" />
        </span>
      ),
      border: 'border-[#FCF8F8]',
      title: 'text-black text-base font-medium uppercase tracking-wider mt-4',
      value: 'text-2xl font-bold text-black',
      subValue: 'text-black/80 font-semibold'
    },
    dailyAverage: {
      bg: 'bg-[#FCF8F8]',
      text: 'text-black',
      iconWrapper: '',
      icon: (
        <span className="bg-white/10 backdrop-blur-sm p-2 rounded-lg flex items-center justify-center border border-white/20">
          <HiTrendingUp className="h-7 w-7 text-black" />
        </span>
      ),
      border: 'border-[#FCF8F8]',
      title: 'text-black text-sm font-medium uppercase tracking-wider mt-4',
      value: 'text-2xl font-bold text-black',
      subValue: 'text-black/80 font-semibold'
    },
    topExpense: {
      bg: 'bg-[#FCF8F8]',
      text: 'text-black',
      iconWrapper: '',
      icon: (
        <span className="bg-white/10 backdrop-blur-sm p-2 rounded-lg flex items-center justify-center border border-white/20">
          <HiInbox className="h-7 w-7 text-black" />
        </span>
      ),
      border: 'border-[#FCF8F8]',
      title: 'text-black text-sm font-medium uppercase tracking-wider mt-4',
      value: 'text-2xl font-bold text-black',
      subValue: 'text-black/80 font-semibold'
    },
    growth: {
      up: {
        bg: 'bg-[#FCF8F8]',
        text: 'text-white',
        iconWrapper: '',
        icon: (
          <span className="bg-white/10 backdrop-blur-sm p-2 rounded-lg flex items-center justify-center border border-white/20">
            <HiTrendingUp className="h-7 w-7 text-white" />
          </span>
        ),
        border: 'border-[#FCF8F8]',
        title: 'text-black text-sm font-medium uppercase tracking-wider mt-4',
        value: 'text-2xl font-bold text-black',
        subValue: 'text-black/80 font-semibold'
      },
      down: {
        bg: 'bg-[#FCF8F8]',
        text: 'text-[#212529]',
        iconWrapper: '',
        icon: (
          <span className="bg-[#212529]/10 p-2 rounded-lg flex items-center justify-center border border-[#212529]/20">
            <HiTrendingDown className="h-7 w-7 text-[#212529]" />
          </span>
        ),
        border: 'border-[#FCF8F8]',
        title: 'text-black text-sm font-medium uppercase tracking-wider mt-4',
        value: 'text-2xl font-bold text-black',
        subValue: 'text-black/80 font-semibold'
      }
    }
  };

  // Move tealCardColors and getTealColorIdx here so they are always defined in the component scope - Updated with neutral grey palette
  const tealCardColors = [
    { bg: 'bg-[#e9ecef]', text: 'text-[#212529]' },
    { bg: 'bg-[#dee2e6]', text: 'text-[#495057]' },
    { bg: 'bg-[#ced4da]', text: 'text-[#343a40]' },
    { bg: 'bg-[#adb5bd]', text: 'text-[#212529]' },
    { bg: 'bg-[#6c757d]', text: 'text-white' },
    { bg: 'bg-[#495057]', text: 'text-white' },
    { bg: 'bg-[#343a40]', text: 'text-white' },
    { bg: 'bg-[#212529]', text: 'text-white' }
  ];

  // Helper function to safely convert various date formats to Date objects
  function toDateObj(date) {
    if (!date) return new Date();
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date;
    return new Date(date); // String or other formats
  }

  // Helper function to get translated expense type names
  function getTranslatedExpenseTypeName(expenseType, t) {
    if (!expenseType) return 'N/A';
    const name = expenseType.name || expenseType;
    if (!name) return 'N/A';
    
    // First try hardcoded translation map for existing entries
    const expenseTypeTranslationMap = {
      "Generator Fuel": "generator_fuel",
      "Maintenance & Repairs of Machines": "maintenance_&_repairs_of_machines",
      "Maintenance et réparations des machines": "entretien_&_réparations_des_machines",
      "Electricity": "electricity",
      "Water": "water",
      "Salaries": "salaries",
      "Transport": "transport",
      "Office Supplies": "office_supplies",
      "Marketing": "marketing",
      "Insurance": "insurance",
      "Rent": "rent",
      "Other": "other"
    };
    
    if (expenseTypeTranslationMap[name]) {
      const translated = t(`masterData.expenses.types.${expenseTypeTranslationMap[name]}`, '');
      if (translated && translated !== `masterData.expenses.types.${expenseTypeTranslationMap[name]}`) {
        return translated;
      }
    }
    
    // Try dynamic key generation for new entries
    const keyVariations = [
      // Original name with underscores and ampersands
      name.replace(/\s+/g, '_').replace(/&/g, '&').toLowerCase(),
      // Original name with underscores and & symbols
      name.replace(/\s+/g, '_').replace(/&/g, '_&_').toLowerCase(),
      // Original name with underscores only
      name.replace(/\s+/g, '_').replace(/&/g, '').toLowerCase(),
      // CamelCase version
      name.replace(/\s+/g, '').replace(/&/g, ''),
      // Direct French translations that exist in JSON
      name.toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/à/g, 'a').replace(/ç/g, 'c')
    ];
    
    // Try each variation
    for (const key of keyVariations) {
      const translated = t(`masterData.expenses.types.${key}`, '');
      if (translated && translated !== `masterData.expenses.types.${key}`) {
        return translated;
      }
    }
    
    // Fallback to original name (perfect for French entries added via master-data page)
    return name;
  }

  // Helper function to get translated activity type names  
  function getTranslatedActivityTypeName(activityType, t) {
    if (!activityType) return 'N/A';
    const name = activityType.name || activityType;
    if (!name) return 'N/A';
    
    // First try hardcoded translation map for existing entries
    const activityTypeTranslationMap = {
      "Block Ice": "block_ice",
      "Cube Ice & Water Bottling": "cube_ice_water_bottling"
    };
    
    if (activityTypeTranslationMap[name]) {
      const translated = t(`masterData.activities.${activityTypeTranslationMap[name]}`, '');
      if (translated && translated !== `masterData.activities.${activityTypeTranslationMap[name]}`) {
        return translated;
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
      name.replace(/\s+/g, '').toLowerCase()
    ];
    
    // Try each variation - activities are directly under masterData.activities, not under types
    for (const key of keyVariations) {
      const translated = t(`masterData.activities.${key}`, '');
      if (translated && translated !== `masterData.activities.${key}`) {
        return translated;
      }
    }
    
    // Also try under types structure for backward compatibility
    for (const key of keyVariations) {
      const translated = t(`masterData.activities.types.${key}`, '');
      if (translated && translated !== `masterData.activities.types.${key}`) {
        return translated;
      }
    }
    
    // Fallback to original name (perfect for French entries added via master-data page)
    return name;
  }

  function getTealColorIdx(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % tealCardColors.length;
  }

  // Move formatCDF here so it is always defined in the component scope
  function formatCDF(amount) {
    if (!amount) return "0 CDF";
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Format FC amounts with proper thousands separators and FC suffix
  function formatFC(amount) {
    if (!amount) return "0 FC";
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + " FC";
  }

  // Move getCurrencySymbol here so it is always defined in the component scope
  function getCurrencySymbol(locale) {
    if (locale === 'fr' || (typeof locale === 'string' && locale.startsWith('fr'))) return 'FC';
    return 'CDF';
  }

  // Move ClientOnly here so it is always defined in the component scope
  const ClientOnly = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return children;
  };

  // Basic state
  const [selectedPeriod, setSelectedPeriod] = useState('MONTH');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate, endDate };
  });

  // Fetch master data
  const { 
    expenseTypes, 
    activityTypes, 
    expenseTypeMap, 
    activityTypeMap, 
    loading: masterDataLoading,
    products,
    productMap
  } = useMasterData();

  // Fetch costs data
  const { data: costs = [], isLoading } = useQuery({
    queryKey: ['costs', dateRange.startDate, dateRange.endDate],
    queryFn: () => getCosts(dateRange.startDate, dateRange.endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });



  // Compute available years for the records filter bar (from costs data)
  const availableRecordYears = useMemo(() => {
    if (!costs) return [];
    const yearsSet = new Set();
    costs.forEach(cost => {
      const date = cost.date?.toDate ? cost.date.toDate() : new Date(cost.date);
      yearsSet.add(date.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [costs]);

  // Filter costs for records table
  const filteredCosts = useMemo(() => {
    if (!costs) return [];
    return costs.filter(cost => {
      const date = toDateObj(cost.date);
      const monthMatch = filters.selectedMonth 
        ? date.getMonth() === parseInt(filters.selectedMonth) - 1 
        : true;
      const yearMatch = filters.selectedYear 
        ? date.getFullYear() === parseInt(filters.selectedYear) 
        : true;
      const activityTypeMatch = filters.selectedActivityType
        ? cost.activityTypeId === filters.selectedActivityType
        : true;
      const expenseTypeMatch = filters.selectedExpenseType
        ? cost.expenseTypeId === filters.selectedExpenseType
        : true;
      return monthMatch && yearMatch && activityTypeMatch && expenseTypeMatch;
    });
  }, [costs, filters.selectedMonth, filters.selectedYear, filters.selectedActivityType, filters.selectedExpenseType]);

  // Add sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Add sorting function
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Add sorted costs
  const sortedCosts = useMemo(() => {
    const sorted = [...filteredCosts];
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    return sorted.sort((a, b) => {
      switch (sortConfig.key) {
        case 'date':
          return direction * (toDateObj(a.date).getTime() - toDateObj(b.date).getTime());
        case 'activity':
          const activityA = String(activityTypeMap.get(a.activityTypeId)?.name || '');
          const activityB = String(activityTypeMap.get(b.activityTypeId)?.name || '');
          return direction * activityA.localeCompare(activityB);
        case 'expense':
          const expenseA = String(expenseTypeMap.get(a.expenseTypeId)?.name || '');
          const expenseB = String(expenseTypeMap.get(b.expenseTypeId)?.name || '');
          return direction * expenseA.localeCompare(expenseB);
        case 'amountFC':
          return direction * ((a.amountFC || 0) - (b.amountFC || 0));
        case 'amountUSD':
          return direction * ((a.amountUSD || 0) - (b.amountUSD || 0));
        default:
          return 0;
      }
    });
  }, [filteredCosts, sortConfig, activityTypeMap, expenseTypeMap]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(sortedCosts.length / entriesPerPage);
  }, [sortedCosts, entriesPerPage]);

  // Calculate pagination indexes
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;

  // Get paginated data
  const paginatedCosts = useMemo(() => {
    return sortedCosts.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedCosts, indexOfFirstItem, indexOfLastItem]);

  // Pagination helper functions
  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  // Month selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('costs_selectedMonth');
      return saved !== null ? Number(saved) : now.getMonth();
    }
    return now.getMonth();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('costs_selectedYear');
      return saved !== null ? Number(saved) : now.getFullYear();
    }
    return now.getFullYear();
  });
  const MONTHS = [
    t('months.january'),
    t('months.february'),
    t('months.march'),
    t('months.april'),
    t('months.may'),
    t('months.june'),
    t('months.july'),
    t('months.august'),
    t('months.september'),
    t('months.october'),
    t('months.november'),
    t('months.december'),
  ];

  // Update dateRange when month/year changes
  useEffect(() => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    setDateRange({ startDate: start, endDate: end });
  }, [selectedMonth, selectedYear]);

  // Handle period selection
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    // setDateRange(getDefaultDateRange(period));
  };

  // Refresh handler
  const handleRefresh = () => {
    queryClient.invalidateQueries(['costs']);
  };

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState([]);
  // Add selectAll state for the select all checkbox
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (sortedCosts.length > 0 && selectedItems.length === sortedCosts.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedItems, sortedCosts]);

  // Add isDeleting state for bulk/single delete
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!selectedItems.length) return;
    if (!window.confirm(t('costs.confirm.delete_multiple'))) return;
    setIsDeleting(true);
    try {
      await batchDeleteCosts(selectedItems);
      setSelectedItems([]);
      handleRefresh();
    } catch (e) {
      // handle error
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk edit handler (placeholder)
  const handleBulkEdit = () => {
    // TODO: Implement bulk edit modal or inline edit
    alert('Bulk edit not implemented yet.');
  };

  // Inline edit state
  const [editingRow, setEditingRow] = useState(null);
  const [editingData, setEditingData] = useState({});
  const startEditing = (row) => {
    setEditingRow(row.id);
    setEditingData({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : toDateObj(row.date).toISOString().split('T')[0],
      activityTypeId: row.activityTypeId,
      expenseTypeId: row.expenseTypeId,
      amountFC: row.amountFC,
      amountUSD: row.amountUSD,
      exchangeRate: row.exchangeRate,
    });
  };
  const cancelEditing = () => { setEditingRow(null); setEditingData({}); };
  const saveEditing = async (id) => {
    await updateCost(id, editingData);
    setEditingRow(null);
    setEditingData({});
    handleRefresh();
  };

  // Single row delete handler
  const handleDelete = async (id) => {
    if (!window.confirm(t('costs.confirm.delete_single'))) return;
    setIsDeleting(true);
    try {
      await deleteCost(id);
      handleRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter costs for summary section
  const summaryFilteredCosts = useMemo(() => {
    if (!costs) return [];
    return costs.filter(cost => {
      if (!cost.date) return false;
      // Use same date parsing as cost trends page for consistency
      const costDate = cost.date.seconds ? new Date(cost.date.seconds * 1000) : toDateObj(cost.date);
      const costMonth = costDate.getMonth();
      const costYear = costDate.getFullYear();
      return costMonth === summaryMonth && costYear === summaryYear;
    });
  }, [costs, summaryMonth, summaryYear]);

  // Calculate costs by type using summary filtered costs
  const costsByType = useMemo(() => {
    if (!summaryFilteredCosts?.length) return { categories: [], data: [] };
    
    const typeTotals = {};
    summaryFilteredCosts.forEach(cost => {
      const type = expenseTypeMap.get(cost.expenseTypeId);
      const translatedName = getTranslatedExpenseTypeName(type, t);
      const usd = Number(cost.amountUSD) || 0;
      typeTotals[translatedName] = (typeTotals[translatedName] || 0) + usd;
    });

    const categories = Object.keys(typeTotals);
    const data = categories.map(type => typeTotals[type]);

    return { categories, data };
  }, [summaryFilteredCosts, expenseTypeMap, t]);

  // Calculate costs by activity type using summary filtered costs
  const costsByActivityType = useMemo(() => {
    if (!summaryFilteredCosts?.length) return { categories: [], data: [] };
    
    const activityTotals = {};
    summaryFilteredCosts.forEach(cost => {
      const activity = activityTypeMap.get(cost.activityTypeId);
      const translatedName = getTranslatedActivityTypeName(activity, t);
      const usd = Number(cost.amountUSD) || 0;
      activityTotals[translatedName] = (activityTotals[translatedName] || 0) + usd;
    });

    const categories = Object.keys(activityTotals);
    const data = categories.map(activity => activityTotals[activity]);

    return { categories, data };
  }, [summaryFilteredCosts, activityTypeMap, t]);

  // 1. Log filteredCosts.length
  useEffect(() => {
    console.log('Filtered Costs Count:', filteredCosts.length);
  }, [filteredCosts]);

  // 2. Log costsByType structure
  useEffect(() => {
    console.log('costsByType:', costsByType);
  }, [costsByType]);

  // 3. Log each cost's date validity
  useEffect(() => {
    filteredCosts.forEach(c => {
      const d = c.date?.toDate?.() ?? new Date(c.date);
      console.log('Cost Date:', d.toISOString(), 'Valid:', !isNaN(d));
    });
  }, [filteredCosts]);

  // 4. Log each cost's amountUSD and type
  useEffect(() => {
    filteredCosts.forEach(c => {
      console.log('USD Amount:', c.amountUSD, typeof c.amountUSD);
    });
  }, [filteredCosts]);

  // Default chart data structure
  const defaultChartData = {
    byType: {
      series: [],
      labels: []
    },
    byActivity: {
      series: [],
      labels: []
    }
  };

  // Update chart options with translations
  const chartOptions = useMemo(() => ({
    ...getTranslatedChartOptions(t),
    // Add any additional chart-specific options here
  }), [t]);

  // Calculate chart data from summary filtered costs
  const chartData = useMemo(() => {
    if (!summaryFilteredCosts?.length) return defaultChartData;

    // Group costs by date for the trend chart
    const costsByDate = summaryFilteredCosts.reduce((acc, cost) => {
      const date = toDateObj(cost.date);
      const timestamp = date.getTime();
      if (!acc[timestamp]) {
        acc[timestamp] = { amountUSD: 0 };
      }
      acc[timestamp].amountUSD += Number(cost.amountUSD) || 0;
      return acc;
    }, {});

    // Convert to series data format
    const seriesData = Object.entries(costsByDate)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([timestamp, data]) => ({
        x: Number(timestamp),
        y: data.amountUSD
      }));

    return {
      byType: {
        ...defaultChartData.byType,
        series: [{
          name: 'Total Costs',
          data: seriesData
        }]
      },
      byActivity: defaultChartData.byActivity
    };
  }, [summaryFilteredCosts]);

  // Add metrics calculation using summary filtered costs
  const metrics = useMemo(() => {
    if (!summaryFilteredCosts?.length) return {
      totalSales: { amountUSD: 0, amountFC: 0 },
      averageSale: { amountUSD: 0 },
      bestSellingProduct: { type: 'N/A', amount: 0 },
      salesGrowth: { growth: 0, trend: 'neutral' }
    };

    // Calculate total costs
    const totalUSD = summaryFilteredCosts.reduce((sum, cost) => sum + (Number(cost.amountUSD) || 0), 0);
    const totalFC = summaryFilteredCosts.reduce((sum, cost) => sum + (Number(cost.amountFC) || 0), 0);

    // Calculate daily average
    const dates = new Set(summaryFilteredCosts.map(cost => {
      const date = toDateObj(cost.date);
      return date.toISOString().split('T')[0];
    }));
    const dailyAverage = totalUSD / Math.max(dates.size, 1);

    // Find top expense type
    const expenseTypeTotals = summaryFilteredCosts.reduce((acc, cost) => {
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      const translatedName = getTranslatedExpenseTypeName(expenseType, t);
      if (!acc[translatedName]) acc[translatedName] = 0;
      acc[translatedName] += Number(cost.amountUSD) || 0;
      return acc;
    }, {});

    const [topExpenseType, topExpenseAmount] = Object.entries(expenseTypeTotals)
      .sort(([, a], [, b]) => b - a)[0] || ['N/A', 0];
    const translatedTopExpenseType = getTranslatedExpenseTypeName({ name: topExpenseType }, t);

    // Calculate month-over-month growth
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthCosts = summaryFilteredCosts.filter(cost => {
      const date = toDateObj(cost.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const lastMonthCosts = summaryFilteredCosts.filter(cost => {
      const date = toDateObj(cost.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const currentMonthTotal = currentMonthCosts.reduce((sum, cost) => sum + (Number(cost.amountUSD) || 0), 0);
    const lastMonthTotal = lastMonthCosts.reduce((sum, cost) => sum + (Number(cost.amountUSD) || 0), 0);

    const growth = lastMonthTotal === 0 ? 0 : ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return {
      totalSales: { amountUSD: totalUSD, amountFC: totalFC },
      averageSale: { amountUSD: dailyAverage },
      bestSellingProduct: { type: translatedTopExpenseType, amount: topExpenseAmount },
      salesGrowth: { 
        growth,
        trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'
      }
    };
  }, [summaryFilteredCosts, expenseTypeMap, t]);

  // Calculate summary data using summary filtered costs
  const summaryTableData = useMemo(() => {
    if (!summaryFilteredCosts?.length || !expenseTypeMap) return {};
    return summaryFilteredCosts.reduce((acc, cost) => {
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      const translatedName = getTranslatedExpenseTypeName(expenseType, t);
      if (!acc[translatedName]) {
        const budgetCode = expenseType?.budget ? Number(expenseType.budget) : null;
        acc[translatedName] = {
          amountUSD: 0,
          amountFC: 0,
          expenseTypeId: cost.expenseTypeId,
          budgetCode: budgetCode
        };
      }
      acc[translatedName].amountUSD += Number(cost.amountUSD) || 0;
      acc[translatedName].amountFC += Number(cost.amountFC) || 0;
      return acc;
    }, {});
  }, [summaryFilteredCosts, expenseTypeMap, t]);

  // Update the filter bar handlers
  const handleMonthChange = (e) => {
    setFilters(prev => ({ ...prev, selectedMonth: e.target.value }));
  };

  const handleYearChange = (e) => {
    setFilters(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }));
  };

  // Update the summary section handlers
  const handleSummaryMonthChange = (e) => {
    setSummaryMonth(Number(e.target.value));
  };

  const handleSummaryYearChange = (e) => {
    setSummaryYear(Number(e.target.value));
  };

  // Calculate category summary
  const categorySummary = useMemo(() => {
    if (!summaryFilteredCosts?.length || !expenseTypeMap) return {};
    return summaryFilteredCosts.reduce((acc, cost) => {
      const expenseType = expenseTypeMap.get(cost.expenseTypeId);
      const category = expenseType?.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = {
          amountUSD: 0,
          amountFC: 0,
          count: 0
        };
      }
      acc[category].amountUSD += Number(cost.amountUSD) || 0;
      acc[category].amountFC += Number(cost.amountFC) || 0;
      acc[category].count += 1;
      return acc;
    }, {});
  }, [summaryFilteredCosts, expenseTypeMap]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('costs.dashboard')}</h1>
      </div>

      {/* Top Cards - Single Row, Translated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <TopCard 
          title={safeT(t, 'dashboard.summary.total_costs', 'Total Costs')}
          value={metrics.totalSales.amountUSD.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD',
            maximumFractionDigits: 0
          })}
          subValue={metrics.totalSales.amountFC.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'CDF',
            maximumFractionDigits: 0
          })}
          icon={CARD_STYLES.totalCosts.icon}
          type="totalCosts"
          className={`${CARD_STYLES.totalCosts.bg} border-2 ${CARD_STYLES.totalCosts.border} ${CARD_STYLES.totalCosts.text} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 p-6 rounded-2xl`}
          titleClassName={CARD_STYLES.totalCosts.title}
          valueClassName={CARD_STYLES.totalCosts.value}
          subValueClassName={CARD_STYLES.totalCosts.subValue}
          iconWrapperClassName={CARD_STYLES.totalCosts.iconWrapper}
        />
        <TopCard 
          title={safeT(t, 'dashboard.summary.daily_costs', 'Daily Average')}
          value={metrics.averageSale.amountUSD.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
          subValue={safeT(t, 'common.per_day', 'per day')}
          icon={CARD_STYLES.dailyAverage.icon}
          type="dailyAverage"
          className={`${CARD_STYLES.dailyAverage.bg} border-2 ${CARD_STYLES.dailyAverage.border} ${CARD_STYLES.dailyAverage.text} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 p-6 rounded-2xl`}
          titleClassName={CARD_STYLES.dailyAverage.title}
          valueClassName={CARD_STYLES.dailyAverage.value}
          subValueClassName={CARD_STYLES.dailyAverage.subValue}
          iconWrapperClassName={CARD_STYLES.dailyAverage.iconWrapper}
        />
        <TopCard 
          title={safeT(t, 'cost_trends.top_expense', 'Top Expense')}
          value={metrics.bestSellingProduct.type}
          subValue={metrics.bestSellingProduct.amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          })}
          icon={CARD_STYLES.topExpense.icon}
          type="topExpense"
          className={`${CARD_STYLES.topExpense.bg} border-2 ${CARD_STYLES.topExpense.border} ${CARD_STYLES.topExpense.text} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 p-6 rounded-2xl`}
          titleClassName={CARD_STYLES.topExpense.title}
          valueClassName={CARD_STYLES.topExpense.value}
          subValueClassName={CARD_STYLES.topExpense.subValue}
          iconWrapperClassName={CARD_STYLES.topExpense.iconWrapper}
        />
        <TopCard 
          title={safeT(t, 'dashboard.summary.growth', 'Growth')}
          value={`${Math.abs(metrics.salesGrowth.growth).toFixed(1)}%`}
          subValue={safeT(t, 'common.vs_last_month', 'vs last month')}
          icon={metrics.salesGrowth.trend === 'up' 
            ? CARD_STYLES.growth.up.icon
            : CARD_STYLES.growth.down.icon
          }
          type="growth"
          trend={metrics.salesGrowth.trend}
          className={`${metrics.salesGrowth.trend === 'up' ? CARD_STYLES.growth.up.bg : CARD_STYLES.growth.down.bg} border-2 ${metrics.salesGrowth.trend === 'up' ? CARD_STYLES.growth.up.border : CARD_STYLES.growth.down.border} ${metrics.salesGrowth.trend === 'up' ? CARD_STYLES.growth.up.text : CARD_STYLES.growth.down.text} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 p-6 rounded-2xl`}
          titleClassName={CARD_STYLES.growth.up.title}
          valueClassName={CARD_STYLES.growth.up.value}
          subValueClassName={CARD_STYLES.growth.up.subValue}
          iconWrapperClassName={CARD_STYLES.growth.up.iconWrapper}
        />
      </div>

      {/* Dashboard Cards */}
      {/* <CostsDashboard
        costs={filteredCosts}
        expenseTypes={expenseTypeMap}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      /> */}

      {/* Costs Records Table with Merged Filters */}
      <Card className="mb-6 bg-white border-2 border-[#dee2e6] shadow-lg">
        {/* Enhanced Header with Actions and Filters */}
        <div className="bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b-2 border-[#EFE9E3] rounded-t-2xl">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 rounded-t-2xl">
              <div>
                <h5 className="text-xl font-bold leading-none text-black uppercase mb-1">{t('costs.records')}</h5>
                <p className="text-sm text-black/90">{t('costs.manage_and_track')}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <Button
                    color="failure"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(t('costs.confirm.delete_multiple'))) {
                        handleBulkDelete();
                      }
                    }}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 shadow-sm"
                  >
                    <HiTrash className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedItems.length})
                  </Button>
                )}
                <Button
                  color="blue"
                  size="sm"
                  onClick={handleRefresh}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 shadow-sm"
                >
                  <HiRefresh className="h-4 w-4" />
                </Button>
                <Link href="/dashboard/costs/add">
                  <Button 
                    color="success" 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 shadow-sm"
                  >
                    <HiPlus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                {/* Activity Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('filters.activityType')}
                  </label>
                  <select
                    value={filters.selectedActivityType || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedActivityType: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
                  >
                    <option value="">{t('filters.allActivityTypes')}</option>
                    {activityTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {getTranslatedActivityTypeName(type, t)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expense Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('costs.filters.expenseType')}
                  </label>
                  <select
                    value={filters.selectedExpenseType || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedExpenseType: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
                  >
                    <option value="">{t('filters.allExpenseTypes')}</option>
                    {expenseTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {getTranslatedExpenseTypeName(type, t)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('costs.filters.month')}
                  </label>
                  <select
                    value={filters.selectedMonth || ''}
                    onChange={handleMonthChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
                  >
                    <option value="">{t('costs.filters.allMonths')}</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {MONTHS[i]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('costs.filters.year')}
                  </label>
                  <select
                    value={filters.selectedYear || ''}
                    onChange={handleYearChange}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-gray-900 bg-white"
                  >
                    <option value="">{t('costs.filters.allYears')}</option>
                    {availableRecordYears.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Table Section */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-900">
            <thead className="bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] text-gray-900">
              <tr>
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={() => {
                      setSelectAll(!selectAll);
                      if (!selectAll) {
                        setSelectedItems(filteredCosts.map(row => row.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    className="h-4 w-4 text-[#495057] border-[#ced4da] rounded"
                  />
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('date')}>{safeT(t, 'common.date', 'Date')}</th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('activity')}>{safeT(t, 'common.activity', 'Activity')}</th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('expense')}>{safeT(t, 'common.expense', 'Expense')}</th>
                <th className="px-6 py-3 font-semibold text-center cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('amountFC')}>{safeT(t, 'common.amount_cdf', 'Amount (CDF)')}</th>
                <th className="px-6 py-3 font-semibold text-center cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('exchangeRate')}>{safeT(t, 'common.exchange_rate', 'Exchange Rate')}</th>
                <th className="px-6 py-3 font-semibold text-center cursor-pointer hover:bg-[#FCF8F8]" onClick={() => handleSort('amountUSD')}>{safeT(t, 'common.amount_usd', 'Amount (USD)')}</th>
                <th className="px-6 py-3 font-semibold text-center">{safeT(t, 'common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#dee2e6]">
                          {paginatedCosts.map((cost, index) => (
              <tr
                key={cost.id}
                className={`transition-all duration-200 border-b border-[#dee2e6] last:border-b-0 ${
                  index % 2 === 1 ? 'bg-[#FCF8F8]' : 'bg-white'
                } hover:shadow-lg hover:scale-[1.02] hover:bg-[#e9ecef]`}
              >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(cost.id)}
                      onChange={() => {
                        if (selectedItems.includes(cost.id)) {
                          setSelectedItems(prev => prev.filter(id => id !== cost.id));
                        } else {
                          setSelectedItems(prev => [...prev, cost.id]);
                        }
                      }}
                      className="h-4 w-4 text-[#495057] border-[#495057] rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRow === cost.id ? (
                      <TextInput
                        type="date"
                        value={editingData.date || ''}
                        onChange={e => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-[140px]"
                      />
                    ) : (
                      (() => {
                        const d = toDateObj(cost.date);
                        return !isNaN(d) ? d.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : '—';
                      })()
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRow === cost.id ? (
                      <Select
                        value={editingData.activityTypeId || ''}
                        onChange={e => setEditingData(prev => ({ ...prev, activityTypeId: e.target.value }))}
                        className="w-[180px]"
                      >
                        <option value="">{t('filters.allActivityTypes')}</option>
                        {activityTypes?.map(type => (
                          <option key={type.id} value={type.id}>
                            {getTranslatedActivityTypeName(type, t)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      (() => {
                        const name = activityTypeMap.get(cost.activityTypeId)?.name || '—';
                        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const colorVariants = [
                          { bg: 'from-blue-100 to-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
                          { bg: 'from-purple-100 to-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
                          { bg: 'from-indigo-100 to-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
                          { bg: 'from-violet-100 to-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
                          { bg: 'from-sky-100 to-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' }
                        ];
                        const colors = colorVariants[hash % colorVariants.length];
                        return (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${colors.bg} ${colors.text} border ${colors.border} shadow-sm`}>
                            <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2 inline-block`}></span>
                            {getTranslatedActivityTypeName(activityTypeMap.get(cost.activityTypeId), t)}
                          </span>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRow === cost.id ? (
                      <Select
                        value={editingData.expenseTypeId || ''}
                        onChange={e => setEditingData(prev => ({ ...prev, expenseTypeId: e.target.value }))}
                        className="w-[180px]"
                      >
                        <option value="">{t('filters.allExpenseTypes')}</option>
                        {expenseTypes?.map(type => (
                          <option key={type.id} value={type.id}>
                            {getTranslatedExpenseTypeName(type, t)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      (() => {
                        const name = expenseTypeMap.get(cost.expenseTypeId)?.name || '—';
                        const expenseName = getTranslatedExpenseTypeName(expenseTypeMap.get(cost.expenseTypeId), t);
                        const hash = expenseName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const colorVariants = [
                          { bg: 'from-blue-100 to-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
                          { bg: 'from-purple-100 to-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
                          { bg: 'from-indigo-100 to-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
                          { bg: 'from-violet-100 to-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
                          { bg: 'from-sky-100 to-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' }
                        ];
                        const colors = colorVariants[hash % colorVariants.length];
                        return (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${colors.bg} ${colors.text} border ${colors.border} shadow-sm`}>
                            <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2 inline-block`}></span>
                            {expenseName}
                          </span>
                        );
                      })()
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-base font-semibold">
                    {editingRow === cost.id ? (
                      <TextInput
                        type="number"
                        value={editingData.amountFC ?? cost.amountFC ?? 0}
                        onChange={e => setEditingData(prev => ({ ...prev, amountFC: e.target.value }))}
                        className="w-[100px] text-center"
                        min={0}
                      />
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                        {formatCDF(cost.amountFC)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-base font-semibold">
                    {editingRow === cost.id ? (
                      <TextInput
                        type="number"
                        value={editingData.exchangeRate ?? cost.exchangeRate ?? ''}
                        onChange={e => setEditingData(prev => ({ ...prev, exchangeRate: e.target.value }))}
                        className="w-[100px] text-center"
                        min={0}
                      />
                    ) : (
                      cost.exchangeRate ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200 shadow-sm">
                          {cost.exchangeRate}
                        </span>
                      ) : (
                        <span className="text-[#adb5bd]">—</span>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-base font-semibold">
                    {editingRow === cost.id ? (
                      <TextInput
                        type="number"
                        value={editingData.amountUSD ?? cost.amountUSD ?? 0}
                        onChange={e => setEditingData(prev => ({ ...prev, amountUSD: e.target.value }))}
                        className="w-[100px] text-center"
                        min={0}
                      />
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-cyan-100 to-cyan-50 text-cyan-800 border border-cyan-200 shadow-sm">
                        {cost.amountUSD?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      {editingRow === cost.id ? (
                        <>
                          <Button color="success" size="xs" onClick={() => saveEditing(cost.id)} className="h-8 w-8 p-0 flex items-center justify-center bg-green-600 text-white hover:bg-green-700 border border-green-600">
                            <HiCheck className="h-4 w-4" />
                          </Button>
                          <Button color="gray" size="xs" onClick={cancelEditing} className="h-8 w-8 p-0 flex items-center justify-center bg-gray-500 text-white hover:bg-gray-600 border border-gray-500 shadow-sm">
                            <HiX className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button color="info" size="xs" onClick={() => startEditing(cost)} className="h-8 w-8 p-0 flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm">
                            <HiPencil className="h-4 w-4" />
                          </Button>
                          <Button color="failure" size="xs" onClick={() => handleDelete(cost.id)} className="h-8 w-8 p-0 flex items-center justify-center bg-red-600 text-white hover:bg-red-700 border border-red-600 shadow-sm">
                            <HiTrash className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {sortedCosts.length > entriesPerPage && (
          <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-[#dee2e6]">
            <span className="text-sm text-gray-700">
              {t('table.showing')} {(currentPage - 1) * entriesPerPage + 1} {t('table.to')} {Math.min(currentPage * entriesPerPage, sortedCosts.length)} {t('table.of')} {sortedCosts.length} {t('table.entries')}
            </span>
            <div className="flex gap-2">
              <Button
                color="gray"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-300 disabled:text-gray-500 shadow-sm border border-blue-300"
              >
                {t('common.previous')}
              </Button>
              <Button
                color="gray"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-300 disabled:text-gray-500 shadow-sm border border-blue-300"
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Section with Tabs */}
      <Card className="mb-6 overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-[#dee2e6] bg-gradient-to-r from-[#FCF8F8] to-[#e9ecef]">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setSummaryTab('tables')}
              className={`${
                summaryTab === 'tables'
                  ? "border-[#495057] text-[#212529] bg-white"
                  : "border-transparent text-[#6c757d] hover:text-[#495057] hover:border-[#adb5bd]"
              } flex items-center py-4 px-6 border-b-2 font-medium text-sm transition-all`}
            >
              {safeT(t, 'common.summary_tables', 'Summary Tables')}
            </button>
            <button
              onClick={() => setSummaryTab('charts')}
              className={`${
                summaryTab === 'charts'
                  ? "border-[#495057] text-[#212529] bg-white"
                  : "border-transparent text-[#6c757d] hover:text-[#495057] hover:border-[#adb5bd]"
              } flex items-center py-4 px-6 border-b-2 font-medium text-sm transition-all`}
            >
              {safeT(t, 'common.charts', 'Charts')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {summaryTab === 'tables' && (
            <>
              {/* Category Summary Table */}
              {Object.keys(categorySummary).length > 0 && (
                <Card className="border-0 rounded-none bg-white mb-0">
                  <div className="px-6 py-4 bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b border-[#FCF8F8] flex justify-between items-center rounded">
                    <h3 className="text-lg font-semibold text-black uppercase text-left">
                      {safeT(t, 'costs.summaryByCategory', 'Summary by Category')}
                    </h3>
            <div className="flex items-center gap-4">
              <div>
                <Select
                  value={summaryYear}
                  onChange={handleSummaryYearChange}
                  className="text-sm border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Select
                  value={summaryMonth}
                  onChange={handleSummaryMonthChange}
                  className="text-sm border-[#ced4da] focus:border-[#495057] focus:ring-[#495057]"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {MONTHS[i]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-900 border border-[#495057] rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
              <thead className="bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8]">
                <tr>
                  <TableHeader label="category" className="text-black" />
                  <TableHeader label="amountFC" align="right" className="text-black" />
                  <TableHeader label="amountUSD" align="right" className="text-black" />
                  <TableHeader label="Nombre d'entrées" align="right" className="text-black" />
                  <TableHeader label={t('costs.percentage', 'Percentage')} align="right" className="text-black" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#dee2e6]">
                {(() => {
                  const totalUSD = Object.values(categorySummary).reduce((sum, { amountUSD }) => sum + amountUSD, 0);
                  const totalFC = Object.values(categorySummary).reduce((sum, { amountFC }) => sum + amountFC, 0);
                  const totalCount = Object.values(categorySummary).reduce((sum, { count }) => sum + count, 0);
                  
                  const categoryOrder = ['personnel', 'social', 'fiscal', 'operational', 'uncategorized'];
                  
                  return (
                    <>
                      {categoryOrder
                        .filter(cat => categorySummary[cat])
                        .map((category) => {
                          const data = categorySummary[category];
                          const percentageOfTotal = (data.amountUSD / totalUSD) * 100;
                          return (
                            <tr
                              key={category}
                              className="transition-all duration-200 border-b border-purple-100 last:border-b-0 bg-white hover:shadow-lg hover:scale-[1.02] hover:bg-white"
                            >
                              <td className="px-6 py-2 font-semibold text-gray-900">
                                {(() => {
                                  const categoryColors = {
                                    'personnel': { bg: 'from-blue-100 to-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
                                    'social': { bg: 'from-green-100 to-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
                                    'fiscal': { bg: 'from-yellow-100 to-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' },
                                    'operational': { bg: 'from-purple-100 to-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
                                    'uncategorized': { bg: 'from-gray-100 to-gray-50', text: 'text-gray-800', border: 'border-gray-200', dot: 'bg-gray-500' }
                                  };
                                  const colors = categoryColors[category] || categoryColors['uncategorized'];
                                  return (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${colors.bg} ${colors.text} border ${colors.border} shadow-sm`}>
                                      <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2 inline-block`}></span>
                                      {t(`masterData.expenseCategories.${category}`) || category}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-2 text-right font-semibold">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                                  {formatFC(data.amountFC)}
                                </span>
                              </td>
                              <td className="px-6 py-2 text-right font-semibold">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-cyan-100 to-cyan-50 text-cyan-800 border border-cyan-200 shadow-sm">
                                  {data.amountUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-6 py-2 text-right font-semibold">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm">
                                  {data.count}
                                </span>
                              </td>
                              <td className="px-6 py-2 text-right font-semibold">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-teal-100 to-teal-50 text-teal-800 border border-teal-200 shadow-sm transition-colors duration-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5"></span>
                                  {percentageOfTotal.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      <tr className="bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] text-base font-bold text-black border-t-2 rounded-b-2xl">
                        <td className="px-6 py-3 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                          <span>{safeT(t, 'common.total', 'Total')}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-black">
                          <span>{formatFC(totalFC)}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-black">
                          <span>{totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-black">
                          <span>{totalCount}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span></span>
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
                  </div>
                </Card>
              )}

              {/* Summary Table - Full Width */}
              <Card className="border-0 rounded-none bg-white mb-0">
                <div className="px-6 py-4 bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b border-[#6c757d] flex justify-between items-center rounded">
                  <h3 className="text-lg font-semibold text-black uppercase text-left">
                    {safeT(t, 'common.summary', 'Summary')}
                  </h3>
          <div className="flex items-center gap-4">
            <div>
              <Select
                value={summaryYear}
                onChange={handleSummaryYearChange}
                className="text-sm border-purple-200 focus:border-purple-400 focus:ring-purple-400"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </div>
            <div>
              <Select
                value={summaryMonth}
                onChange={handleSummaryMonthChange}
                className="text-sm border-[#ced4da] focus:border-[#495057] focus:ring-[#495057]"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {MONTHS[i]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
        
        {/* Summary Table */}
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-900 border border-[#004c4c] rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:shadow-2xl">
            <thead className="bg-[#FCF8F8]">
              <tr>
                <TableHeader label="category" className="text-black" />
                <TableHeader label="amountFC" align="right" className="text-black" />
                <TableHeader label="amountUSD" align="right" className="text-black" />
                <TableHeader label="budget" align="right" className="text-black" />
                <TableHeader label={t('costs.percentage', 'Pourcentage')} align="right" className="text-black" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#dee2e6]">
              {(() => {
                const totalUSD = Object.values(summaryTableData).reduce((sum, { amountUSD }) => sum + amountUSD, 0);
                const totalFC = Object.values(summaryTableData).reduce((sum, { amountFC }) => sum + amountFC, 0);

                return (
                  <>
                    {Object.entries(summaryTableData)
                      .sort(([, a], [, b]) => b.amountUSD - a.amountUSD)
                      .map(([type, data]) => {
                        const percentageOfTotal = (data.amountUSD / totalUSD) * 100;
                        const isOverBudget = typeof data.budgetCode === 'number' && percentageOfTotal > data.budgetCode;
                        return (
                          <tr
                    key={type}
                    className="transition-all duration-200 border-b border-purple-100 last:border-b-0 bg-white hover:shadow-lg hover:scale-[1.02] hover:bg-white"
                  >
                            <td className="px-6 py-2 font-semibold text-gray-900">
                              {(() => {
                                const expenseName = getTranslatedExpenseTypeName(expenseTypeMap.get(data.expenseTypeId), t);
                                const hash = expenseName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                const colorVariants = [
                                  { bg: 'from-blue-100 to-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
                                  { bg: 'from-purple-100 to-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
                                  { bg: 'from-indigo-100 to-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
                                  { bg: 'from-violet-100 to-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
                                  { bg: 'from-sky-100 to-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' }
                                ];
                                const colors = colorVariants[hash % colorVariants.length];
                                return (
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${colors.bg} ${colors.text} border ${colors.border} shadow-sm`}>
                                    <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2 inline-block`}></span>
                                    {expenseName}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-2 text-right font-semibold">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                                {formatFC(data.amountFC)}
                              </span>
                            </td>
                            <td className="px-6 py-2 text-right font-semibold">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-cyan-100 to-cyan-50 text-cyan-800 border border-cyan-200 shadow-sm">
                                {data.amountUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-2 text-right font-semibold">
                              {typeof data.budgetCode === 'number' ? (
                                <span className={`${percentageOfTotal > data.budgetCode 
                                  ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200' 
                                  : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                                } border px-3 py-1.5 rounded-lg text-xs inline-flex items-center shadow-sm transition-colors duration-200`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${percentageOfTotal > data.budgetCode ? 'bg-red-500' : 'bg-green-500'} mr-1.5`}></span>
                                  {data.budgetCode}%
                                </span>
                              ) : (
                                <span className="text-[#adb5bd]">—</span>
                              )}
                            </td>
                            <td className="px-6 py-2 text-right font-semibold">
                              <span className={`${isOverBudget 
                                ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border-red-200' 
                                : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border-green-200'
                              } border px-3 py-1.5 rounded-lg text-xs inline-flex items-center shadow-sm transition-colors duration-200`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'} mr-1.5`}></span>
                                {percentageOfTotal.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    <tr className="bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] text-base font-bold text-black border-t-2 rounded-b-2xl">
                      <td className="px-6 py-3 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                        <span>Total</span>
                      </td>
                      <td className="px-6 py-3 text-right text-black">
                        <span>{formatFC(totalFC)}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-black">
                        <span>{totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span></span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span></span>
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Card>
            </>
          )}

          {summaryTab === 'charts' && (
            <div className="space-y-6 p-6">
              {/* Costs by Type Chart (bar) */}
              <Card className="border border-[#dee2e6]">
        <div className="px-6 py-3 bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b border-[#6c757d] text-black">
          <h3 className="text-lg font-semibold text-center text-black">
            {safeT(t, 'common.costs_by_type', 'Costs by Type')}
          </h3>
        </div>
        <div className="p-4">
          <div className="h-[300px]">
            {costsByType.data.length > 0 ? (
              <Chart
                options={{
                  chart: {
                    type: 'bar',
                    height: '100%',
                    toolbar: { show: false },
                    background: 'transparent'
                  },
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: '55%',
                      borderRadius: 4,
                    }
                  },
                  dataLabels: {
                    enabled: false
                  },
                  stroke: {
                    show: true,
                    width: 2,
                    colors: ['transparent']
                  },
                  xaxis: {
                    categories: costsByType.categories,
                    labels: {
                      style: {
                        colors: '#64748b',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      },
                      rotate: -20,
                      rotateAlways: false
                    }
                  },
                  yaxis: {
                    title: {
                      text: safeT(t, 'common.amount_usd', 'Amount (USD)'),
                      style: {
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }
                    },
                    labels: {
                      formatter: (value) => {
                        if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`;
                        if (value >= 1000) return `$${(value/1000).toFixed(1)}K`;
                        return `$${value.toFixed(0)}`;
                      }
                    }
                  },
                  fill: {
                    opacity: 1
                  },
                  colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
                  tooltip: {
                    y: {
                      formatter: (value) => {
                        return value.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        });
                      }
                    }
                  }
                }}
                series={[{
                  name: safeT(t, 'common.costs_by_type', 'Costs by Type'),
                  data: costsByType.data
                }]}
                type="bar"
                height="100%"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {safeT(t, 'common.no_data', 'No data available')}
              </div>
            )}
          </div>
        </div>
      </Card>

              {/* Costs Trend Chart */}
              <Card className="border border-[#dee2e6]">
         <div className="px-6 py-3 bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b border-[#6c757d] rounded-t-lg">
           <h3 className="text-lg font-semibold text-center text-black">
             {safeT(t, 'cost_trends.title', 'Cost Trends')}
           </h3>
         </div>
         <div className="p-4">
           <div className="h-[300px]">
             <ClientOnly>
               {(() => {
                 if (!chartData?.byType) return null;
                 return (
                   <Chart
                     options={{
                       ...chartData.byType.options,
                       chart: {
                         type: 'area',
                         background: 'transparent',
                         toolbar: { show: false }
                       },
                       colors: ['#3b82f6'],
                       yaxis: {
                         labels: {
                           formatter: (val) => val % 1 === 0 ? val.toFixed(0) : val.toFixed(2),
                           style: { fontSize: '14px', colors: '#64748b', fontWeight: 'bold' }
                         },
                         tickAmount: 6,
                         min: 0
                       },
                                               dataLabels: {
                       enabled: false
                     },
                     xaxis: {
                       type: 'datetime',
                       labels: {
                         formatter: (val) => {
                           const d = new Date(Number(val));
                           return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                         },
                         style: { fontSize: '14px', colors: '#64748b', fontWeight: 'bold' }
                       }
                     },
                       tooltip: {
                         y: {
                           formatter: (val) => val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)
                         },
                         x: {
                           formatter: (val) => {
                             const d = new Date(Number(val));
                             return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                           }
                         }
                       }
                     }}
                     series={[{
                       name: safeT(t, 'common.total', 'Total'),
                       data: chartData.byType.series[0]?.data || []
                     }]}
                     type="area"
                     height="100%"
                   />
                 );
               })()}
             </ClientOnly>
           </div>
         </div>
       </Card>

              {/* Costs by Activity Type Chart */}
              <Card className="border border-[#dee2e6]">
         <div className="px-6 py-3 bg-gradient-to-r from-[#FCF8F8] to-[#FCF8F8] border-b border-[#6c757d] text-black">
           <h3 className="text-lg font-semibold text-center text-black">
             {safeT(t, 'common.costs_by_activity', 'Costs by Activity Type')}
           </h3>
         </div>
         <div className="p-4">
           <div className="h-[300px]">
             {costsByActivityType.data.length > 0 ? (
               <Chart
                 options={{
                   chart: {
                     type: 'bar',
                     height: '100%',
                     toolbar: { show: false },
                     background: 'transparent'
                   },
                   plotOptions: {
                     bar: {
                       horizontal: true,
                       columnWidth: '60%',
                       borderRadius: 8,
                     }
                   },
                   dataLabels: {
                     enabled: true,
                     style: {
                       colors: ['#FFFFFF'],
                       fontSize: '14px',
                       fontWeight: 'bold'
                     },
                     formatter: (value) => {
                       if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`;
                       if (value >= 1000) return `$${(value/1000).toFixed(1)}K`;
                       return `$${value.toFixed(0)}`;
                     }
                   },
                   stroke: {
                     show: true,
                     width: 2,
                     colors: ['transparent']
                   },
                   xaxis: {
                     categories: costsByActivityType.categories,
                     labels: {
                       formatter: (value) => {
                         if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`;
                         if (value >= 1000) return `$${(value/1000).toFixed(1)}K`;
                         return `$${value.toFixed(0)}`;
                       },
                       style: {
                         colors: '#495057',
                         fontSize: '12px',
                         fontWeight: 'bold'
                       }
                     }
                   },
                   yaxis: {
                     labels: {
                       style: {
                         colors: '#495057',
                         fontSize: '12px',
                         fontWeight: 'bold'
                       }
                     }
                   },
                   fill: {
                     opacity: 1
                   },
                   colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
                   tooltip: {
                     y: {
                       formatter: (value) => {
                         return value.toLocaleString('en-US', {
                           style: 'currency',
                           currency: 'USD',
                           minimumFractionDigits: 2,
                           maximumFractionDigits: 2
                         });
                       }
                     }
                   },
                   legend: {
                     show: false
                   }
                 }}
                 series={[{
                   name: safeT(t, 'common.costs_by_activity', 'Coûts par Activité'),
                   data: costsByActivityType.data
                 }]}
                 type="bar"
                 height="100%"
               />
             ) : (
               <div className="flex items-center justify-center h-full text-gray-400">
                 {safeT(t, 'common.no_data', 'No data available')}
               </div>
             )}
           </div>
         </div>
       </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function safeT(t, key, fallback) {
  const value = t(key);
  return value !== key ? value : fallback || key;
}
