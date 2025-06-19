"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card, Button, TextInput, Select, Label } from "flowbite-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  HiRefresh, HiTrendingUp, HiTrendingDown, 
  HiTrash, HiPencil, HiPlus, HiInbox, HiChevronDown, HiCube, HiClipboardList, HiArchive, HiCheck, HiX 
} from "react-icons/hi";
import { PiBeerBottleFill } from "react-icons/pi";
import { FaIndustry, FaCubes } from "react-icons/fa";
import { SiCodeblocks } from "react-icons/si";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { firestore } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

import { useMasterData } from "@/hooks/useMasterData";
import { formatDateConsistent } from "@/lib/utils/dateUtils";
import TopCard from "@/components/shared/TopCard";
import { useLanguage } from "@/context/LanguageContext";
import { getInventorySummaryTableData } from '@/lib/analysis/dataProcessing';
import { userService } from '@/services/firestore/userService';
import '@/lib/chart-setup';

// Dynamic imports for Chart.js
const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const BarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

// Import and register Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Client-only wrapper component
const ClientOnly = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return children;
};

// Add after the imports
const TIME_PERIODS = {
  ALL: 'all',
  YEAR: 'year',
  MONTH: 'month',
  WEEK: 'week',
  CUSTOM: 'custom'
};

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

// Define styles at the top level
const typeStyles = {
  "totalInventory": { bg: "bg-blue-600", text: "text-blue-700", icon: <HiInbox /> },
  "monthlyMovements": { bg: "bg-green-600", text: "text-green-700", icon: <HiRefresh /> },
  "blockIce": { bg: "bg-purple-600", text: "text-purple-700", icon: <HiCube /> },
  "cubeIce": { bg: "bg-yellow-600", text: "text-yellow-700", icon: <HiCube /> },
  "waterBottling": { bg: "bg-red-600", text: "text-red-700", icon: <PiBeerBottleFill /> },
  "packaging": { bg: "bg-gray-600", text: "text-gray-700", icon: <HiArchive /> },
  default: { bg: "bg-gray-500", text: "text-gray-700", icon: <HiInbox /> }
};

// Add these helper functions after imports and before the main component
const getMatchingPackaging = (productId, productMap) => {
  if (!productId || !productMap) return null;
  const mainProduct = productMap.get(productId);
  if (!mainProduct) return null;

  const mainName = mainProduct.productid?.toLowerCase() || '';
  // Match size: 1,5L, 600ml, 5Kg, etc.
  const mainSize = mainName.match(/\d+[,.]?\d*\s*(kg|l|ml)/i)?.[0]?.replace(' ', '') || '';
  // Match type: water/eau, ice/glaçons
  const mainType = mainName.includes('eau') || mainName.includes('water')
    ? 'water'
    : mainName.includes('glaçons') || mainName.includes('ice')
    ? 'ice'
    : '';

  return Array.from(productMap.values()).find(p => {
    const isPackaging = p.producttype?.toLowerCase().includes('packaging') || p.producttype?.toLowerCase().includes('emballage');
    const matchesActivity = p.activitytypeid?.trim() === mainProduct.activitytypeid?.trim();
    const packagingName = p.productid?.toLowerCase() || '';
    const packagingSize = packagingName.match(/\d+[,.]?\d*\s*(kg|l|ml)/i)?.[0]?.replace(' ', '') || '';
    const packagingType = packagingName.includes('eau') || packagingName.includes('water')
      ? 'water'
      : packagingName.includes('glaçons') || packagingName.includes('ice')
      ? 'ice'
      : '';

    const result = (
      isPackaging &&
      matchesActivity &&
      mainType &&
      mainType === packagingType &&
      mainSize &&
      mainSize === packagingSize
    );

    // Debug log for each attempted match
    if (isPackaging && matchesActivity) {
      console.log('Flexible packaging match attempt:', {
        mainName,
        packagingName,
        mainType,
        packagingType,
        mainSize,
        packagingSize,
        isPackaging,
        matchesActivity,
        result
      });
    }

    return result;
  });
};

