"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Button,
  Modal,
  Label,
  TextInput,
  Select
} from "flowbite-react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiTrash,
  HiPencil,
  HiSearch,
  HiFilter,
  HiDotsVertical,
  HiCheck,
  HiX,
  HiRefresh,
  HiChevronDown,
  HiChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineDuplicate,
  HiOutlineArchive,
  HiOutlineClipboardList
} from "react-icons/hi";
import { FaBoxes, FaMoneyBillWave, FaIndustry } from "react-icons/fa";
import { useMasterData } from "@/hooks/useMasterData";
import { useProductTypes } from '@/lib/hooks/useProductTypes';

// Constants
const ITEMS_PER_PAGE = 10;

// Add helper for product name/description translation
const getTranslatedProductName = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid;
  if (!name) return 'N/A';
  const lower = name.toLowerCase();
  const type = product.producttype?.toLowerCase();
  const includesAny = (str, terms) => terms.some(term => str.includes(term));
  try {
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
    if (type === 'water cans' || includesAny(lower, ['bidon', 'water can', 'water cans'])) {
      // Only translate if it matches exact standard product patterns
      const exactPatterns = [
        { pattern: /^(bidon d'eau |water can |water cans )?1l$/i, key: 'products.items.waterCans.1L' },
        { pattern: /^(bidon d'eau |water can |water cans )?(1\.5l|1,5l)$/i, key: 'products.items.waterCans.1,5L' },
        { pattern: /^(bidon d'eau |water can |water cans )?2l$/i, key: 'products.items.waterCans.2L' },
        { pattern: /^(bidon d'eau |water can |water cans )?5l$/i, key: 'products.items.waterCans.5L' },
        { pattern: /^(bidon d'eau |water can |water cans )?10l$/i, key: 'products.items.waterCans.10L' }
      ];
      
      for (const { pattern, key } of exactPatterns) {
        if (pattern.test(lower.trim())) {
          return t(key);
        }
      }
      
      // For non-standard products, return the original name to allow custom naming
    }
    if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
      // Handle cube ice packaging
      if (includesAny(lower, ['cube ice', 'glaçons'])) {
        if (lower.includes('1kg')) return t('products.items.packaging.cubeIce.1kg');
        if (lower.includes('2kg')) return t('products.items.packaging.cubeIce.2kg');
        if (lower.includes('5kg')) return t('products.items.packaging.cubeIce.5kg');
      }
      // Handle water bottling packaging (exclude water cans)
      if (includesAny(lower, ['water', 'eau']) && !includesAny(lower, ['bidon', 'can'])) {
        if (lower.includes('600ml')) return t('products.items.packaging.waterBottling.600ml');
        if (lower.includes('750ml')) return t('products.items.packaging.waterBottling.750ml');
        if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterBottling.1_5L');
        if (lower.includes('5l')) return t('products.items.packaging.waterBottling.5L');
      }
      // Handle water cans packaging specifically
      if (includesAny(lower, ['bidon', 'water can', 'water cans'])) {
        if (lower.includes('1l') && !lower.includes('1.5l') && !lower.includes('1,5l')) return t('products.items.packaging.waterCans.1L');
        if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterCans.1,5L');
        if (lower.includes('2l')) return t('products.items.packaging.waterCans.2L');
        if (lower.includes('5l')) return t('products.items.packaging.waterCans.5L');
        if (lower.includes('10l')) return t('products.items.packaging.waterCans.10L');
      }
    }
  } catch (error) {
    console.warn('Translation error for product:', name, error);
  }
  return name;
};

// Add helper for product description translation
const getTranslatedProductDescription = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid;
  if (!name) return 'N/A';
  const lower = name.toLowerCase();
  const type = product.producttype?.toLowerCase();
  const includesAny = (str, terms) => terms.some(term => str.includes(term));
  try {
    if (type === 'block ice' || includesAny(lower, ['bloc de glace', 'block ice'])) {
      if (lower.includes('5kg')) return t('products.descriptions.blockIce.5kg');
      if (lower.includes('8kg')) return t('products.descriptions.blockIce.8kg');
      if (lower.includes('30kg')) return t('products.descriptions.blockIce.30kg');
    }
    if (type === 'cube ice' || includesAny(lower, ['glaçons', 'cube ice', 'ice cube'])) {
      if (lower.includes('1kg')) return t('products.descriptions.cubeIce.1kg');
      if (lower.includes('2kg')) return t('products.descriptions.cubeIce.2kg');
      if (lower.includes('5kg')) return t('products.descriptions.cubeIce.5kg');
    }
    if (type === 'water bottling' || includesAny(lower, ['eau en bouteille', 'bottled water', 'water bottle'])) {
      if (lower.includes('600ml')) return t('products.descriptions.waterBottling.600ml');
      if (lower.includes('750ml')) return t('products.descriptions.waterBottling.750ml');
      if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.descriptions.waterBottling.1_5L');
      if (lower.includes('5l')) return t('products.descriptions.waterBottling.5L');
    }
    if (type === 'water cans' || includesAny(lower, ['bidon', 'water can', 'water cans'])) {
      if (lower.includes('1l') && !lower.includes('1.5l') && !lower.includes('1,5l')) return t('products.descriptions.waterCans.1L') || t('products.items.waterCans.1L');
      if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.descriptions.waterCans.1,5L') || t('products.items.waterCans.1,5L');
      if (lower.includes('2l')) return t('products.descriptions.waterCans.2L') || t('products.items.waterCans.2L');
      if (lower.includes('5l')) return t('products.descriptions.waterCans.5L') || t('products.items.waterCans.5L');
      if (lower.includes('10l')) return t('products.descriptions.waterCans.10L') || t('products.items.waterCans.10L');
    }
    if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
      // Only translate descriptions for standard packaging if description field is empty
      // Allow custom descriptions for packaging products
      if (!product.description || product.description.trim() === '') {
        if (includesAny(lower, ['cube ice', 'glaçons'])) {
          if (lower.includes('1kg')) return t('products.descriptions.packaging.cubeIce.1kg');
          if (lower.includes('2kg')) return t('products.descriptions.packaging.cubeIce.2kg');
          if (lower.includes('5kg')) return t('products.descriptions.packaging.cubeIce.5kg');
        }
        if (includesAny(lower, ['water', 'eau']) && !includesAny(lower, ['bidon', 'can'])) {
          if (lower.includes('600ml')) return t('products.descriptions.packaging.waterBottling.600ml');
          if (lower.includes('750ml')) return t('products.descriptions.packaging.waterBottling.750ml');
          if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.descriptions.packaging.waterBottling.1_5L');
          if (lower.includes('5l')) return t('products.descriptions.packaging.waterBottling.5L');
        }
        if (includesAny(lower, ['bidon', 'water can', 'water cans'])) {
          if (lower.includes('1l') && !lower.includes('1.5l') && !lower.includes('1,5l')) return t('products.descriptions.packaging.waterCans.1L');
          if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.descriptions.packaging.waterCans.1,5L');
          if (lower.includes('2l')) return t('products.descriptions.packaging.waterCans.2L');
          if (lower.includes('5l')) return t('products.descriptions.packaging.waterCans.5L');
          if (lower.includes('10l')) return t('products.descriptions.packaging.waterCans.10L');
        }
      }
    }
  } catch (error) {
    console.warn('Translation error for product description:', name, error);
  }
  return product.description || '-';
};

// Helper to normalize keys for translation
const normalizeKey = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const generateActivityId = (name) => {
  return normalizeKey(name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[ç]/g, 'c')            // Replace ç with c
    .replace(/[éèêë]/g, 'e')         // Replace éèêë with e
    .replace(/[àâä]/g, 'a')          // Replace àâä with a
    .replace(/[ùûü]/g, 'u')          // Replace ùûü with u
    .replace(/[îï]/g, 'i')           // Replace îï with i
    .replace(/[ôö]/g, 'o'));         // Replace ôö with o
};

// --- Translation helpers for expense and activity types ---
const expenseTypeTranslationMap = {
  "Generator Fuel": "generator_fuel",
  "Tax charges": "tax_charges",
  "Staff": "staff",
  "Miscellaneous Expenses": "miscellaneous_expenses",
  "Medical care": "medical_care",
  "Rolling Equipment": "rolling_equipment",
  "Social Charges": "social_charges",
  "Maintenance & Repairs of Rolling Equipment": "maintenance_repairs_of_rolling_equipment",
  "Monthly Commitment": "monthly_commitment",
  "Maintenance & Repairs of Machines": "maintenance_repairs_of_machines",
  "Construction & Real Estate Repairs": "construction_real_estate_repairs"
};

const expenseDescriptionTranslationMap = {
  "Expenses for Generator Fuel": "generator_fuel",
  "Expenses for Tax charges": "tax_charges",
  "Expenses for the Staff": "staff",
  "Expenses for Miscellaneous Expenses": "miscellaneous_expenses",
  "Expenses for Medical care": "medical_care",
  "Fuel Expenses for Rolling Equipment": "rolling_equipment",
  "Expenses for Social charges": "social_charges",
  "Expenses for Maintenance & Repairs of Rolling Equipment": "maintenance_repairs_of_rolling_equipment",
  "Expenses for Monthly Commitment": "monthly_commitment",
  "Expenses for Maintenance & Repairs of Machines": "maintenance_repairs_of_machines",
  "Expenses for Construction & Real Estate Repairs": "construction_real_estate_repairs"
};

const activityTypeTranslationMap = {
  "Cube Ice & Water Bottling": "cube_ice_water_bottling",
  "Block Ice": "block_ice"
};

function getTranslatedExpenseTypeName(name, t) {
  const key = expenseTypeTranslationMap[name];
  return key ? t(`masterData.expenses.types.${key}`) : name;
}

function getTranslatedExpenseDescription(name, t) {
  if (!name) return name;
  
  // First try direct mapping from expenseTypeTranslationMap
  const key = expenseTypeTranslationMap[name];
  if (key) {
    const translated = t(`masterData.expenses.descriptions.${key}`);
    if (translated && translated !== `masterData.expenses.descriptions.${key}`) {
      return translated;
    }
  }
  
  // Try direct description mapping from expenseDescriptionTranslationMap
  const descKey = expenseDescriptionTranslationMap[name];
  if (descKey) {
    const translated = t(`masterData.expenses.descriptions.${descKey}`);
    if (translated && translated !== `masterData.expenses.descriptions.${descKey}`) {
      return translated;
    }
  }
  
  // Try normalized key variations
  const variations = [
    name.toLowerCase().replace(/\s+/g, '_'),
    name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name.toLowerCase().replace(/\s+/g, ''),
    name.replace(/\s+/g, '_').toLowerCase()
  ];
  
  // Try different translation paths
  const paths = [
    'masterData.expenses.descriptions',
    'expenses.descriptions',
    'masterData.expenses.types'
  ];
  
  for (const path of paths) {
    for (const variation of variations) {
      const key = `${path}.${variation}`;
      const translated = t(key);
      if (translated && translated !== key) {
        return translated;
      }
    }
  }
  
  // Fallback: try to construct a description from the name
  const lowerName = name.toLowerCase();
  if (lowerName.includes('emballage')) {
    return 'Dépenses pour les emballages';
  } else if (lowerName.includes('intrant')) {
    return 'Dépenses pour les intrants';
  } else if (lowerName.includes('construction')) {
    return 'Dépenses pour la construction et les réparations immobilières';
  } else if (lowerName.includes('carburant') && lowerName.includes('générateur')) {
    return 'Dépenses pour le carburant du générateur';
  } else if (lowerName.includes('personnel') || lowerName.includes('staff')) {
    return 'Dépenses pour le personnel';
  } else if (lowerName.includes('charges') && lowerName.includes('social')) {
    return 'Dépenses pour les charges sociales';
  } else if (lowerName.includes('entretien') && lowerName.includes('machine')) {
    return 'Dépenses pour l\'entretien et les réparations des machines';
  } else if (lowerName.includes('engagement') && lowerName.includes('mensuel')) {
    return 'Dépenses pour l\'engagement mensuel';
  } else if (lowerName.includes('médic')) {
    return 'Dépenses pour les soins médicaux';
  } else if (lowerName.includes('divers')) {
    return 'Dépenses diverses';
  }
  
  return name; // Final fallback to original name
}

function getTranslatedActivityTypeName(name, t) {
  if (!name) return name;
  
  // Dynamic translation with fallback
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
}

function getTranslatedActivityDescription(name, t) {
  if (!name) return name;
  
  // Dynamic translation with fallback - try multiple paths
  const variations = [
    name.toLowerCase().replace(/\s+/g, '_'),
    name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name.toLowerCase().replace(/\s+/g, ''),
    name.replace(/\s+/g, '_').toLowerCase()
  ];
  
  // Try different translation paths
  const paths = [
    'masterData.activities.descriptions',
    'products.activities.descriptions',
    'activities.descriptions'
  ];
  
  for (const path of paths) {
    for (const variation of variations) {
      const key = `${path}.${variation}`;
      const translated = t(key);
      if (translated && translated !== key) {
        return translated;
      }
    }
  }
  
  return name; // Fallback to original name
}

export default function MasterDataPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { productTypes, isLoading: productTypesLoading, addProductType, updateProductType, deleteProductType } = useProductTypes();

  // 2. Data fetching hooks - useMasterData
  const { 
    products,
    activityTypes,
    expenseTypes,
    productMap,
    activityTypeMap,
    expenseTypeMap,
    loading: masterDataLoading 
  } = useMasterData();

  // 3. State management - group all useState hooks together
  const [activeTab, setActiveTab] = useState("products");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Mass edit data state
  const [massEditData, setMassEditData] = useState({
    products: {
      producttype: '',
      activitytypeid: '',
      description: ''
    },
    expenses: {
      category: '',
      budget: '',
      description: ''
    },
    activities: {
      name: '',
      description: ''
    }
  });

  // Add editing state
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // Add state for inline add row
  const [showAddRow, setShowAddRow] = useState(false);
  const [addRowData, setAddRowData] = useState({});
  const [addRowLoading, setAddRowLoading] = useState(false);

  // Add new type state
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [editingTypeDesc, setEditingTypeDesc] = useState("");

  // 4. Memoized values
  const activeData = useMemo(() => {
    switch (activeTab) {
      case "products":
        return products || [];
      case "expenses":
        return expenseTypes || [];
      case "activities":
        return activityTypes || [];
      default:
        return [];
    }
  }, [activeTab, products, expenseTypes, activityTypes]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return activeData;

    return [...activeData].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle special cases for sorting
      if (sortConfig.key === 'productid') {
        aValue = getTranslatedProductName(a, t) || '';
        bValue = getTranslatedProductName(b, t) || '';
      } else if (sortConfig.key === 'producttype') {
        const getType = (item) => {
          const type = item.producttype?.toLowerCase() || '';
          if (type.includes('packaging') && type.includes('cube')) return t('products.types.packagingForIceCube');
          if (type.includes('packaging') && type.includes('water')) return t('products.types.packagingForWaterBottling');
          if (type === 'block ice') return t('products.types.blockIce');
          if (type === 'cube ice') return t('products.types.cubeIce');
          if (type === 'water bottling') return t('products.types.waterBottling');
          return item.producttype;
        };
        aValue = getType(a);
        bValue = getType(b);
      } else if (sortConfig.key === 'activitytypeid') {
        aValue = t(`products.activities.${activityTypeMap.get(a.activitytypeid)?.name?.toLowerCase().replace(/\s+/g, '_')}`) || activityTypeMap.get(a.activitytypeid)?.name || '';
        bValue = t(`products.activities.${activityTypeMap.get(b.activitytypeid)?.name?.toLowerCase().replace(/\s+/g, '_')}`) || activityTypeMap.get(b.activitytypeid)?.name || '';
      } else if (sortConfig.key === 'name' && activeTab === 'expenses') {
        const getName = (item) => {
          const name = item.name?.toLowerCase() || '';
          if (name.includes('monthly') || name.includes('engagement')) return t('expenses.types.monthlyAllowance');
          if (name.includes('personnel') || name.includes('staff')) return t('expenses.types.personnelCosts');
          if (name.includes('social')) return t('expenses.types.socialCharges');
          if (name.includes('tax')) return t('expenses.types.taxCharges');
          if (name.includes('generator')) return t('expenses.types.generatorFuel');
          if (name.includes('vehicle') || name.includes('rolling')) return t('expenses.types.vehicleFuel');
          if (name.includes('machine')) return t('expenses.types.machineMaintenance');
          if (name.includes('vehicle') || name.includes('rolling')) return t('expenses.types.vehicleMaintenance');
          if (name.includes('construction') || name.includes('real estate')) return t('expenses.types.construction');
          if (name.includes('medical')) return t('expenses.types.medicalCare');
          if (name.includes('miscellaneous') || name.includes('divers')) return t('expenses.types.miscellaneous');
          return item.name;
        };
        aValue = getName(a);
        bValue = getName(b);
      } else if (sortConfig.key === 'name' && activeTab === 'activities') {
        const getName = (item) => {
          const name = item.name?.toLowerCase() || '';
          if (name.includes('block') || name.includes('bloc')) return t('activities.types.blockIce');
          if (name.includes('cube') || name.includes('bottling')) return t('activities.types.cubeAndBottling');
          return item.name;
        };
        aValue = getName(a);
        bValue = getName(b);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeData, sortConfig.key, sortConfig.direction, activityTypeMap, activeTab, t]);

  // Handle search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm) return sortedData;
    
    const term = searchTerm.toLowerCase();
    return sortedData.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
  }, [sortedData, searchTerm]);

  // Handle pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => 
    Math.ceil(filteredData.length / itemsPerPage),
    [filteredData, itemsPerPage]
  );

  // 5. Effects
  useEffect(() => {
    // Reset pagination when tab changes
    setCurrentPage(1);
    setSelectedItems([]);
    setShowMassEdit(false);
    setEditingItem(null);
    setEditFormData({});
    
    // Set default sort key based on active tab
    const defaultSortKey = activeTab === 'products' ? 'productid' : 'name';
    setSortConfig({ key: defaultSortKey, direction: 'asc' });
  }, [activeTab]);

  useEffect(() => {
    // Reset selection when page changes
    setSelectedItems([]);
  }, [currentPage]);

  // 6. Event Handlers
  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleEditStart = useCallback((item) => {
    setEditingItem(item.id);
    setEditFormData(item);
  }, []);

  const handleEditSave = useCallback(async (id) => {
      try {
      await updateDoc(doc(firestore, activeTab, id), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
      setEditFormData({});
      router.refresh();
      } catch (error) {
      console.error('Error updating item:', error);
      }
  }, [editFormData, activeTab, router]);

  const handleEditCancel = useCallback(() => {
    setEditingItem(null);
    setEditFormData({});
  }, []);

  const handleMassEditSave = useCallback(async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const batch = writeBatch(firestore);
      
      selectedItems.forEach(id => {
        const docRef = doc(firestore, activeTab, id);
        const updates = massEditData[activeTab];
        
        // Only include fields that have values
        const validUpdates = Object.entries(updates)
          .filter(([_, value]) => value !== '')
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(validUpdates).length > 0) {
          batch.update(docRef, {
            ...validUpdates,
            updatedAt: serverTimestamp()
          });
      }
      });

      await batch.commit();
      setShowMassEdit(false);
      setSelectedItems([]);
      setMassEditData({
        products: { producttype: '', activitytypeid: '', description: '' },
        expenses: { category: '', budget: '', description: '' },
        activities: { name: '', description: '' }
      });
      router.refresh();
    } catch (error) {
      console.error('Error updating items:', error);
    }
  }, [selectedItems, massEditData, activeTab, router]);

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.length === paginatedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
    }
  }, [selectedItems.length, paginatedData]);

  const toggleSelectItem = useCallback((id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Add edit handlers
  const startEditing = (item) => {
    setEditingId(item.id);
    
    // For activities tab, populate with original database values for editing
    if (activeTab === "activities") {
      setEditingData({
        ...item,
        name: getTranslatedActivityTypeName(item.name, t),
        description: item.description || '' // Use original database value, not translation
      });
    }
    // For expenses tab, populate with original database values for editing
    else if (activeTab === "expenses") {
      setEditingData({
        ...item,
        name: getTranslatedExpenseTypeName(item.name, t),
        description: item.description || '' // Use original database value, not translation
      });
    }
    // For products tab, populate with original database values for editing
    else {
      setEditingData({
        ...item,
        productid: getTranslatedProductName(item, t),
        description: item.description || '' // Use original database value, not translation
      });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEditing = async (id) => {
    try {
      const collection = activeTab === "products" ? "Products" :
                        activeTab === "expenses" ? "ExpenseTypes" : "ActivityTypes";
      
      let dataToSave = { ...editingData };
      
      // Trim the ID to remove any leading/trailing spaces
      const cleanId = id.trim();
      
      // For all tabs, we need to convert translated values back to original database values
      if (activeTab === "activities") {
        // Find original English name by matching translation
        const originalItem = activityTypes?.find(item => item.id.trim() === cleanId);
        if (originalItem) {
          // If the translated name was changed, keep the edited value
          // If it matches a translation, convert back to English
          if (editingData.name === getTranslatedActivityTypeName(originalItem.name, t)) {
            dataToSave.name = originalItem.name; // Keep original English
          }
          // Otherwise keep the edited value as-is (user entered new text)
        }
      } else if (activeTab === "expenses") {
        // Find original English name by matching translation  
        const originalItem = expenseTypes?.find(item => item.id.trim() === cleanId);
        if (originalItem) {
          // If the translated name was changed, keep the edited value
          // If it matches a translation, convert back to English
          if (editingData.name === getTranslatedExpenseTypeName(originalItem.name, t)) {
            dataToSave.name = originalItem.name; // Keep original English
          }
          // Otherwise keep the edited value as-is (user entered new text)
        }
      } else if (activeTab === "products") {
        // Find original product by ID
        const originalItem = products?.find(item => item.id.trim() === cleanId);
        if (originalItem) {
          // If the translated name matches, convert back to original value
          if (editingData.productid === getTranslatedProductName(originalItem, t)) {
            dataToSave.productid = originalItem.productid; // Keep original database value
          }
          // Description is already the original database value, so keep user's edits as-is
          // No need to check against translation since we're using original values for editing
        }
      }
      
      await updateDoc(doc(firestore, collection, cleanId), dataToSave);
      setEditingId(null);
      setEditingData({});
      router.refresh();
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  // Handler for Add button
  const handleShowAddRow = () => {
    setShowAddRow(true);
    setAddRowData({});
  };
  const handleCancelAddRow = () => {
    setShowAddRow(false);
    setAddRowData({});
  };
  const handleAddRowChange = (field, value) => {
    setAddRowData(prev => ({ ...prev, [field]: value }));
  };
  const handleSaveAddRow = async () => {
    setAddRowLoading(true);
    try {
      let collectionName;
      let data = { ...addRowData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (activeTab === 'products') {
        collectionName = 'Products';
      } else if (activeTab === 'expenses') {
        collectionName = 'ExpenseTypes';
      } else {
        collectionName = 'ActivityTypes';
      }
      await addDoc(collection(firestore, collectionName), data);
      setShowAddRow(false);
      setAddRowData({});
      router.refresh();
    } catch (e) {
      setAddRowLoading(false);
    }
    setAddRowLoading(false);
  };

  // Loading state
  if (masterDataLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('masterData.loading')}</p>
        </div>
      </div>
    );
  }

  // Card components
  const TopCard = ({ title, count, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{t(title)}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{count}</h3>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`h-6 w-6 ${color.replace('border-', 'text-')}`} />
        </div>
      </div>
    </motion.div>
  );

  // Modal for adding/editing items
  const ItemModal = () => {
    const isEdit = editingItem !== null;
    const title = isEdit ? t('masterData.actions.edit') : t('masterData.actions.add');

    const getFields = () => {
      switch (activeTab) {
        case "products":
          return (
            <>
              <div className="space-y-2">
                <Label>{t('masterData.table.id')}</Label>
                <TextInput
                  value={editFormData.productid || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, productid: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('masterData.table.type')}</Label>
                <div className="border rounded p-2 bg-white">
                  {productTypes.map(type => (
                    editingTypeId === type.id ? (
                      <div key={type.id} className="flex items-center gap-2 mb-1">
                        <input value={editingTypeName} onChange={e => setEditingTypeName(e.target.value)} className="border px-1" />
                        <input value={editingTypeDesc} onChange={e => setEditingTypeDesc(e.target.value)} className="border px-1" />
                        <button onClick={async () => { await updateProductType({ id: type.id, name: editingTypeName, description: editingTypeDesc }); setEditingTypeId(null); }}><HiCheck /></button>
                        <button onClick={() => setEditingTypeId(null)}><HiX /></button>
                      </div>
                    ) : (
                      <div key={type.id} className="flex items-center gap-2 mb-1">
                        <span>{type.name}</span>
                        <button onClick={() => { setEditingTypeId(type.id); setEditingTypeName(type.name); setEditingTypeDesc(type.description || ''); }}><HiPencil /></button>
                        <button onClick={async () => { if (window.confirm('Delete this type?')) await deleteProductType(type.id); }}><HiTrash /></button>
                      </div>
                    )
                  ))}
                  {showAddType ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Type name" className="border px-1" />
                      <input value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="Description" className="border px-1" />
                      <button onClick={async () => { await addProductType({ name: newTypeName, description: newTypeDesc }); setNewTypeName(''); setNewTypeDesc(''); setShowAddType(false); }}><HiCheck /></button>
                      <button onClick={() => setShowAddType(false)}><HiX /></button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 text-blue-600 mt-2" onClick={() => setShowAddType(true)}><HiPlus /> {t('common.add')}</button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('masterData.table.activity')}</Label>
                <Select
                  value={editFormData.activitytypeid || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, activitytypeid: e.target.value })}
                  required
                >
                  <option value="">{t('masterData.filters.activity')}</option>
                  {activityTypes?.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('masterData.table.description')}</Label>
                <TextInput
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
            </>
          );
        case "expenses":
          return (
            <>
              <div className="space-y-2">
                <Label>{t('masterData.table.name')}</Label>
                <TextInput
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('masterData.table.budget')}</Label>
                <TextInput
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.budget || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                />
              </div>
            </>
          );
        case "activities":
          return (
            <>
              <div className="space-y-2">
                <Label>{t('masterData.table.name')}</Label>
                <TextInput
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('masterData.table.description')}</Label>
                <TextInput
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
            </>
          );
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
          const collection = activeTab === "products" ? "Products" :
                           activeTab === "expenses" ? "ExpenseTypes" : "ActivityTypes";
          
          const data = {
            ...editFormData,
            updatedAt: serverTimestamp()
          };

          if (!isEdit) {
            data.createdAt = serverTimestamp();
      }

          if (isEdit) {
            const { id, ...updateData } = data;
            await updateDoc(doc(firestore, collection, id), updateData);
        } else {
            await addDoc(collection(firestore, collection), data);
          }

          setEditingItem(null);
          setEditFormData({});
          router.refresh();
        } catch (error) {
          console.error("Error saving item:", error);
        }
      };
      
      return (
        <Modal show={editingItem !== null} onClose={handleEditCancel} size="lg">
          <Modal.Header>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              {getFields()}
              <div className="flex justify-end gap-2 pt-4">
                <Button color="gray" onClick={handleEditCancel}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {isEdit ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>
      );
    };

  // Actions
  const handleAdd = () => {
    setEditingItem(null);
    setEditFormData({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const collection = activeTab === "products" ? "Products" :
                       activeTab === "expenses" ? "ExpenseTypes" : "ActivityTypes";
      // Trim the ID to handle leading/trailing spaces
      const cleanId = id.trim();
      await deleteDoc(doc(firestore, collection, cleanId));
      router.refresh();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedItems.length} selected items?`)) return;

    try {
      const collection = activeTab === "products" ? "Products" :
                       activeTab === "expenses" ? "ExpenseTypes" : "ActivityTypes";
      
      await Promise.all(
        selectedItems.map(id => deleteDoc(doc(firestore, collection, id.trim())))
      );

      setSelectedItems([]);
      router.refresh();
    } catch (error) {
      console.error("Error deleting items:", error);
    }
  };

  // Render table headers based on active tab
  const renderTableHeaders = () => {
    const getSortIcon = (key) => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    };
    const handleHeaderClick = (key) => {
      setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    };
    const headerClasses = (key) => `
      px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50
      ${sortConfig.key === key ? 'bg-gray-50' : ''}
    `;
    return (
      <thead className="bg-gray-50">
        <tr>
          {activeTab === "products" && (
            <>
              <th className={headerClasses('productid')} onClick={() => handleHeaderClick('productid')}>
                <div className="flex items-center gap-1">
                  {t('products.fields.name')}
                  {getSortIcon('productid')}
                </div>
              </th>
              <th className={headerClasses('producttype')} onClick={() => handleHeaderClick('producttype')}>
                <div className="flex items-center gap-1">
                  {t('products.fields.type')}
                  {getSortIcon('producttype')}
                </div>
              </th>
              <th className={headerClasses('activitytypeid')} onClick={() => handleHeaderClick('activitytypeid')}>
                <div className="flex items-center gap-1">
                  {t('products.fields.activityType')}
                  {getSortIcon('activitytypeid')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('products.fields.description')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.actions')}
              </th>
            </>
          )}
          {activeTab === "expenses" && (
            <>
              <th className={headerClasses('name')} onClick={() => handleHeaderClick('name')}>
                <div className="flex items-center gap-1">
                  {t('masterData.table.name')}
                  {getSortIcon('name')}
                </div>
              </th>
              <th className={headerClasses('budget')} onClick={() => handleHeaderClick('budget')}>
                <div className="flex items-center gap-1">
                  {t('masterData.table.budget')}
                  {getSortIcon('budget')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('masterData.table.description')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('masterData.table.actions')}
              </th>
            </>
          )}
          {activeTab === "activities" && (
            <>
              <th className={headerClasses('name')} onClick={() => handleHeaderClick('name')}>
                <div className="flex items-center gap-1">
                  {t('masterData.table.name')}
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('masterData.table.description')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('masterData.table.actions')}
              </th>
            </>
          )}
        </tr>
      </thead>
    );
  };

  // Render table row based on active tab
  const renderTableRow = (item) => (
    <>
      {activeTab === "products" && (
        <>
          <td className="px-6 py-3">
            {editingId === item.id ? (
              <TextInput
                value={editingData.productid || ''}
                onChange={(e) => setEditingData({ ...editingData, productid: e.target.value })}
                placeholder={t('products.fields.name')}
                className="w-full"
              />
            ) : (
              <div className="font-medium text-gray-900 flex items-center gap-2">
                {getTranslatedProductName(item, t)}
                {(() => {
                  const type = item.producttype?.toLowerCase() || '';
                  const name = item.productid?.toLowerCase() || '';
                  // Check if it's packaging based on type or name
                  const isPackaging = type.includes('packaging') || 
                                    type.includes('emballage') || 
                                    name.includes('packaging') || 
                                    name.includes('emballage') ||
                                    name.includes('package');
                  
                  return isPackaging ? (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                      {t('masterData.productType.packaging')}
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      {t('masterData.productType.product')}
                    </span>
                  );
                })()}
              </div>
            )}
          </td>
          <td className="px-6 py-3">
            {editingId === item.id ? (
              <TextInput
                value={editingData.producttype || ''}
                onChange={(e) => setEditingData({ ...editingData, producttype: e.target.value })}
                placeholder={t('products.fields.type')}
                className="w-full"
              />
            ) : (
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center
                ${(() => {
                  const type = item.producttype?.toLowerCase() || '';
                  const name = item.productid?.toLowerCase() || '';
                  const isPackaging = type.includes('packaging') || 
                                    type.includes('emballage') || 
                                    name.includes('packaging') || 
                                    name.includes('emballage') ||
                                    name.includes('package');
                  
                  if (isPackaging) return 'bg-purple-100 text-purple-700';
                  if (type === 'block ice') return 'bg-blue-100 text-blue-700';
                  if (type === 'cube ice') return 'bg-green-100 text-green-700';
                  return 'bg-amber-100 text-amber-700';
                })()}`}>
                <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-70"></span>
                {(() => {
                  const type = item.producttype?.toLowerCase() || '';
                  if (type.includes('packaging') && type.includes('cube')) return t('products.types.packagingForIceCube');
                  if (type.includes('packaging') && type.includes('water')) return t('products.types.packagingForWaterBottling');
                  if (type === 'block ice') return t('products.types.blockIce');
                  if (type === 'cube ice') return t('products.types.cubeIce');
                  if (type === 'water bottling') return t('products.types.waterBottling');
                  if (type === 'water cans') return t('products.types.waterCans');
                  return item.producttype;
                })()}
              </span>
            )}
          </td>
          <td className="px-6 py-3">
            {editingId === item.id ? (
              <Select
                value={editingData.activitytypeid || ''}
                onChange={(e) => setEditingData({ ...editingData, activitytypeid: e.target.value })}
                className="w-full"
              >
                <option value="">{t('products.fields.activityType')}</option>
                {activityTypes?.map(type => (
                  <option key={type.id} value={type.id}>{getTranslatedActivityTypeName(type.name, t)}</option>
                ))}
              </Select>
            ) : (
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center
                ${(() => {
                  const activityName = activityTypeMap.get(item.activitytypeid)?.name || '';
                  if (activityName.toLowerCase().includes('bottling')) return 'bg-amber-100 text-amber-700';
                  if (activityName.toLowerCase().includes('cube')) return 'bg-green-100 text-green-700';
                  if (activityName.toLowerCase().includes('bloc') || activityName.toLowerCase().includes('block')) return 'bg-blue-100 text-blue-700';
                  return 'bg-purple-100 text-purple-700';
                })()}`}> 
                <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-70"></span>
                {t(`products.activities.${activityTypeMap.get(item.activitytypeid)?.name?.toLowerCase().replace(/\s+/g, '_')}`) || activityTypeMap.get(item.activitytypeid)?.name || '-'}
              </span>
            )}
          </td>
          <td className="px-6 py-3 text-gray-600">
            {editingId === item.id ? (
              <TextInput
                value={editingData.description || ''}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                placeholder={t('products.fields.description')}
                className="w-full"
              />
            ) : (
              getTranslatedProductDescription(item, t)
            )}
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex items-center gap-2 justify-end">
              {editingId === item.id ? (
                <>
                  <Button
                    color="success"
                    size="xs"
                    onClick={() => saveEditing(item.id)}
                    className="bg-green-100 text-green-600 hover:bg-green-200"
                  >
                    <HiCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    color="gray"
                    size="xs"
                    onClick={cancelEditing}
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <HiX className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="light"
                    size="xs"
                    onClick={() => startEditing(item)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <HiPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    color="failure"
                    size="xs"
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </td>
        </>
      )}
      {activeTab === "expenses" && (
        <>
          <td className="px-6 py-3 font-medium">
            {editingId === item.id ? (
              <TextInput
                value={editingData.name || ''}
                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                placeholder={t('masterData.table.name')}
                className="w-full"
              />
            ) : (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center bg-purple-100 text-purple-700">
                <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-70"></span>
                {getTranslatedExpenseTypeName(item.name, t)}
              </span>
            )}
          </td>
          <td className="px-6 py-3">
            {editingId === item.id ? (
              <TextInput
                type="number"
                value={editingData.budget || ''}
                onChange={(e) => setEditingData({ ...editingData, budget: e.target.value })}
                placeholder={t('masterData.table.budget')}
                className="w-full"
              />
            ) : (
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                {item.budget}%
              </span>
            )}
          </td>
          <td className="px-6 py-3 text-gray-600">
            {editingId === item.id ? (
              <TextInput
                value={editingData.description || ''}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                placeholder={t('masterData.table.description')}
                className="w-full"
              />
            ) : (
              getTranslatedExpenseDescription(item.name, t) || item.description
            )}
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex items-center gap-2 justify-end">
              {editingId === item.id ? (
                <>
                  <Button
                    color="success"
                    size="xs"
                    onClick={() => saveEditing(item.id)}
                    className="bg-green-100 text-green-600 hover:bg-green-200"
                  >
                    <HiCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    color="gray"
                    size="xs"
                    onClick={cancelEditing}
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <HiX className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="light"
                    size="xs"
                    onClick={() => startEditing(item)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <HiPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    color="failure"
                    size="xs"
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </td>
        </>
      )}
      {activeTab === "activities" && (
        <>
          <td className="px-6 py-3 font-medium">
            {editingId === item.id ? (
              <TextInput
                value={editingData.name || ''}
                onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                placeholder={t('masterData.table.name')}
                className="w-full"
              />
            ) : (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center bg-blue-100 text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full mr-2 bg-current opacity-70"></span>
                {getTranslatedActivityTypeName(item.name, t)}
              </span>
            )}
          </td>
          <td className="px-6 py-3 text-gray-600">
            {editingId === item.id ? (
              <TextInput
                value={editingData.description || ''}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                placeholder={t('masterData.table.description')}
                className="w-full"
              />
            ) : (
              getTranslatedActivityDescription(item.name, t) || item.description
            )}
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex items-center gap-2 justify-end">
              {editingId === item.id ? (
                <>
                  <Button
                    color="success"
                    size="xs"
                    onClick={() => saveEditing(item.id)}
                    className="bg-green-100 text-green-600 hover:bg-green-200"
                  >
                    <HiCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    color="gray"
                    size="xs"
                    onClick={cancelEditing}
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <HiX className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    color="light"
                    size="xs"
                    onClick={() => startEditing(item)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <HiPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    color="failure"
                    size="xs"
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </td>
        </>
      )}
    </>
  );

  // Render inline add row
  const renderAddRow = () => {
    if (!showAddRow) return null;
    if (activeTab === 'products') {
      return (
        <tr>
          <td className="px-6 py-3">
            <TextInput value={addRowData.productid || ''} onChange={e => handleAddRowChange('productid', e.target.value)} placeholder={t('products.fields.name')} className="w-full" />
          </td>
          <td className="px-6 py-3">
            <TextInput value={addRowData.producttype || ''} onChange={e => handleAddRowChange('producttype', e.target.value)} placeholder={t('products.fields.type')} className="w-full" />
          </td>
          <td className="px-6 py-3">
            <Select value={addRowData.activitytypeid || ''} onChange={e => handleAddRowChange('activitytypeid', e.target.value)} className="w-full">
              <option value="">{t('masterData.filters.activity')}</option>
              {activityTypes?.map(type => (
                <option key={type.id} value={type.id}>{getTranslatedActivityTypeName(type.name, t)}</option>
              ))}
            </Select>
          </td>
          <td className="px-6 py-3">
            <TextInput value={addRowData.description || ''} onChange={e => handleAddRowChange('description', e.target.value)} placeholder={t('products.fields.description')} className="w-full" />
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex gap-2 justify-end">
              <Button size="xs" color="success" onClick={handleSaveAddRow} disabled={addRowLoading} className="bg-green-100 text-green-600 hover:bg-green-200">
                <HiCheck className="h-4 w-4" />
              </Button>
              <Button size="xs" color="gray" onClick={handleCancelAddRow} className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                <HiX className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      );
    }
    if (activeTab === 'expenses') {
      return (
        <tr>
          <td className="px-6 py-3">
            <TextInput value={addRowData.name || ''} onChange={e => handleAddRowChange('name', e.target.value)} placeholder={t('masterData.table.name')} className="w-full" />
          </td>
          <td className="px-6 py-3">
            <TextInput type="number" value={addRowData.budget || ''} onChange={e => handleAddRowChange('budget', e.target.value)} placeholder={t('masterData.table.budget')} className="w-full" />
          </td>
          <td className="px-6 py-3">
            <TextInput value={addRowData.description || ''} onChange={e => handleAddRowChange('description', e.target.value)} placeholder={t('masterData.table.description')} className="w-full" />
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex gap-2 justify-end">
              <Button size="xs" color="success" onClick={handleSaveAddRow} disabled={addRowLoading} className="bg-green-100 text-green-600 hover:bg-green-200">
                <HiCheck className="h-4 w-4" />
              </Button>
              <Button size="xs" color="gray" onClick={handleCancelAddRow} className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                <HiX className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      );
    }
    if (activeTab === 'activities') {
      return (
        <tr>
          <td className="px-6 py-3">
            <TextInput value={addRowData.name || ''} onChange={e => handleAddRowChange('name', e.target.value)} placeholder={t('masterData.table.name')} className="w-full" />
          </td>
          <td className="px-6 py-3">
            <TextInput value={addRowData.description || ''} onChange={e => handleAddRowChange('description', e.target.value)} placeholder={t('masterData.table.description')} className="w-full" />
          </td>
          <td className="px-6 py-3 text-right">
            <div className="flex gap-2 justify-end">
              <Button size="xs" color="success" onClick={handleSaveAddRow} disabled={addRowLoading} className="bg-green-100 text-green-600 hover:bg-green-200">
                <HiCheck className="h-4 w-4" />
              </Button>
              <Button size="xs" color="gray" onClick={handleCancelAddRow} className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                <HiX className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      );
    }
    return null;
  };

  // Render main content
  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('masterData.title')}</h1>
        <p className="text-gray-600">Manage your products, expense types, and activities</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <TopCard
          title={t('masterData.cards.totalProducts')}
          count={products?.length || 0}
          icon={FaBoxes}
          color="border-blue-600"
        />
        <TopCard
          title={t('masterData.cards.expenseTypes')}
          count={expenseTypes?.length || 0}
          icon={FaMoneyBillWave}
          color="border-green-600"
        />
        <TopCard
          title={t('masterData.cards.activityTypes')}
          count={activityTypes?.length || 0}
          icon={FaIndustry}
          color="border-purple-600"
        />
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab("products");
                setSelectedItems([]);
                setCurrentPage(1);
              }}
              className={`${
                activeTab === "products"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } flex items-center py-4 px-6 border-b-2 font-medium text-sm`}
            >
              <FaBoxes className="mr-2 h-5 w-5" />
              {t('masterData.tabs.products')}
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                setSelectedItems([]);
                setCurrentPage(1);
              }}
              className={`${
                activeTab === "expenses"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } flex items-center py-4 px-6 border-b-2 font-medium text-sm`}
            >
              <FaMoneyBillWave className="mr-2 h-5 w-5" />
              {t('masterData.tabs.expenses')}
            </button>
            <button
              onClick={() => {
                setActiveTab("activities");
                setSelectedItems([]);
                setCurrentPage(1);
              }}
              className={`${
                activeTab === "activities"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } flex items-center py-4 px-6 border-b-2 font-medium text-sm`}
            >
              <FaIndustry className="mr-2 h-5 w-5" />
              {t('masterData.tabs.activities')}
            </button>
          </nav>
        </div>

        {/* Table Add Button */}
        <div className="flex justify-end mb-2">
          {!showAddRow && (
            <Button size="sm" onClick={handleShowAddRow} className="bg-purple-600 hover:bg-purple-700 text-white">
              <HiPlus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          )}
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {renderTableHeaders()}
            <tbody className="bg-white divide-y divide-gray-200">
              {renderAddRow()}
              {paginatedData.map(item => (
                <tr key={item.id}>
                  {renderTableRow(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                }
              }}
              className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm leading-5 font-medium text-gray-500 hover:bg-gray-50 focus:z-10"
            >
              Previous
            </button>
            <span className="px-4 py-2 border-t border-b border-gray-200 bg-white text-sm leading-5 font-medium text-gray-700">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(currentPage + 1);
                }
              }}
              className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm leading-5 font-medium text-gray-500 hover:bg-gray-50 focus:z-10"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {/* Mass Edit Modal */}
      <Modal show={showMassEdit} onClose={() => {
        setShowMassEdit(false);
        setSelectedItems([]);
        setMassEditData({
          products: { producttype: '', activitytypeid: '', description: '' },
          expenses: { category: '', budget: '', description: '' },
          activities: { name: '', description: '' }
        });
      }} size="lg">
        <Modal.Header>
          <h3 className="text-xl font-semibold text-gray-900">{t('masterData.actions.massEdit')}</h3>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleMassEditSave} className="space-y-4">
            {/* Render mass edit fields inline here instead of calling renderMassEditFields */}
            {activeTab === 'products' && (
              <>
                <div>
                  <Label htmlFor="massProductType">{t('masterData.table.type')}</Label>
                  <Select
                    id="massProductType"
                    value={massEditData.products.producttype}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      products: { ...prev.products, producttype: e.target.value }
                    }))}
                    className="mt-1"
                  >
                    <option value="">{t('masterData.filters.type')}</option>
                    {productTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="massActivityType">{t('masterData.table.activity')}</Label>
                  <Select
                    id="massActivityType"
                    value={massEditData.products.activitytypeid}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      products: { ...prev.products, activitytypeid: e.target.value }
                    }))}
                    className="mt-1"
                  >
                    <option value="">{t('masterData.filters.activity')}</option>
                    {activityTypes?.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="massDescription">{t('masterData.table.description')}</Label>
                  <TextInput
                    id="massDescription"
                    value={massEditData.products.description}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      products: { ...prev.products, description: e.target.value }
                    }))}
                    placeholder={t('masterData.filters.description')}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            {activeTab === 'expenses' && (
              <>
                <div>
                  <Label htmlFor="massBudget">{t('masterData.table.budget')}</Label>
                  <TextInput
                    id="massBudget"
                    type="number"
                    min="0"
                    max="100"
                    value={massEditData.expenses.budget}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      expenses: { ...prev.expenses, budget: e.target.value }
                    }))}
                    placeholder={t('masterData.filters.budget')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="massDescription">{t('masterData.table.description')}</Label>
                  <TextInput
                    id="massDescription"
                    value={massEditData.expenses.description}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      expenses: { ...prev.expenses, description: e.target.value }
                    }))}
                    placeholder={t('masterData.filters.description')}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            {activeTab === 'activities' && (
              <>
                <div>
                  <Label htmlFor="massName">{t('masterData.table.name')}</Label>
                  <TextInput
                    id="massName"
                    value={massEditData.activities.name}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      activities: { ...prev.activities, name: e.target.value }
                    }))}
                    placeholder={t('masterData.filters.name')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="massDescription">{t('masterData.table.description')}</Label>
                  <TextInput
                    id="massDescription"
                    value={massEditData.activities.description}
                    onChange={(e) => setMassEditData(prev => ({
                      ...prev,
                      activities: { ...prev.activities, description: e.target.value }
                    }))}
                    placeholder={t('masterData.filters.description')}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button color="gray" onClick={() => {
                setShowMassEdit(false);
                setSelectedItems([]);
                setMassEditData({
                  products: { producttype: '', activitytypeid: '', description: '' },
                  expenses: { category: '', budget: '', description: '' },
                  activities: { name: '', description: '' }
                });
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}