// Add this component for the summary table
const InventorySummaryTable = ({ summarySections, t, thresholds, selectedProductTypes }) => {
  // Build a flat list of all rows from selected sections
  const filteredSections = selectedProductTypes && selectedProductTypes.length > 0
    ? summarySections.filter(section => selectedProductTypes.includes(section.section))
    : summarySections;
  const allRows = filteredSections.flatMap(section => section.rows.map(row => ({ ...row, section: section.section })));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[15px] text-left text-gray-900 border border-purple-200 rounded-2xl overflow-hidden">
        <thead className="bg-purple-50">
          <tr>
            <th className="px-6 py-3 font-semibold text-purple-900">{t('common.product')}</th>
            <th className="px-6 py-3 font-semibold text-purple-900 text-center">{t('inventory.summary.stock')}</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, idx) => {
            // Determine product or packaging
            const prod = row.product || row.packaging;
            if (!prod) return null; // Safety check

            const stock = row.product ? row.productStock : row.packagingStock;
            const isPackaging = prod.producttype?.toLowerCase().includes('packaging');

            // --- Existing Threshold Logic (untouched) ---
            let threshold = null;
            if (isPackaging) {
              if (prod.producttype.toLowerCase().includes('cube')) {
                threshold = thresholds?.iceCubes ?? 0;
              } else if (prod.producttype.toLowerCase().includes('water')) {
                threshold = thresholds?.bottles ?? 0;
              }
            }
            let stockClass = '';
            if (isPackaging && threshold !== null) {
              if (stock > threshold) {
                stockClass = 'bg-green-100 text-green-700 rounded-lg px-3 py-1 font-bold';
              } else {
                stockClass = 'bg-red-100 text-red-700 rounded-lg px-3 py-1 font-bold';
              }
            }
            // --- End of untouched logic ---

            // Fallback for missing translation
            let displayName = prod?.productid || prod?.productname || t('common.unknown');
            try {
              displayName = getTranslatedProductName(prod, t) || displayName;
            } catch {}

            // Card styling for product names
            const productType = prod.producttype;
            let nameStyle = 'bg-gray-100 text-gray-800'; // Default
            if (productType === 'Block Ice') {
              nameStyle = 'bg-purple-100 text-purple-800';
            } else if (productType === 'Cube Ice') {
              nameStyle = 'bg-blue-100 text-blue-800';
            } else if (productType === 'Water Bottling') {
              nameStyle = 'bg-green-100 text-green-800';
            } else if (isPackaging) {
              nameStyle = 'bg-slate-200 text-slate-800';
            }

            // Create a unique key by combining section and product ID
            const uniqueKey = `${row.section}-${prod?.id || prod?.productid || idx}`;
            
            return (
              <tr key={uniqueKey} className={`transition-all duration-200 border-b border-purple-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-purple-50/40' : 'bg-white'} hover:shadow-lg hover:scale-[1.02] hover:bg-white`}>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${nameStyle}`}>
                    {displayName}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {isPackaging && threshold !== null ? (
                    <span className={stockClass}>{stock?.toLocaleString()}</span>
                  ) : (
                    <span className="font-semibold text-gray-900">{stock?.toLocaleString()}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Add this helper function after imports and before the main component
const getTranslatedProductName = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid;
  if (!name) return 'N/A';
  const lower = name.toLowerCase();
  const type = product.producttype?.toLowerCase();
  const includesAny = (str, terms) => terms.some(term => str.includes(term));
  try {
    // Packaging Products (show as packaging, not as main product)
    if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
      // Ice Cube Packaging
      if (includesAny(lower, ['cube ice', 'glaçons'])) {
        if (lower.includes('1kg')) return t('products.items.packaging.cubeIce.1kg');
        if (lower.includes('2kg')) return t('products.items.packaging.cubeIce.2kg');
        if (lower.includes('5kg')) return t('products.items.packaging.cubeIce.5kg');
      }
      // Water Bottle Packaging
      if (includesAny(lower, ['water', 'eau'])) {
        if (lower.includes('600ml')) return t('products.items.packaging.waterBottling.600ml');
        if (lower.includes('750ml')) return t('products.items.packaging.waterBottling.750ml');
        if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterBottling.1_5L');
        if (lower.includes('5l')) return t('products.items.packaging.waterBottling.5L');
      }
      // Fallback for packaging
      return name;
    }
    // Main Products
    if (type === 'block ice' || includesAny(lower, ['bloc de glace', 'block ice'])) {
      if (lower.includes('5kg')) return t('products.items.blockIce.5kg');
      if (lower.includes('8kg')) return t('products.items.blockIce.8kg');
      if (lower.includes('30kg')) return t('products.items.blockIce.30kg');
    }
    if (type === 'cube ice' || includesAny(lower, ['glaçons', 'cube ice', 'ice cube'])) {
      if (lower.includes('1kg')) return t('products.items.cubeIce.1kg');
      if (lower.includes('2kg')) return t('products.items.cubeIce.2kg');
      if (lower.includes('5kg')) return t('products.items.cubeIce.5kg');
    }
    if (type === 'water bottling' || includesAny(lower, ['eau en bouteille', 'bottled water', 'water bottle'])) {
      if (lower.includes('600ml')) return t('products.items.waterBottling.600ml');
      if (lower.includes('750ml')) return t('products.items.waterBottling.750ml');
      if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.waterBottling.1_5L');
      if (lower.includes('5l')) return t('products.items.waterBottling.5L');
    }
  } catch (error) {
    console.warn('Translation error for product:', name, error);
  }
  return name;
};

// Add this memoized helper for the component
const useTranslatedProduct = (product, t) => {
  return useMemo(() => getTranslatedProductName(product, t), [product, t]);
};

// Add this function before the InventoryPage component
const getPackagingStockData = (packagingType, productMap, getCurrentTotalStock, t) => {
  // Color palette for bars
  const colorPalette = [
    '#3b82f6', // blue
    '#f59e42', // orange
    '#10b981', // green
    '#f43f5e', // red
    '#6366f1', // indigo
    '#eab308', // yellow
    '#8b5cf6', // violet
    '#14b8a6', // teal
    '#f472b6', // pink
    '#a3e635', // lime
    '#facc15', // amber
    '#f87171', // rose
  ];

  // Enhanced packaging product filtering to support all packaging types dynamically
  let packagingProducts = Array.from(productMap.values())
    .filter(p => {
      const type = p.producttype?.toLowerCase() || '';
      const productName = p.productid?.toLowerCase() || '';
      
      // Check if it's a packaging product
      const isPackaging = type.includes('packaging') || type.includes('emballage');
      if (!isPackaging) return false;
      
      if (packagingType === "ice_cube") {
        // Check for cube ice references (both French and English)
        const isCubeIce = type.includes('cube ice') || type.includes('ice cube') || 
                         type.includes('glaçon') || productName.includes('glaçon') ||
                         type.includes('cube') || productName.includes('cube');
        return isCubeIce;
      } else if (packagingType === "water_bottling") {
        // Check for water bottling references (both French and English) - exclude cans/bidons
        const isWaterBottling = (type.includes('water bottling') || type.includes('eau en bouteille') ||
                               (type.includes('water') && !type.includes('can') && !type.includes('bidon')) ||
                               (type.includes('eau') && !type.includes('bidon') && type.includes('bouteille')) ||
                               productName.includes('eau en bouteille') || productName.includes('water bottle')) &&
                               !type.includes('can') && !type.includes('bidon');
        return isWaterBottling;
      } else if (packagingType === "water_cans") {
        // Check for water cans references (both French and English)
        const isWaterCans = type.includes('water can') || type.includes('bidon') ||
                           (type.includes('water') && type.includes('can')) ||
                           (type.includes('eau') && type.includes('bidon')) ||
                           productName.includes('bidon') || productName.includes('water can');
        return isWaterCans;
      }
      return false;
    })
    .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));

  // Deduplicate by productid
  const uniqueProductsMap = new Map();
  packagingProducts.forEach(p => {
    if (!uniqueProductsMap.has(p.productid)) {
      uniqueProductsMap.set(p.productid, p);
    }
  });
  packagingProducts = Array.from(uniqueProductsMap.values());

  // Get current stock for each packaging product using getCurrentTotalStock
  const stockData = packagingProducts.map((product, idx) => {
    // Use the same translation logic as other components
    const getTranslatedPackagingName = (product) => {
      if (!product) return 'N/A';
      const name = product.productid;
      if (!name) return 'N/A';
      const lower = name.toLowerCase();
      const type = product.producttype?.toLowerCase();
      
      try {
        if (type?.includes('packaging') || type?.includes('emballage') || lower.includes('package') || lower.includes('emballage')) {
          // Cube ice packaging
          if (lower.includes('cube ice') || lower.includes('glaçons') || lower.includes('cube') || lower.includes('glaçon')) {
            if (lower.includes('1kg')) return t('products.items.packaging.cubeIce.1kg') || 'Emballage pour Glaçons 1Kg';
            if (lower.includes('2kg')) return t('products.items.packaging.cubeIce.2kg') || 'Emballage pour Glaçons 2Kg';
            if (lower.includes('5kg')) return t('products.items.packaging.cubeIce.5kg') || 'Emballage pour Glaçons 5Kg';
          }
          // Water bottling packaging (exclude cans/bidons)
          if ((lower.includes('water') || lower.includes('eau')) && !lower.includes('bidon') && !lower.includes('can')) {
            if (lower.includes('600ml')) return t('products.items.packaging.waterBottling.600ml') || 'Emballage pour Eau en bouteille 600ml';
            if (lower.includes('750ml')) return t('products.items.packaging.waterBottling.750ml') || 'Emballage pour Eau en bouteille 750ml';
            if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterBottling.1_5L') || 'Emballage pour Eau en bouteille 1,5L';
            if (lower.includes('5l')) return t('products.items.packaging.waterBottling.5L') || 'Emballage pour Eau en bouteille 5L';
          }
          // Water cans packaging
          if (lower.includes('bidon') || (lower.includes('water') && lower.includes('can'))) {
            if (lower.includes('5l')) return t('products.items.packaging.waterCans.5L') || 'Emballage pour Bidon d\'Eau 5L';
            if (lower.includes('10l')) return t('products.items.packaging.waterCans.10L') || 'Emballage pour Bidon d\'Eau 10L';
            if (lower.includes('20l')) return t('products.items.packaging.waterCans.20L') || 'Emballage pour Bidon d\'Eau 20L';
          }
        }
      } catch (error) {
        console.warn('Translation error for packaging product:', name, error);
      }
      
      // Fallback: add "Emballage pour" prefix if it's a packaging product
      if (type?.includes('packaging') || type?.includes('emballage') || lower.includes('package') || lower.includes('emballage')) {
        return `Emballage pour ${name.replace(/^(Package |Packaging |Emballage pour )/i, '')}`;
      }
      
      return name;
    };
    
    return {
      label: getTranslatedPackagingName(product),
      stock: getCurrentTotalStock(product.id),
      color: colorPalette[idx % colorPalette.length]
    };
  });

  return {
    labels: stockData.map(d => d.label),
    datasets: [{
      data: stockData.map(d => d.stock),
      backgroundColor: stockData.map(d => d.color),
      borderColor: stockData.map(d => d.color),
      borderWidth: 1,
      borderRadius: 4,
    }]
  };
};

// Placeholder for sending email notifications
/**
 * Send a French email alert to admins when packaging stock is below threshold.
 * @param {string[]} recipients - Array of admin email addresses
 * @param {string} packagingType - 'cube_ice' | 'water_bottling'
 * @param {number} currentStock - Current stock value
 * @param {number} threshold - Threshold value
 * @param {string} productName - Translated product name (French)
 */
async function sendPackagingThresholdEmail(recipients, packagingType, currentStock, threshold, productName) {
  // Compose French email
  const subject = `Alerte: Stock bas pour l'emballage "${productName}"`;
  const body = `Bonjour,\n\nLe stock actuel de l'emballage "${productName}" est de ${currentStock}, ce qui est inférieur ou égal au seuil défini (${threshold}).\n\nMerci de prendre les mesures nécessaires pour réapprovisionner ce stock.\n\nCeci est une notification automatique.`;
  // Placeholder: Replace with actual email sending logic
  console.log("[EMAIL] To:", recipients);
  console.log("[EMAIL] Subject:", subject);
  console.log("[EMAIL] Body:\n", body);
}

// Create a notification in Firestore
async function createThresholdNotification(userId, title, message) {
  try {
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      title,
      message,
      link: '/dashboard/inventory', // Link to the inventory page
      isRead: false,
      createdAt: serverTimestamp(),
      source: 'inventory_threshold'
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// Add this helper function for product type matching
const matchProductType = (product, targetType) => {
  if (!product?.producttype) return false;
  const type = product.producttype.toLowerCase();
  const target = targetType.toLowerCase();
  
  // Get translations for product types
  const blockIce = 'block ice';
  const cubeIce = 'cube ice';
  const waterBottling = 'water bottling';
  const packagingForIceCube = 'packaging for ice cube';
  const packagingForWaterBottling = 'packaging for water bottling';

  switch(target) {
    case 'block ice':
      return type === 'block ice';
    case 'cube ice':
      return type === 'cube ice';
    case 'water bottling':
      return type === 'water bottling';
    case 'packaging for ice cube':
      return type === 'packaging for ice cube' || type === 'packaging for cube ice';
    case 'packaging for water bottling':
      return type === 'packaging for water bottling';
    default:
      return false;
  }
};

// Initialize chart options with proper structure
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#4c5c68'
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#e6e6e6'
      },
      ticks: {
        color: '#4c5c68'
      }
    },
    x: {
      grid: {
        color: '#e6e6e6'
      },
      ticks: {
        color: '#4c5c68'
      }
    }
  }
};

export default function InventoryPage() {
  const { t: rawT } = useLanguage();
  // Safe t() to avoid rendering objects as React children
  const t = (key) => {
    const value = rawT(key);
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`Translation key '${key}' returned an object. Check your translation files for nested keys or missing leaf values.`);
      }
      // Try to get a string value from the object if possible
      if (typeof value === 'object' && value !== null) {
        if (value.title) return value.title;
        if (value.label) return value.label;
        if (value.name) return value.name;
        if (value.value) return value.value;
      }
      return key.split('.').pop(); // Fallback to last part of the key
    }
    return key.split('.').pop(); // Fallback to last part of the key
  };
  const router = useRouter();
  const { data: inventory, loading: collectionLoading, error, setError } = useFirestoreCollection("Inventory");
  
  // Master data management using the shared hook
  const { 
    products,
    activityTypes,
    productMap,
    activityTypeMap,
    loading: masterDataLoading,
    getProductsByType,
    getProductsByActivity
  } = useMasterData();

  // State for inventory data
  const [allInventoryMovements, setAllInventoryMovements] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  
  // Initialize inventory data when it loads
  useEffect(() => {
    if (inventory && inventory.length > 0) {
      console.log("✅ Setting inventory data:", inventory.length, "records");
      setAllInventoryMovements(inventory);
      setFilteredProductions(inventory); // Initial population
    } else {
      console.log("⚠️ No inventory data available");
    }
    setMovementsLoading(false);
  }, [inventory]);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State for selected items (checkboxes)
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for filters
  const [selectedActivityType, setSelectedActivityType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedMovementType, setSelectedMovementType] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory_selectedMonth');
      return saved !== null ? saved : (new Date().getMonth() + 1).toString();
    }
    return (new Date().getMonth() + 1).toString();
  });
  
  // Time period filter state
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS.MONTH);
  const [dateFilters, setDateFilters] = useState(getCurrentDateFilters());
  
  // Other state variables
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [productsList, setProductsList] = useState([]);
  const [movementTypes] = useState([
    { value: "", label: t('inventory.table.allMovementTypes') },
    { value: "IN", label: t('inventory.table.stockIn') },
    { value: "OUT", label: t('inventory.table.stockOut') },
    { value: "ADJUSTMENT", label: t('inventory.table.stockAdjustment') }
  ]);

  // Add editing state
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // Add sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Add state for selected product types at the top of InventoryPage
  const [selectedProductTypes, setSelectedProductTypes] = useState(['Block Ice']);

  // Add state for dropdown open/close
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Add source filter state
  const [selectedSource, setSelectedSource] = useState("");
  const sourceOptions = [
    { value: "", label: t('inventory.source.all', 'All Sources') },
    { value: "production", label: t('inventory.source.production', 'Production') },
    { value: "consumption", label: t('inventory.source.consumption', 'Consommation') },
    { value: "sales", label: t('inventory.source.sales', 'Vente') },
    { value: "manual", label: t('inventory.source.manual', 'Manuel') }
  ];

  // ALL HELPER FUNCTIONS THAT USE allInventoryMovements MUST BE INSIDE THE COMPONENT
  
  // Add detailed logging to computeCurrentStock to diagnose the mismatch
  const computeCurrentStock = useCallback((movements, productId) => {
    console.log(`[computeCurrentStock] === Computing stock for master product: "${productId}" ===`);
    if (!productId || !movements || !Array.isArray(movements)) {
      console.log(`[computeCurrentStock] Invalid arguments for "${productId}". Aborting.`);
      return 0;
    }

    const relevant = movements.filter(m => {
      const isMatch = m.productId?.trim() === productId?.trim();
      // Log the comparison for every movement to see why it fails
      if (!isMatch) {
        // console.log(`[computeCurrentStock] Comparing: Inventory.productId ("${m.productId}") !== Master.productId ("${productId}")`);
      }
      return isMatch;
    });

    if (!relevant.length) {
      console.log(`[computeCurrentStock] No relevant movements found for "${productId}".`);
      return 0;
    }

    // Sort by date, most recent first
    const sorted = [...relevant].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });

    const latest = sorted[0];
    const stock = latest.remainingQuantity || 0;
    console.log(`[computeCurrentStock] SUCCESS: Found ${relevant.length} movements for "${productId}". Latest stock: ${stock}`);
    return stock;
  }, []);

  const getCurrentTotalStock = useCallback((productId) => {
    if (!productId || !allInventoryMovements || !Array.isArray(allInventoryMovements)) return 0;
    return computeCurrentStock(allInventoryMovements, productId);
  }, [allInventoryMovements, computeCurrentStock]);

  const getCurrentStock = useCallback((productId) => {
    if (!productId || !allInventoryMovements || !Array.isArray(allInventoryMovements)) return 0;
    
    const relevantMovements = allInventoryMovements.filter(m => m.productId?.trim() === productId?.trim());
    if (!relevantMovements.length) return 0;

    relevantMovements.sort((a, b) => {
      const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return relevantMovements[0].remainingQuantity || 0;
  }, [allInventoryMovements]);

  const getStockForProduct = useCallback((productId) => {
    if (!productId || !productMap) return 0;
    const product = productMap.get(productId);
    if (!product) return 0;
    return getCurrentStock(product.id);
  }, [productMap, getCurrentStock]);

  const calculateTotalStockForType = useCallback((productType) => {
    if (!productMap) return 0;
    const productsOfType = Array.from(productMap.values())
      .filter(p => matchProductType(p, productType))
      .map(p => p.id);
    return productsOfType.reduce((sum, productId) => sum + getCurrentStock(productId), 0);
  }, [productMap, getCurrentStock]);

  // In `prepareInventorySummary`, use `product.productid` to get the stock.
  const prepareInventorySummary = useCallback((inventory, products, productMap) => {
    // Get all unique product types dynamically
    const productTypeMap = new Map();
    
    products.forEach(product => {
      const type = product.producttype;
      if (!type) return;
      
      // Skip packaging products for main product sections
      if (type.toLowerCase().includes('packaging') || type.toLowerCase().includes('emballage')) {
        return;
      }
      
      if (!productTypeMap.has(type)) {
        productTypeMap.set(type, []);
      }
      productTypeMap.get(type).push(product);
    });

    // Get all packaging products separately
    const packagingProductsMap = new Map();
    products
      .filter(p => {
        const type = p.producttype?.toLowerCase() || '';
        return type.includes('packaging') || type.includes('emballage');
      })
      .forEach(p => {
        if (!packagingProductsMap.has(p.id)) {
          packagingProductsMap.set(p.id, p);
        }
      });
    const packagingProducts = Array.from(packagingProductsMap.values())
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));

    // Create sections for each product type
    const summarySections = [];
    
    // Add main product type sections
    Array.from(productTypeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([type, typeProducts]) => {
        const sortedProducts = typeProducts.sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
        summarySections.push({
          section: type,
          rows: sortedProducts.map(product => ({
            product,
            productStock: getCurrentStock(product.id)
          }))
        });
      });

    // Add packaging section if there are packaging products
    if (packagingProducts.length > 0) {
      summarySections.push({
        section: 'Emballage',
        rows: packagingProducts.map(product => ({
          product,
          productStock: getCurrentStock(product.id)
        }))
      });
    }

    // Filter out sections that have no products to show.
    return summarySections.filter(section => section.rows.length > 0);
  }, [getCurrentStock]);

  // Toggle select all items
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredProductions.map(item => item.id));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredProductions]);

  // Add refresh function
  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    if (!allInventoryMovements?.length) return;

    console.log("🔄 Filter criteria changed:", {
      timePeriod: selectedTimePeriod,
      month: selectedMonth,
      activityType: selectedActivityType,
      product: selectedProduct,
      movementType: selectedMovementType,
      source: selectedSource
    });

    let filtered = [...allInventoryMovements];

    // Apply date-based filters
    if (selectedTimePeriod === TIME_PERIODS.ALL) {
      // Only apply month filter if a specific month is selected
      if (selectedMonth) {
        filtered = filtered.filter(m => {
          if (!m.date) return false;
          const date = m.date.toDate ? m.date.toDate() : new Date(m.date);
          return (date.getMonth() + 1).toString() === selectedMonth;
        });
      }
      // If no month is selected, show all records
    } else {
      // Apply time period filters
      filtered = filtered.filter(m => {
        if (!m.date) return false;
        const date = m.date.toDate ? m.date.toDate() : new Date(m.date);
        
        switch (selectedTimePeriod) {
          case TIME_PERIODS.YEAR:
            return date.getFullYear() === dateFilters.year;
          case TIME_PERIODS.MONTH:
            return date.getFullYear() === dateFilters.year && 
                   (dateFilters.month === undefined || date.getMonth() === dateFilters.month);
          case TIME_PERIODS.WEEK: {
            const firstDayOfMonth = new Date(dateFilters.year, dateFilters.month || 0, 1);
            const weekOffset = firstDayOfMonth.getDay();
            const weekStart = new Date(dateFilters.year, dateFilters.month || 0, 
              (dateFilters.week - 1) * 7 + 1 - weekOffset);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return date >= weekStart && date <= weekEnd;
          }
          case TIME_PERIODS.CUSTOM:
            if (dateFilters.startDate && dateFilters.endDate) {
              const startDate = new Date(dateFilters.startDate);
              const endDate = new Date(dateFilters.endDate);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              return date >= startDate && date <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Activity Type Filter
    if (selectedActivityType) {
      filtered = filtered.filter(movement => {
        const matchesDirectly = movement.activityTypeId?.trim() === selectedActivityType.trim();
        const product = productMap.get(movement.productId);
        const matchesThroughProduct = product?.activitytypeid?.trim() === selectedActivityType.trim();
        return matchesDirectly || matchesThroughProduct;
      });
    }

    // Product Filter
    if (selectedProduct) {
      filtered = filtered.filter(movement => movement.productId?.trim() === selectedProduct?.trim());
    }

    // Movement Type Filter
    if (selectedMovementType) {
      filtered = filtered.filter(movement => {
        const normalizedMovementType = movement.movementType?.toUpperCase();
        const normalizedSelectedType = selectedMovementType.toUpperCase();
        return normalizedMovementType === normalizedSelectedType;
      });
    }

    // Source Filter
    if (selectedSource) {
      filtered = filtered.filter(movement => movement.source === selectedSource);
    }

    setFilteredProductions(filtered);
  }, [
    selectedTimePeriod,
    selectedMonth,
    selectedActivityType,
    selectedProduct,
    selectedMovementType,
    dateFilters,
    allInventoryMovements,
    productMap,
    selectedSource
  ]);

  // Memoize pagination data
  const paginationData = useMemo(() => {
    const indexOfLastEntry = currentPage * itemsPerPage;
    const indexOfFirstEntry = indexOfLastEntry - itemsPerPage;
    const currentEntries = filteredProductions.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredProductions.length / itemsPerPage);

    return {
      indexOfLastEntry,
      indexOfFirstEntry,
      currentEntries,
      totalPages
    };
  }, [currentPage, itemsPerPage, filteredProductions]);

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

  // Add sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Memoized filtered products for dropdown - prevent duplicates
  const filteredProducts = useMemo(() => {
    // Create a Map to ensure uniqueness by ID
    const uniqueProducts = new Map();
    
    Array.from(productMap.values())
      .filter(product => {
        // Basic validation
        if (!product || !product.producttype) return false;
        // Include all main and packaging products
        const productType = product.producttype;
        const isMainProduct = 
          productType === 'Block Ice' || 
          productType === 'Cube Ice' ||
          productType === 'Water Bottling';
        const isPackaging = productType?.toLowerCase().includes('packaging');
        return isMainProduct || isPackaging;
      })
      .forEach(product => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });

    // Convert back to array and sort
    return Array.from(uniqueProducts.values())
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
  }, [productMap]);

  // Update getProductName function to handle direct product IDs
  const getProductName = useCallback((productId) => {
    if (!productId) return "N/A";
    
    // First try to find the product in the map
    const product = productMap.get(productId);
    if (product?.productid) {
      return product.productid;
    }
    
    // If not found in map, the productId might be the actual name (like "Block Ice 5Kg")
    return productId;
  }, [productMap]);

  const getActivityTypeName = useCallback((activityTypeId) => {
    if (!activityTypeId) return "N/A";
    const activityType = activityTypeMap.get(activityTypeId);
    return activityType?.name || "Unknown Activity";
  }, [activityTypeMap]);

  // Update formatDate function to handle Firestore timestamps
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "N/A";
    
    try {
      // Handle Firestore timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Handle regular Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Handle string date
      return new Date(timestamp).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }, []);

  // Combined loading state
  const isPageLoading = collectionLoading || movementsLoading || masterDataLoading;

  // Stock statistics - Update initial state with all required fields
  const [stockStats, setStockStats] = useState({
    totalInventory: 0,
    monthlyMovements: 0,
    blockIceStock: 0,
    cubeIceStock: 0,
    waterBottlingStock: 0,
    packagingStock: 0
  });

  // Threshold state
  const [thresholds, setThresholds] = useState({ iceCubes: 0, bottles: 0 });

  // Load thresholds on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventoryThresholds');
      if (saved) setThresholds(JSON.parse(saved));
    }
  }, []);

  // Handle threshold changes
  const handleThresholdChange = (type, value) => {
    const updated = { ...thresholds, [type]: Number(value) };
    setThresholds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventoryThresholds', JSON.stringify(updated));
    }
  };

 
  // Calculate stock for top cards with improved efficiency
  useEffect(() => {
    if (!allInventoryMovements?.length || !productMap?.size) return;

    const stats = {
      blockIce5kg: getStockForProduct("jTaX7TyHTnX5t6hvMFPH"),
      blockIce30kg: getStockForProduct("4iKFN3iDQGKFQ7Iz4Nhf"),
      cubeIce: calculateTotalStockForType("Cube Ice"),
      waterBottling: calculateTotalStockForType("Water Bottling"),
      packagingIceCube: calculateTotalStockForType("Packaging for Ice Cube"),
      packagingWaterBottling: calculateTotalStockForType("Packaging For Water Bottling")
    };

    setStockStats(stats);
  }, [allInventoryMovements, productMap, getStockForProduct, calculateTotalStockForType]);

  // Update the getPackagingForProduct function to ensure unique IDs
  const getPackagingForProduct = (productId, productsMap) => {
    if (!productId || !productsMap) return null;
    
    const mainProduct = productsMap.get(productId);
    if (!mainProduct) return null;

    return Array.from(productsMap.values())
      .find(p => {
        // Must be a packaging product
        const isPackaging = 
          p.producttype === 'Packaging For Water Bottling' ||
          p.producttype === 'Packaging For Cube Ice' ||
          p.producttype === 'Packaging for Ice Cube';

        // Must match activity type
        const matchesActivity = p.activitytypeid === mainProduct.activitytypeid;

        // Must match exact product name pattern
        const mainProdId = mainProduct.productid;
        const expectedPackageId = `Package ${mainProdId}`;
        const alternativePackageId = `Package ${mainProdId.replace('.', ',')}`;
        const alternativePackageId2 = `Package ${mainProdId.replace(',', '.')}`;

        const matchesProduct = 
          p.productid === expectedPackageId ||
          p.productid === alternativePackageId ||
          p.productid === alternativePackageId2;

        return isPackaging && matchesActivity && matchesProduct;
      });
  };

  // Get product type distribution with improved efficiency
  const getProductTypeDistribution = useCallback((productType) => {
    if (!productMap) return { labels: [], datasets: [] };
    
    const typeProducts = Array.from(productMap.values())
      .filter(p => p.producttype === productType)
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));

    return {
      labels: typeProducts.map(p => p.productid),
      datasets: [{
        data: typeProducts.map(p => getCurrentStock(p.id)),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }]
    };
  }, [productMap, getCurrentStock]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4c5c68'
        }
      },
      annotation: {
        annotations: {
          threshold: {
            type: 'line',
            yMin: thresholds.iceCubes,
            yMax: thresholds.iceCubes,
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: 'Threshold',
              position: 'end'
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e6e6e6'
        },
        ticks: {
          color: '#4c5c68'
        }
      },
      x: {
        grid: {
          color: '#e6e6e6'
        },
        ticks: {
          color: '#4c5c68'
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#4c5c68',
          padding: 10,
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Function to get chart options with dynamic threshold
  const getChartOptionsWithThreshold = useCallback((threshold) => ({
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      annotation: {
        annotations: {
          threshold: {
            type: 'line',
            yMin: threshold,
            yMax: threshold,
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: 'Threshold',
              position: 'end'
            }
          }
        }
      }
    }
  }), [chartOptions]);

  // Calculate total remaining inventory across all products, irrespective of date filters.
  const getTotalRemainingInventory = useCallback(() => {
    if (!allInventoryMovements || !allInventoryMovements.length) return 0;

    const latestByProduct = new Map();

    // Iterate over all movements to find the latest one for each product
    allInventoryMovements.forEach(movement => {
      if (!movement.productId) return;
      
      const currentLatest = latestByProduct.get(movement.productId);
      if (!currentLatest || 
          (movement.date && currentLatest.date && 
           movement.date.toDate().getTime() > currentLatest.date.toDate().getTime())) {
        latestByProduct.set(movement.productId, movement);
      }
    });

    // Sum up the remaining quantities from the latest movement of each product
    return Array.from(latestByProduct.values())
      .reduce((total, movement) => total + (movement.remainingQuantity || 0), 0);
  }, [allInventoryMovements]);

  // Calculate total movements for current month
  const getCurrentMonthMovements = useCallback(() => {
    if (!allInventoryMovements || !Array.isArray(allInventoryMovements)) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allInventoryMovements.filter(movement => {
      if (!movement.date) return false;
      const moveDate = movement.date.toDate();
      return moveDate.getMonth() === currentMonth && 
             moveDate.getFullYear() === currentYear;
    }).length;
  }, [allInventoryMovements]);

  // Calculate total stock by product type
  const getTotalStockByType = useCallback((productType) => {
    if (!allInventoryMovements || !productMap) return 0;
    
    // Get all products of this type
    const productsOfType = Array.from(productMap.values())
      .filter(p => p.producttype === productType)
      .map(p => p.id);
    
    // Get latest remaining quantity for each product
    const totalStock = productsOfType.reduce((sum, productId) => {
      const latestMovement = allInventoryMovements
        .filter(m => m.productId === productId)
        .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())[0];
      
      return sum + (latestMovement?.remainingQuantity || 0);
    }, 0);

    return totalStock;
  }, [allInventoryMovements, productMap]);

  // Update the getTotalPackagingStock function
  const getTotalPackagingStock = useCallback(() => {
    if (!productMap) return 0;
    
    const packagingProducts = Array.from(productMap.values())
      .filter(p => 
        p.producttype === 'Packaging for Ice Cube' || 
        p.producttype === 'Packaging For Water Bottling'
      )
      .map(p => p.id);

    return packagingProducts.reduce((sum, productId) => sum + getCurrentStock(productId), 0);
  }, [productMap, getCurrentStock]);

  // Update the effect that calculates stock stats
  useEffect(() => {
    if (!allInventoryMovements?.length || !productMap?.size) return;
    
    const stats = {
      totalInventory: getTotalRemainingInventory(),
      monthlyMovements: getCurrentMonthMovements(),
      blockIceStock: getTotalStockByType('Block Ice'),
      cubeIceStock: getTotalStockByType('Cube Ice'),
      waterBottlingStock: getTotalStockByType('Water Bottling'),
      packagingStock: getTotalPackagingStock()
    };
    
    setStockStats(stats);
  }, [allInventoryMovements, productMap, getTotalRemainingInventory, getCurrentMonthMovements, getTotalStockByType, getTotalPackagingStock]);

  // Get current month name
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  // Debug logging right before rendering the table
  useEffect(() => {
    if (filteredProductions?.length > 0) {
      console.log("🔍 Table rendering:", filteredProductions.length, "records");
      filteredProductions.slice(paginationData.indexOfFirstEntry, paginationData.indexOfLastEntry).forEach((record, index) => {
        console.log(`📋 Row ${index + 1}:`, record);
      });
    }
  }, [filteredProductions, paginationData.indexOfFirstEntry, paginationData.indexOfLastEntry]);

  // Add sanity check useEffect
  useEffect(() => {
    if (products) {
      const invalid = products.find(p => typeof p.producttype !== "string");
      if (invalid) {
        console.warn("❗️ Invalid product:", invalid);
      }
    }
  }, [products]);

  // Add debug logging for initial data load
  useEffect(() => {
    console.log('🔄 Initial Data Load:', {
      inventoryLength: allInventoryMovements?.length || 0,
      productsMapSize: productMap?.size || 0,
      activityTypesMapSize: activityTypeMap?.size || 0
    });

    // Log sample of inventory movements
    if (allInventoryMovements?.length > 0) {
      console.log('📦 Sample Inventory Movement:', allInventoryMovements[0]);
    }

    // Log product types
    if (productMap?.size > 0) {
      const productTypes = new Set();
      productMap.forEach(p => productTypes.add(p.producttype));
      console.log('📝 Available Product Types:', Array.from(productTypes));
      
      // Log sample products of each type
      Array.from(productTypes).forEach(type => {
        const products = Array.from(productMap.values())
          .filter(p => p.producttype === type)
          .slice(0, 2); // Show first 2 products of each type
        console.log(`📦 Sample ${type} Products:`, products);
      });
    }
  }, [allInventoryMovements, productMap, activityTypeMap]);

  // Prepare inventory summary
  const inventorySummary = useMemo(() => {
    if (!inventory || !products || !productMap) return null;
    return prepareInventorySummary(inventory, products, productMap);
  }, [inventory, products, productMap, prepareInventorySummary]);

  // Memoize the translation function for products
  const translateProduct = useCallback((productId) => {
    if (!productId || !productMap) return "N/A";
    const product = productMap.get(productId);
    return getTranslatedProductName(product, t);
  }, [productMap, t]);

  // Use the memoized function in your JSX where needed
  const renderProductName = useCallback((productId) => {
    return translateProduct(productId);
  }, [translateProduct]);

  // --- Move all event handler hooks before any return ---
  const startEditing = (record) => {
    setEditingId(record.id);
    setEditingData({
      activityTypeId: record.activityTypeId || productMap.get(record.productId)?.activitytypeid || '',
      productId: record.productId || '',
      date: record.date ? new Date(record.date.seconds * 1000).toISOString().split('T')[0] : '',
      movementType: record.movementType || '',
      initialQuantity: record.initialQuantity || 0,
      quantityMoved: record.quantityMoved || 0,
    });
  };

  const saveEditing = async () => {
    if (!editingId || !editingData) return;
    try {
      // Recalculate remaining quantity before saving
      const initialQty = Number(editingData.initialQuantity) || 0;
      const movedQty = Number(editingData.quantityMoved) || 0;
      let remainingQty = initialQty;
      
      if (editingData.movementType === "IN") {
        remainingQty = initialQty + movedQty;
      } else if (editingData.movementType === "OUT") {
        remainingQty = initialQty - movedQty;
      } else if (editingData.movementType === "ADJUSTMENT") {
        remainingQty = movedQty;
      }

      const docRef = doc(firestore, "Inventory", editingId);
      
      // Use a clean payload to prevent saving unwanted properties
      const payload = {
        activityTypeId: editingData.activityTypeId,
        productId: editingData.productId,
        date: new Date(editingData.date),
        movementType: editingData.movementType,
        initialQuantity: initialQty,
        quantityMoved: movedQty,
        remainingQuantity: remainingQty,
        modifiedAt: serverTimestamp()
      };

      await updateDoc(docRef, payload);

      setEditingId(null);
      setEditingData({});
      router.refresh();
    } catch (err) {
      console.error("Error updating inventory:", err);
      setError("Failed to update inventory");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleMassEdit = async () => {
    if (selectedItems.length === 0) return;
    const updates = {
      date: editingData.date,
      movementType: editingData.movementType,
      quantityMoved: editingData.quantityMoved,
      remainingQuantity: editingData.remainingQuantity,
      modifiedAt: serverTimestamp()
    };
    try {
      const batch = writeBatch(firestore);
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Inventory", id);
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

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Delete ${selectedItems.length} selected records?`)) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      selectedItems.forEach(id => {
        const ref = doc(firestore, "Inventory", id);
        batch.delete(ref);
      });
      await batch.commit();
      setSelectedItems([]);
      setSelectAll(false);
      router.refresh();
    } catch (err) {
      console.error("❌ Bulk delete failed:", err);
      setError("Failed to delete selected items");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, router, setError]);

  const handleDelete = useCallback(async (id) => {
    if (!id) return;
    if (!confirm(t('confirmations.deleteRecord'))) return;
    try {
      await deleteDoc(doc(firestore, "Inventory", id));
      router.refresh();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      setError(t('errors.failedToDeleteItem'));
    }
  }, [router, setError, t]);

  // When editing, calculate remaining quantity for live feedback in the UI
  const calculatedRemainingQuantity = useMemo(() => {
    if (!editingId) return 0;

    const initialQty = Number(editingData.initialQuantity) || 0;
    const movedQty = Number(editingData.quantityMoved) || 0;

    switch (editingData.movementType) {
      case 'IN':
        return initialQty + movedQty;
      case 'OUT':
        return initialQty - movedQty;
      case 'ADJUSTMENT':
        return movedQty;
      default:
        return initialQty;
    }
  }, [editingId, editingData.initialQuantity, editingData.quantityMoved, editingData.movementType]);

  // Prepare summary sections using robust logic
  const summarySections = useMemo(() => {
    if (!allInventoryMovements || !products || !productMap) return [];
    // The external getInventorySummaryTableData was causing issues.
    // Switching to the local prepareInventorySummary function which has the correct logic.
    return prepareInventorySummary(allInventoryMovements, products, productMap);
  }, [allInventoryMovements, products, productMap, prepareInventorySummary]);

  // Build all available product types from summarySections
  const allProductTypes = useMemo(() => summarySections.map(s => s.section), [summarySections]);

  // Ensure selectedProductTypes is always valid (default to Block Ice if empty)
  useEffect(() => {
    if (selectedProductTypes.length === 0 && allProductTypes.length > 0) {
      setSelectedProductTypes([allProductTypes[0]]);
    }
  }, [selectedProductTypes, allProductTypes]);

  // Notification effect for packaging thresholds
  const [notified, setNotified] = useState({ cube_ice: false, water_bottling: false });

  useEffect(() => {
    let isMounted = true;

    async function checkAndNotify() {
      if (!isMounted) return;

      // Get current packaging stocks
      const cubeIceStock = getTotalStockByType('Packaging For Ice Cube');
      const waterBottlingStock = getTotalStockByType('Packaging For Water Bottling');
      
      // Get thresholds
      const cubeIceThreshold = thresholds.iceCubes ?? 0;
      const waterBottlingThreshold = thresholds.bottles ?? 0;

      // Only proceed if stocks are below thresholds
      if (cubeIceStock <= cubeIceThreshold || waterBottlingStock <= waterBottlingThreshold) {
        const users = await userService.getAllUsers();
        const adminUsers = users.filter(u => u.role === 'admin' && u.uid);
        
        if (adminUsers.length > 0) {
          // Check cube ice packaging
          if (cubeIceStock <= cubeIceThreshold && !notified.cube_ice) {
            const title = t('notifications.lowStock.title');
            const message = t('notifications.lowStock.message', { 
              productName: t('products.items.packaging.cubeIce.5kg'), 
              currentStock: cubeIceStock, 
              threshold: cubeIceThreshold 
            });
            // Create notification for each admin
            adminUsers.forEach(admin => createThresholdNotification(admin.uid, title, message));
            
            if (isMounted) {
              setNotified(prev => ({ ...prev, cube_ice: true }));
            }
          }
          
          // Check water bottling packaging
          if (waterBottlingStock <= waterBottlingThreshold && !notified.water_bottling) {
            const title = t('notifications.lowStock.title');
            const message = t('notifications.lowStock.message', { 
              productName: t('products.items.packaging.waterBottling.750ml'), 
              currentStock: waterBottlingStock, 
              threshold: waterBottlingThreshold 
            });
            // Create notification for each admin
            adminUsers.forEach(admin => createThresholdNotification(admin.uid, title, message));

            if (isMounted) {
              setNotified(prev => ({ ...prev, water_bottling: true }));
            }
          }
        }
      }

      // Reset notifications if stocks are above thresholds
      if (isMounted) {
        setNotified(prev => ({
          cube_ice: cubeIceStock <= cubeIceThreshold ? prev.cube_ice : false,
          water_bottling: waterBottlingStock <= waterBottlingThreshold ? prev.water_bottling : false
        }));
      }
    }

    checkAndNotify();

    return () => {
      isMounted = false;
    };
  }, [thresholds, t, getTotalStockByType]); // Removed notified from dependencies

  // On mount, also restore filters from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('inventory_filters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setSelectedActivityType(parsed.selectedActivityType || "");
        setSelectedProduct(parsed.selectedProduct || "");
        setSelectedMovementType(parsed.selectedMovementType || "");
        setSelectedTimePeriod(parsed.selectedTimePeriod || TIME_PERIODS.MONTH);
        setDateFilters(parsed.dateFilters || getCurrentDateFilters());
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory_filters', JSON.stringify({
        selectedActivityType,
        selectedProduct,
        selectedMovementType,
        selectedTimePeriod,
        dateFilters
      }));
    }
  }, [selectedActivityType, selectedProduct, selectedMovementType, selectedTimePeriod, dateFilters]);

  // Compute available years for the records filter bar (from inventory data)
  const availableRecordYears = useMemo(() => {
    if (!allInventoryMovements) return [];
    const yearsSet = new Set();
    allInventoryMovements.forEach(inv => {
      const date = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
      yearsSet.add(date.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allInventoryMovements]);

  // Calculate total stock across all products
  const totalStock = useMemo(() => {
    if (!allInventoryMovements || !productMap) return 0;
    
    return Array.from(productMap.keys()).reduce((total, productId) => {
      const stock = getCurrentTotalStock(productId);
      return total + stock;
    }, 0);
  }, [allInventoryMovements, productMap, getCurrentTotalStock]);

  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    if (!allInventoryMovements || !productMap) return 0;
    
    let count = 0;
    Array.from(productMap.values()).forEach(product => {
      const stock = getCurrentTotalStock(product.id);
      const isPackaging = product.producttype?.toLowerCase().includes('packaging');
      
      if (isPackaging) {
        let threshold = 0;
        if (product.producttype.toLowerCase().includes('cube')) {
          threshold = thresholds?.iceCubes ?? 0;
        } else if (product.producttype.toLowerCase().includes('water')) {
          threshold = thresholds?.bottles ?? 0;
        }
        
        if (stock <= threshold) {
          count++;
        }
      }
    });
    
    return count;
  }, [allInventoryMovements, productMap, getCurrentTotalStock, thresholds]);

  // --- Early return for loading state ---
  if (isPageLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p>{t('inventory.records.loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">{t('inventory.dashboard')}</h1>
        
        {/* Time Period Filter */}
        <div className="flex items-center gap-4">
          <Select
            value={selectedTimePeriod}
            onChange={(e) => {
              e.preventDefault();
              setSelectedTimePeriod(e.target.value);
            }}
            className="w-40 bg-white border-purple-200 text-purple-900 focus:border-purple-500 focus:ring-purple-500"
          >
            <option value={TIME_PERIODS.ALL}>{t('timePeriods.all')}</option>
            <option value={TIME_PERIODS.YEAR}>{t('timePeriods.thisYear')}</option>
            <option value={TIME_PERIODS.MONTH}>{t('timePeriods.thisMonth')}</option>
            <option value={TIME_PERIODS.WEEK}>{t('timePeriods.thisWeek')}</option>
            <option value={TIME_PERIODS.CUSTOM}>{t('timePeriods.custom')}</option>
          </Select>
          
          {selectedTimePeriod === TIME_PERIODS.CUSTOM && (
            <div className="flex items-center gap-2">
              <TextInput
                type="date"
                value={dateFilters.startDate}
                onChange={(e) => {
                  e.preventDefault();
                  setDateFilters(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }));
                }}
              />
              <span>{t('filters.to')}</span>
              <TextInput
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => {
                  e.preventDefault();
                  setDateFilters(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }));
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Debug information */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading data: {error.message}</p>
        </div>
      )}
      


      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <TopCard
          title={t('inventory.summary.totalInventory') || 'Total Inventory'}
          value={`${(stockStats?.totalInventory || 0).toLocaleString()} ${t('charts.axes.units') || 'units'}`}
          icon={<HiInbox size={16} />}
          type="totalInventory"
        />
        <TopCard
          title={t('inventory.summary.monthlyMovements') || 'Monthly Movements'}
          value={`${stockStats?.monthlyMovements || 0} ${t('metrics.per_day') || 'per day'}`}
          icon={<HiRefresh size={16} />}
          type="monthlyMovements"
        />
        <TopCard 
          title={t('inventory.summary.blockIceStock') || 'Block Ice Stock'}
          value={`${(stockStats?.blockIceStock || 0).toLocaleString()} ${t('charts.axes.units') || 'units'}`}
          icon={<HiCube size={16} />}
          type="blockIce"
        />
        <TopCard 
          title={t('inventory.summary.cubeIceStock') || 'Cube Ice Stock'}
          value={`${(stockStats?.cubeIceStock || 0).toLocaleString()} ${t('charts.axes.units') || 'units'}`}
          icon={<HiCube size={16} />}
          type="cubeIce"
        />
        <TopCard 
          title={t('inventory.summary.waterBottlingStock') || 'Water Bottling Stock'}
          value={`${(stockStats?.waterBottlingStock || 0).toLocaleString()} ${t('charts.axes.units') || 'units'}`}
          icon={<PiBeerBottleFill size={16} />}
          type="waterBottling"
        />
        <TopCard 
          title={t('inventory.summary.packagingStock') || 'Packaging Stock'}
          value={`${(stockStats?.packagingStock || 0).toLocaleString()} ${t('charts.axes.units') || 'units'}`}
          icon={<HiArchive size={16} />}
          type="packaging"
        />
      </div>

      {/* Filter Section */}
      <Card className="mb-6 bg-white border-2 border-purple-300">
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 rounded-t-2xl">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-purple-900 mb-2">{t('inventory.records.title')}</h2>
                <p className="text-sm text-purple-600">Manage and track your inventory records</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <Button
                    color="failure"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="bg-purple-600 hover:bg-purple-700 shadow-sm text-white"
                  >
                    <HiTrash className="mr-2 h-4 w-4" />
                    {t('common.delete')} ({selectedItems.length})
                  </Button>
                )}
                <Button
                  color="gray"
                  size="sm"
                  onClick={handleRefresh}
                  className="bg-white text-purple-600 hover:bg-purple-50 border border-purple-200 shadow-sm"
                >
                  <HiRefresh className="h-4 w-4" />
                </Button>
                <Link href="/dashboard/inventory/add">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
                    <HiPlus className="h-4 w-4" />
                    
                  </Button>
                </Link>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end mb-6">
              {/* Year filter */}
              <div>
                <Label htmlFor="yearSelect">{t('inventory.fields.year') || 'Year'}</Label>
                <Select
                  id="yearSelect"
                  value={dateFilters.year || ''}
                  onChange={e => {
                    const year = parseInt(e.target.value, 10);
                    setDateFilters(prev => ({
                      ...prev,
                      year,
                      month: selectedMonth ? parseInt(selectedMonth, 10) - 1 : new Date().getMonth()
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full"
                  disabled={selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{t('inventory.filters.allYears') || 'All Years'}</option>
                  {availableRecordYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
              {/* Month filter */}
              <div>
                <Label htmlFor="monthSelect">{t('inventory.fields.month') || 'Month'}</Label>
                <Select
                  id="monthSelect"
                  value={selectedMonth || ''}
                  onChange={e => {
                    const month = e.target.value;
                    setSelectedMonth(month);
                    setDateFilters(prev => ({
                      ...prev,
                      month: month ? parseInt(month, 10) - 1 : undefined,
                      year: dateFilters.year || new Date().getFullYear()
                    }));
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full"
                  disabled={selectedTimePeriod === TIME_PERIODS.CUSTOM}
                >
                  <option value="">{t('inventory.filters.allMonths') || 'All Months'}</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {t(`months.${new Date(0, i).toLocaleString('default', { month: 'long' }).toLowerCase()}`)}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Activity Type filter */}
              <div>
                <Label htmlFor="activityType" className="text-purple-900 font-medium mb-1.5 block">
                  {t('common.activityType')}
                </Label>
                <Select
                  id="activityType"
                  value={selectedActivityType}
                  onChange={(e) => setSelectedActivityType(e.target.value)}
                  className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                >
                  <option value="">{t('inventory.filters.allActivityTypes')}</option>
                  {activityTypes?.map((type) => {
                    // Dynamic translation with fallback
                    const getTranslatedActivityType = (name) => {
                      if (!name) return name;
                      
                      // Try multiple translation key variations
                      const variations = [
                        name.toLowerCase().replace(/\s+/g, '_'),
                        name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        name.toLowerCase().replace(/\s+/g, ''),
                        name.replace(/\s+/g, '_').toLowerCase()
                      ];
                      
                      for (const variation of variations) {
                        const key = `products.activities.${variation}`;
                        const translated = t(key);
                        if (translated && translated !== key) {
                          return translated;
                        }
                      }
                      
                      return name; // Fallback to original name
                    };
                    
                    return (
                      <option key={type.id} value={type.id}>
                        {getTranslatedActivityType(type.name)}
                      </option>
                    );
                  })}
                </Select>
              </div>
              {/* Product filter */}
              <div>
                <Label htmlFor="product" className="text-purple-900 font-medium mb-1.5 block">
                  {t('common.product')}
                </Label>
                <Select
                  id="product"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                >
                  <option value="">{t('inventory.filters.allProducts')}</option>
                  {filteredProducts
                    .sort((a, b) => String(a.productid || a.name || '').localeCompare(String(b.productid || b.name || '')))
                    .map(product => (
                      <option key={product.id} value={product.id}>
                        {getTranslatedProductName(product, t)}
                      </option>
                    ))}
                </Select>
              </div>
              {/* Movement Type filter */}
              <div>
                <Label htmlFor="movementType" className="text-purple-900 font-medium mb-1.5 block">
                  {t('inventory.table.movementType')}
                </Label>
                <Select
                  id="movementType"
                  value={selectedMovementType}
                  onChange={(e) => setSelectedMovementType(e.target.value)}
                  className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                >
                  {movementTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(`inventory.table.${type.value ? type.value.toLowerCase() : 'allMovementTypes'}`)}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Source filter */}
              <div>
                <Label htmlFor="source" className="text-purple-900 font-medium mb-1.5 block">
                  {t('inventory.table.source')}
                </Label>
                <Select
                  id="source"
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                >
                  {sourceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Custom Date Range */}
            {selectedTimePeriod === TIME_PERIODS.CUSTOM && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate" className="text-purple-900 font-medium mb-1.5 block">
                    {t('common.startDate')}
                  </Label>
                  <TextInput
                    type="date"
                    id="startDate"
                    value={dateFilters.startDate}
                    onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-purple-900 font-medium mb-1.5 block">
                    {t('common.endDate')}
                  </Label>
                  <TextInput
                    type="date"
                    id="endDate"
                    value={dateFilters.endDate}
                    onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-white border-purple-200 text-gray-900 focus:ring-purple-500 focus:border-purple-500 rounded-lg"
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
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
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
              <thead className="bg-purple-50 text-xs uppercase tracking-wider">
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
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-purple-900 cursor-pointer hover:bg-purple-100"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      {t('inventory.table.date')}
                      {sortField === 'date' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-purple-900 cursor-pointer hover:bg-purple-100"
                    onClick={() => handleSort('productName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('inventory.table.product')}
                      {sortField === 'productName' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-purple-900 cursor-pointer hover:bg-purple-100">
                    {t('inventory.table.activityType')}
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold text-purple-900 cursor-pointer hover:bg-purple-100"
                    onClick={() => handleSort('movementType')}
                  >
                    <div className="flex items-center gap-1">
                      {t('inventory.table.movementType')}
                      {sortField === 'movementType' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-purple-900 text-center">{t('inventory.table.initialQuantity')}</th>
                  <th className="px-6 py-4 font-semibold text-purple-900 text-center">{t('inventory.table.quantityMoved')}</th>
                  <th className="px-6 py-4 font-semibold text-purple-900 text-center">{t('inventory.table.remaining')}</th>
                  <th className="px-6 py-4 font-semibold text-purple-900 text-center">{t('inventory.table.actions')}</th>
                  <th className="px-6 py-3 font-semibold text-center">{t('inventory.table.source')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {sortedData.map(record => (
                  <tr key={record.id} className="bg-white hover:bg-purple-50/50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(record.id)}
                        onChange={() => {
                          if (selectedItems.includes(record.id)) {
                            setSelectedItems(prev => prev.filter(item => item !== record.id));
                          } else {
                            setSelectedItems(prev => [...prev, record.id]);
                          }
                        }}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4c5c68] font-semibold">
                      {editingId === record.id ? (
                        <TextInput
                          type="date"
                          value={editingData.date || ''}
                          onChange={e => setEditingData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-[140px]"
                        />
                      ) : (
                        formatDate(record.date)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === record.id ? (
                        (() => {
                          // Build filtered, deduped, sorted product list, always including the current product
                          let filteredProducts = Array.from(
                            new Map(
                              Array.from(productMap.values())
                                .filter(product => {
                                  if (!editingData.activityTypeId) return true;
                                  return product.activitytypeid === editingData.activityTypeId;
                                })
                                .map(product => [product.id, product])
                            ).values()
                          );
                          // Always include the current product if not present
                          if (
                            editingData.productId &&
                            !filteredProducts.some(p => p.id === editingData.productId)
                          ) {
                            const currentProduct = productMap.get(editingData.productId);
                            if (currentProduct) filteredProducts.push(currentProduct);
                          }
                          filteredProducts = filteredProducts.sort((a, b) => String(a.productid || a.name || '').localeCompare(String(b.productid || b.name || '')));
                          return (
                            <Select
                              value={editingData.productId || ''}
                              onChange={e => setEditingData(prev => ({ ...prev, productId: e.target.value }))}
                              className="w-[180px]"
                              disabled={!editingData.activityTypeId}
                            >
                              <option value="">{t('inventory.filters.allProducts')}</option>
                              {filteredProducts.map(product => (
                                <option key={product.id} value={product.id}>
                                  {getTranslatedProductName(product, t)}
                                </option>
                              ))}
                            </Select>
                          );
                        })()
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-lg text-sm font-semibold
                            ${record.productName?.includes('Block') ? 'bg-purple-100 text-purple-800' :
                              record.productName?.includes('Cube') ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'}`}>
                            {renderProductName(record.productId)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === record.id ? (
                        <Select
                          value={editingData.activityTypeId || ''}
                          onChange={e => {
                            const newActivityTypeId = e.target.value;
                            setEditingData(prev => ({
                              ...prev,
                              activityTypeId: newActivityTypeId,
                              productId: '', // Reset productId when activity type changes
                            }));
                          }}
                          className="w-[150px]"
                        >
                          <option value="">{t('inventory.filters.allActivityTypes')}</option>
                          {activityTypes?.map(type => (
                            <option key={type.id} value={type.id}>
                              {t(`products.activities.${type.name?.toLowerCase().replace(/\s+/g, '_')}`) || type.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        (() => {
                          const activityTypeId = record.activityTypeId || productMap.get(record.productId)?.activitytypeid;
                          const activityTypeName = activityTypeMap?.get(activityTypeId)?.name || t('common.unknown');
                          
                          // Dynamic translation with fallback
                          const getTranslatedActivityType = (name) => {
                            if (!name) return t('common.unknown');
                            
                            // Try multiple translation key variations
                            const variations = [
                              name.toLowerCase().replace(/\s+/g, '_'),
                              name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                              name.toLowerCase().replace(/\s+/g, ''),
                              name.replace(/\s+/g, '_').toLowerCase()
                            ];
                            
                            for (const variation of variations) {
                              const key = `products.activities.${variation}`;
                              const translated = t(key);
                              if (translated && translated !== key) {
                                return translated;
                              }
                            }
                            
                            return name; // Fallback to original name
                          };
                          
                          return (
                            <span className="inline-block px-2 py-1 rounded bg-purple-50 text-purple-800 text-xs font-medium">
                              {getTranslatedActivityType(activityTypeName)}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === record.id ? (
                        <Select
                          value={editingData.movementType || ''}
                          onChange={e => setEditingData(prev => ({ ...prev, movementType: e.target.value }))}
                          className="w-[140px]"
                        >
                          {movementTypes.filter(mt => mt.value).map(type => (
                            <option key={type.value} value={type.value}>
                              {t(`inventory.table.${type.value.toLowerCase()}`) || type.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className={`px-3 py-1 inline-flex text-center text-xs leading-5 font-semibold rounded-full ${
                          record.movementType === "IN"
                            ? "bg-green-100 text-green-800"
                            : record.movementType === "OUT" || record.movementType === "Out"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {t(`inventory.table.${record.movementType?.toLowerCase()}`)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-semibold text-[#4c5c68]">
                      {editingId === record.id ? (
                        <TextInput
                          type="number"
                          value={editingData.initialQuantity ?? record.initialQuantity ?? 0}
                          onChange={e => setEditingData(prev => ({ ...prev, initialQuantity: e.target.value }))}
                          className="w-[100px] text-center"
                          min={0}
                        />
                      ) : (
                        record?.initialQuantity ?? 0
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === record.id ? (
                        <TextInput
                          type="number"
                          value={editingData.quantityMoved ?? record.quantityMoved ?? 0}
                          onChange={e => setEditingData(prev => ({ ...prev, quantityMoved: e.target.value }))}
                          className="w-[100px] text-center"
                          min={0}
                        />
                      ) : (
                        <span className={`font-mono font-semibold ${
                          record?.movementType === "IN"
                            ? "text-green-600"
                            : record?.movementType === "OUT"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}>
                          {record?.movementType === "IN" && "+"}
                          {record?.movementType === "OUT" && "-"}
                          {record?.quantityMoved || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-semibold text-green-600">
                      {editingId === record.id ? (
                        <TextInput
                          type="number"
                          value={calculatedRemainingQuantity}
                          className="w-[100px] text-center text-green-600 bg-gray-100"
                          readOnly
                        />
                      ) : (
                        record?.remainingQuantity ?? 0
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === record.id ? (
                        <div className="flex gap-2 justify-center">
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
                        <div className="flex gap-2 justify-center">
                          <Button
                            color="info"
                            size="xs"
                            onClick={() => startEditing(record)}
                            className="bg-purple-100 text-purple-600 hover:bg-purple-200 shadow-sm"
                          >
                            <HiPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() => handleDelete(record.id)}
                            className="bg-purple-600 hover:bg-purple-700 shadow-sm"
                          >
                            <HiTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {(() => {
                        switch (record.source) {
                          case 'production': return t('inventory.source.production', 'Production');
                          case 'consumption': return t('inventory.source.consumption', 'Consommation');
                          case 'sales': return t('inventory.source.sales', 'Vente');
                          case 'manual': return t('inventory.source.manual', 'Manuel');
                          default: return '';
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {filteredProductions.length > itemsPerPage && (
            <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-purple-100">
              <span className="text-sm text-purple-700">
                {t('table.showing')} {paginationData.indexOfFirstEntry + 1} {t('table.to')} {Math.min(paginationData.indexOfLastEntry, filteredProductions.length)} {t('table.of')} {filteredProductions.length} {t('table.entries')}
              </span>
              <div className="flex gap-2">
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 shadow-sm transition-colors duration-200"
                >
                  {t('common.previous')}
                </Button>
                <Button
                  color="gray"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages))}
                  disabled={currentPage === paginationData.totalPages}
                  className="bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 shadow-sm transition-colors duration-200"
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Summary Table */}
        <Card className="bg-white border border-purple-200 shadow-xl rounded-2xl overflow-hidden h-fit">
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-purple-900 uppercase">{t('inventory.summary.stock')}</h3>
                
                {/* Threshold Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-purple-700">{t('inventory.thresholds.iceCubes')}:</label>
                    <input
                      type="number"
                      value={thresholds.iceCubes}
                      onChange={e => handleThresholdChange('iceCubes', e.target.value)}
                      className="w-20 px-1 py-1 border border-purple-200 rounded text-sm text-center text-gray-900 bg-white focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-purple-700">{t('inventory.thresholds.bottles')}:</label>
                    <input
                      type="number"
                      value={thresholds.bottles}
                      onChange={e => handleThresholdChange('bottles', e.target.value)}
                      className="w-20 px-1 py-1 border border-purple-200 rounded text-sm text-center text-gray-900 bg-white focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Product Type Filter Dropdown */}
              <div className="relative min-w-[220px]">
                <label className="block text-sm font-medium text-purple-900 mb-1">{t('products.categories.filterByType') || 'Filter by Product Type'}</label>
                <button
                  type="button"
                  className="w-full border border-purple-200 rounded-lg bg-white text-purple-900 px-3 py-2 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onClick={() => setIsTypeDropdownOpen(open => !open)}
                >
                  <span className="flex flex-wrap gap-1">
                    {selectedProductTypes.length === 0
                      ? t('products.categories.multiSelectHint') || 'Select product types'
                      : selectedProductTypes.map(type => (
                          <span key={type} className="bg-purple-100 text-purple-800 rounded px-2 py-0.5 text-xs font-medium mr-1">{t(`products.types.${type.replace(/\s/g, '')}`) || type}</span>
                        ))}
                  </span>
                  <span className="ml-2 text-purple-400">▼</span>
                </button>
                {isTypeDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-purple-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {allProductTypes.map(type => (
                      <label key={type} className="flex items-center px-3 py-2 hover:bg-purple-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProductTypes.includes(type)}
                          onChange={e => {
                            setSelectedProductTypes(prev =>
                              e.target.checked
                                ? [...prev, type]
                                : prev.filter(t => t !== type)
                            );
                          }}
                          className="mr-2 accent-purple-600"
                        />
                        <span className="text-gray-900">{t(`products.types.${type.replace(/\s/g, '')}`) || t(`products.types.${type}`) || type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-5">
            <InventorySummaryTable summarySections={summarySections} t={t} thresholds={thresholds} selectedProductTypes={selectedProductTypes} />
          </div>
        </Card>

        {/* Trend Charts - Stacked Vertically */}
        <div className="flex flex-col gap-4">
          {/* Ice Cube Packaging Chart */}
          <Card className="bg-white">
            <h3 className="text-lg font-semibold mb-3 text-[#4c5c68] text-center">{t('inventory.charts.iceCubePackaging')}</h3>
            <div className="h-[350px] w-full">
              <ClientOnly>
                <BarChart 
                  data={getPackagingStockData("ice_cube", productMap, getCurrentTotalStock, t)}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      annotation: {
                        common: {
                          drawTime: 'afterDatasetsDraw'
                        },
                        annotations: {
                          threshold: {
                            type: 'line',
                            yMin: thresholds.iceCubes,
                            yMax: thresholds.iceCubes,
                            borderColor: '#DC2626',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            drawTime: 'afterDatasetsDraw',
                            label: {
                              display: true,
                              content: t('inventory.thresholds.warning'),
                              position: 'end',
                              backgroundColor: '#DC2626',
                              color: 'white',
                              padding: 4
                            }
                          }
                        }
                      }
                    }
                  }}
                />
              </ClientOnly>
            </div>
          </Card>

          {/* Water Bottling Packaging Chart */}
          <Card className="bg-white">
            <h3 className="text-lg font-semibold mb-3 text-[#4c5c68] text-center">{t('inventory.charts.waterBottlingPackaging')}</h3>
            <div className="h-[350px] w-full">
              <ClientOnly>
                <BarChart 
                  data={getPackagingStockData("water_bottling", productMap, getCurrentTotalStock, t)}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      annotation: {
                        common: {
                          drawTime: 'afterDatasetsDraw'
                        },
                        annotations: {
                          threshold: {
                            type: 'line',
                            yMin: thresholds.bottles,
                            yMax: thresholds.bottles,
                            borderColor: '#DC2626',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            drawTime: 'afterDatasetsDraw',
                            label: {
                              display: true,
                              content: t('inventory.thresholds.warning'),
                              position: 'end',
                              backgroundColor: '#DC2626',
                              color: 'white',
                              padding: 4
                            }
                          }
                        }
                      }
                    }
                  }}
                />
              </ClientOnly>
            </div>
          </Card>

          {/* Water Cans Packaging Chart */}
          <Card className="bg-white">
            <h3 className="text-lg font-semibold mb-3 text-[#4c5c68] text-center">{t('inventory.charts.waterCansPackaging') || 'Stock d\'Emballage pour Bidons d\'Eau'}</h3>
            <div className="h-[350px] w-full">
              <ClientOnly>
                <BarChart 
                  data={getPackagingStockData("water_cans", productMap, getCurrentTotalStock, t)}
                  options={{
                    ...baseChartOptions,
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </ClientOnly>
            </div>
          </Card>
        </div>
      </div>


    </div>
  );
}