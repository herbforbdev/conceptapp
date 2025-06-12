"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from '@/lib/translations/en.json';
import fr from '@/lib/translations/fr.json';

const LanguageContext = createContext();

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default English translations during SSR
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => {
        try {
          const keys = key.split('.');
          let translation = en;
          for (const k of keys) {
            translation = translation[k];
            if (translation === undefined) {
              console.warn(`Translation key not found: ${key}`);
              return key;
            }
          }
          // CRITICAL: Ensure we never return objects to prevent React Error #130
          if (typeof translation === 'object' && translation !== null) {
            console.warn(`Translation key "${key}" resolved to an object, returning key instead:`, translation);
            return key;
          }
          // Ensure we always return a string or number, never undefined/null
          if (translation === null || translation === undefined) {
            return key;
          }
          return translation;
        } catch (error) {
          console.warn(`Error translating key: ${key}`, error);
          return key;
        }
      }
    };
  }
  return context;
}

export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to English
  const [language, setLanguage] = useState('en'); // Default to 'en' for SSR
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
  }, []);

  // Load translations
  const translations = {
    en,
    fr
  };

  // Update localStorage when language changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('language', language);
    }
  }, [language, isClient]);

  // Translation function with object protection
  const t = useCallback((key) => {
    try {
      const keys = key.split('.');
      let translation = translations[language];
      
      for (const k of keys) {
        translation = translation[k];
        if (translation === undefined) {
          // Fallback to English if translation is missing
          translation = translations['en'];
          for (const k2 of keys) {
            translation = translation[k2];
            if (translation === undefined) {
              console.warn(`Translation key not found: ${key}`);
              return key; // Return the key if even English translation is missing
            }
          }
          break;
        }
      }
      
      // CRITICAL: Ensure we never return objects to prevent React Error #130
      if (typeof translation === 'object' && translation !== null) {
        console.warn(`Translation key "${key}" resolved to an object, returning key instead:`, translation);
        return key;
      }
      
      // Ensure we always return a string or number, never undefined/null
      if (translation === null || translation === undefined) {
        return key;
      }
      
      return translation;
    } catch (error) {
      console.error(`Error translating key: ${key}`, error);
      return key;
    }
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    translations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// We'll need the translations for Products, Expense Types, and Activity Types from you
const translations = {
  en: {
    // Common
    'Dashboard': 'Dashboard',
    'Reports': 'Reports',
    'Settings': 'Settings',
    'Loading': 'Loading...',
    'Actions': 'Actions',
    'Add': 'Add',
    'Edit': 'Edit',
    'Delete': 'Delete',
    'Cancel': 'Cancel',
    'Save': 'Save Changes',
    'Description': 'Description',
    'Name': 'Name',
    'Budget': 'Budget',
    // Main categories
    'Products': 'Products',
    'ExpenseTypes': 'Expense Types',
    'ActivityTypes': 'Activity Types',
    // Product Categories
    'IceBlocks': 'Ice Blocks',
    'IceCubes': 'Ice Cubes',
    'BottledWater': 'Bottled Water',
    // Products
    'SmallIceBlock': 'Small Ice Block',
    'LargeIceBlock': 'Large Ice Block',
    'IceCubes1kg': 'Ice Cubes 1kg',
    'IceCubes2kg': 'Ice Cubes 2kg',
    'IceCubes5kg': 'Ice Cubes 5kg',
    'Water600ml': 'Water 600ml',
    'Water750ml': 'Water 750ml',
    'Water1.5L': 'Water 1.5L',
    'Water5L': 'Water 5L',
    // Expense Types
    'MonthlyAllowance': 'Monthly Allowance',
    'PersonnelCosts': 'Personnel Costs',
    'SocialCharges': 'Social Charges',
    'TaxCharges': 'Tax Charges',
    'GeneratorFuel': 'Generator Fuel',
    'VehicleFuel': 'Vehicle Fuel',
    'MachineMaintenance': 'Machine Maintenance',
    'VehicleMaintenance': 'Vehicle Maintenance',
    'Construction': 'Construction & Real Estate',
    'Miscellaneous': 'Miscellaneous Expenses',
    'MedicalCare': 'Medical Care',
    // Activity Types
    'IceBlockProduction': 'Ice Blocks',
    'IceCubesAndBottles': 'Ice Cubes and Bottles',
    // Navigation
    'Production': 'Production',
    'Inventory': 'Inventory',
    'Sales': 'Sales',
    'Costs': 'Costs',
    'Master Data': 'Master Data',
    'Reports': 'Reports',
    'Profitability': 'Profitability',
    'Settings': 'Settings',
    // UI Elements
    'Toggle theme': 'Toggle theme',
    'Search': 'Search',
    'View notifications': 'View notifications',
    'User profile picture': 'User profile picture',
    'Dark Mode': 'Dark Mode',
    'Language': 'Language',
    'Email Notifications': 'Email Notifications',
    // Table Headers
    'Name': 'Name',
    'Category': 'Category',
    'Price': 'Price',
    'Description': 'Description',
    'Budget %': 'Budget %',
    'Actions': 'Actions',
    // Card Descriptions
    'Manage your product catalog': 'Manage your product catalog',
    'Manage expense categories': 'Manage expense categories',
    'Manage activity types': 'Manage activity types',
    // Settings
    'Users & Roles': 'Users & Roles',
    'Notifications': 'Notifications',
    'Profile Settings': 'Profile Settings',
    'App Settings': 'App Settings',
    'Manage user access and permissions': 'Manage user access and permissions',
    'Configure system notifications and alerts': 'Configure system notifications and alerts',
    'Update your personal information and preferences': 'Update your personal information and preferences',
    'Configure general application settings': 'Configure general application settings',
    'Toggle dark mode appearance': 'Toggle dark mode appearance',
    'Select your preferred language': 'Select your preferred language',
    'Receive email notifications for important updates': 'Receive email notifications for important updates',
    // Production Page
    'Production Overview': 'Production Overview',
    'Total Production': 'Total Production',
    'Daily Production': 'Daily Production',
    'Monthly Production': 'Monthly Production',
    'Production Records': 'Production Records',
    'Add Production': 'Add Production',
    'Edit Production': 'Edit Production',
    'Product Type': 'Product Type',
    'Quantity Produced': 'Quantity Produced',
    'Production Date': 'Production Date',
    'Packaging Used': 'Packaging Used',
    'Production Details': 'Production Details',
    'Production Statistics': 'Production Statistics',
    'Production Trends': 'Production Trends',
    'Ice Block Production': 'Ice Block Production',
    'Ice Cubes Production': 'Ice Cubes Production',
    'Bottled Water Production': 'Bottled Water Production',
    // Inventory Page
    'Inventory Overview': 'Inventory Overview',
    'Current Stock': 'Current Stock',
    'Low Stock Items': 'Low Stock Items',
    'Stock Value': 'Stock Value',
    'Stock Movement': 'Stock Movement',
    'Stock Level': 'Stock Level',
    'Initial Quantity': 'Initial Quantity',
    'Remaining Quantity': 'Remaining Quantity',
    'Movement Type': 'Movement Type',
    'Stock Trends': 'Stock Trends',
    'Stock Distribution': 'Stock Distribution',
    'Stock Alerts': 'Stock Alerts',
    'Add Stock': 'Add Stock',
    'Remove Stock': 'Remove Stock',
    'Adjust Stock': 'Adjust Stock',
    'Stock History': 'Stock History',
    // Sales Page
    'Sales Overview': 'Sales Overview',
    'Total Sales': 'Total Sales',
    'Daily Sales': 'Daily Sales',
    'Monthly Sales': 'Monthly Sales',
    'Sales Records': 'Sales Records',
    'Add Sale': 'Add Sale',
    'Edit Sale': 'Edit Sale',
    'Sale Date': 'Sale Date',
    'Amount (FC)': 'Amount (FC)',
    'Amount (USD)': 'Amount (USD)',
    'Exchange Rate': 'Exchange Rate',
    'Sales Channel': 'Sales Channel',
    'Quantity Sold': 'Quantity Sold',
    'Sales Trends': 'Sales Trends',
    'Sales by Channel': 'Sales by Channel',
    'Sales Statistics': 'Sales Statistics',
    // Costs Page
    'Costs Overview': 'Costs Overview',
    'Total Costs': 'Total Costs',
    'Monthly Costs': 'Monthly Costs',
    'Cost Records': 'Cost Records',
    'Add Cost': 'Add Cost',
    'Edit Cost': 'Edit Cost',
    'Cost Date': 'Cost Date',
    'Cost Type': 'Cost Type',
    'Cost Amount': 'Cost Amount',
    'Cost Distribution': 'Cost Distribution',
    'Cost Trends': 'Cost Trends',
    'Cost Statistics': 'Cost Statistics',
    'Expense Category': 'Expense Category',
    // Common Table Headers
    'Date': 'Date',
    'Type': 'Type',
    'Status': 'Status',
    'Quantity': 'Quantity',
    'Amount': 'Amount',
    'Product': 'Product',
    'Channel': 'Channel',
    // Chart Labels
    'Last 7 Days': 'Last 7 Days',
    'Last 30 Days': 'Last 30 Days',
    'This Month': 'This Month',
    'Last Month': 'Last Month',
    'This Year': 'This Year',
    'Previous Period': 'Previous Period',
    'Current Period': 'Current Period',
    'Variation': 'Variation',
    // Status Labels
    'Active': 'Active',
    'Inactive': 'Inactive',
    'Completed': 'Completed',
    'Pending': 'Pending',
    'In Progress': 'In Progress',
    // Filter Labels
    'Filter by Date': 'Filter by Date',
    'Filter by Type': 'Filter by Type',
    'Filter by Status': 'Filter by Status',
    'Apply Filters': 'Apply Filters',
    'Clear Filters': 'Clear Filters',
    'Date Range': 'Date Range',
    'Start Date': 'Start Date',
    'End Date': 'End Date',
    // Dashboard sections
    'Costs Dashboard': 'Costs Dashboard',
    'Today\'s Costs': 'Today\'s Costs',
    'Largest Expense': 'Largest Expense',
    'Monthly Variation': 'Monthly Variation',
    'Avg Daily Costs': 'Average Daily Costs',
    'Highest Cost': 'Highest Cost',
    // Filters
    'Activity Type': 'Activity Type',
    'Expense Type': 'Expense Type',
    'Month': 'Month',
    'All Activity Types': 'All Activity Types',
    'All Expense Types': 'All Expense Types',
    // Actions
    'Delete Selected': 'Delete Selected',
    'Loading data...': 'Loading data...',
    'No cost records found.': 'No cost records found.',
    'N/A': 'N/A',
    // Summary sections
    'Costs by Expense Type': 'Costs by Expense Type',
    'Expense Distribution': 'Expense Distribution',
    'Costs by Activity': 'Costs by Activity',
    'Expense Types': 'Expense Types',
    'Total': 'Total',
    'No data available': 'No data available',
    // Pagination
    'Previous': 'Previous',
    'Next': 'Next',
    'Showing': 'Showing',
    'to': 'to',
    'of': 'of',
    'entries': 'entries',
    // Dark mode
    'Toggle dark mode': 'Toggle dark mode',
    'Light': 'Light',
    'Dark': 'Dark',
    'System': 'System',
    // Common terms
    'Error': 'Error',
    'Success': 'Success',
    'Reset': 'Reset',
    'Apply': 'Apply',
    'Close': 'Close',
    'Confirm': 'Confirm',
  },
  fr: {
    // Common
    'Dashboard': 'Tableau de bord',
    'Reports': 'Rapports',
    'Settings': 'Paramètres',
    'Loading': 'Chargement...',
    'Actions': 'Actions',
    'Add': 'Ajouter',
    'Edit': 'Modifier',
    'Delete': 'Supprimer',
    'Cancel': 'Annuler',
    'Save': 'Enregistrer',
    'Description': 'Description',
    'Name': 'Nom',
    'Budget': 'Budget',
    // Main categories
    'Products': 'Produits',
    'ExpenseTypes': 'Type de Dépenses',
    'ActivityTypes': 'Type d\'activité',
    // Product Categories
    'IceBlocks': 'Blocs de glace',
    'IceCubes': 'Glaçons',
    'BottledWater': 'Eau en bouteille',
    // Products
    'SmallIceBlock': 'Bloc de glace - Petit',
    'LargeIceBlock': 'Bloc de glace - Grand',
    'IceCubes1kg': 'Glaçons 1kg',
    'IceCubes2kg': 'Glaçons 2kg',
    'IceCubes5kg': 'Glaçons 5kg',
    'Water600ml': 'Eau en bouteille 600ml',
    'Water750ml': 'Eau en bouteille 750ml',
    'Water1.5L': 'Eau en bouteille 1,5L',
    'Water5L': 'Eau en bouteille 5L',
    // Expense Types
    'MonthlyAllowance': 'Engagement mensuel (dotation)',
    'PersonnelCosts': 'Charges du Personnel',
    'SocialCharges': 'Charges sociales',
    'TaxCharges': 'Charges fiscales',
    'GeneratorFuel': 'Carburant groupe électrogène',
    'VehicleFuel': 'Carburant engins roulants',
    'MachineMaintenance': 'Entretien & rep machines',
    'VehicleMaintenance': 'Entretien & rep engins roulants',
    'Construction': 'Construction & rep immobilier',
    'Miscellaneous': 'Dépenses diverses',
    'MedicalCare': 'Soins médicaux',
    // Activity Types
    'IceBlockProduction': 'Blocs de Glace',
    'IceCubesAndBottles': 'Glaçons et Bouteilles',
    // Navigation
    'Production': 'Production',
    'Inventory': 'Inventaire',
    'Sales': 'Ventes',
    'Costs': 'Coûts',
    'Master Data': 'Données de Base',
    'Reports': 'Rapports',
    'Profitability': 'Rentabilité',
    'Settings': 'Paramètres',
    // UI Elements
    'Toggle theme': 'Changer le thème',
    'Search': 'Rechercher',
    'View notifications': 'Voir les notifications',
    'User profile picture': 'Photo de profil',
    'Dark Mode': 'Mode sombre',
    'Language': 'Langue',
    'Email Notifications': 'Notifications par email',
    // Table Headers
    'Name': 'Nom',
    'Category': 'Catégorie',
    'Price': 'Prix',
    'Description': 'Description',
    'Budget %': 'Budget %',
    'Actions': 'Actions',
    // Card Descriptions
    'Manage your product catalog': 'Gérer votre catalogue de produits',
    'Manage expense categories': 'Gérer les catégories de dépenses',
    'Manage activity types': 'Gérer les types d\'activités',
    // Settings
    'Users & Roles': 'Utilisateurs & Rôles',
    'Notifications': 'Notifications',
    'Profile Settings': 'Paramètres du profil',
    'App Settings': 'Paramètres de l\'application',
    'Manage user access and permissions': 'Gérer l\'accès et les permissions des utilisateurs',
    'Configure system notifications and alerts': 'Configurer les notifications et alertes système',
    'Update your personal information and preferences': 'Mettre à jour vos informations personnelles et préférences',
    'Configure general application settings': 'Configurer les paramètres généraux de l\'application',
    'Toggle dark mode appearance': 'Activer/désactiver le mode sombre',
    'Select your preferred language': 'Sélectionner votre langue préférée',
    'Receive email notifications for important updates': 'Recevoir des notifications par email pour les mises à jour importantes',
    // Production Page
    'Production Overview': 'Aperçu de la Production',
    'Total Production': 'Production Totale',
    'Daily Production': 'Production Journalière',
    'Monthly Production': 'Production Mensuelle',
    'Production Records': 'Registre de Production',
    'Add Production': 'Ajouter Production',
    'Edit Production': 'Modifier Production',
    'Product Type': 'Type de Produit',
    'Quantity Produced': 'Quantité Produite',
    'Production Date': 'Date de Production',
    'Packaging Used': 'Emballage Utilisé',
    'Production Details': 'Détails de Production',
    'Production Statistics': 'Statistiques de Production',
    'Production Trends': 'Tendances de Production',
    'Ice Block Production': 'Production de Blocs de Glace',
    'Ice Cubes Production': 'Production de Glaçons',
    'Bottled Water Production': 'Production d\'Eau en Bouteille',
    // Inventory Page
    'Inventory Overview': 'Aperçu de l\'Inventaire',
    'Current Stock': 'Stock Actuel',
    'Low Stock Items': 'Articles en Stock Faible',
    'Stock Value': 'Valeur du Stock',
    'Stock Movement': 'Mouvement de Stock',
    'Stock Level': 'Niveau de Stock',
    'Initial Quantity': 'Quantité Initiale',
    'Remaining Quantity': 'Quantité Restante',
    'Movement Type': 'Type de Mouvement',
    'Stock Trends': 'Tendances du Stock',
    'Stock Distribution': 'Distribution du Stock',
    'Stock Alerts': 'Alertes de Stock',
    'Add Stock': 'Ajouter Stock',
    'Remove Stock': 'Retirer Stock',
    'Adjust Stock': 'Ajuster Stock',
    'Stock History': 'Historique du Stock',
    // Sales Page
    'Sales Overview': 'Aperçu des Ventes',
    'Total Sales': 'Ventes Totales',
    'Daily Sales': 'Ventes Journalières',
    'Monthly Sales': 'Ventes Mensuelles',
    'Sales Records': 'Registre des Ventes',
    'Add Sale': 'Ajouter Vente',
    'Edit Sale': 'Modifier Vente',
    'Sale Date': 'Date de Vente',
    'Amount (FC)': 'Montant (FC)',
    'Amount (USD)': 'Montant (USD)',
    'Exchange Rate': 'Taux de Change',
    'Sales Channel': 'Canal de Vente',
    'Quantity Sold': 'Quantité Vendue',
    'Sales Trends': 'Tendances des Ventes',
    'Sales by Channel': 'Ventes par Canal',
    'Sales Statistics': 'Statistiques des Ventes',
    // Costs Page
    'Costs Overview': 'Aperçu des Coûts',
    'Total Costs': 'Coûts Totaux',
    'Monthly Costs': 'Coûts Mensuels',
    'Cost Records': 'Registre des Coûts',
    'Add Cost': 'Ajouter Coût',
    'Edit Cost': 'Modifier Coût',
    'Cost Date': 'Date du Coût',
    'Cost Type': 'Type de Coût',
    'Cost Amount': 'Montant du Coût',
    'Cost Distribution': 'Distribution des Coûts',
    'Cost Trends': 'Tendances des Coûts',
    'Cost Statistics': 'Statistiques des Coûts',
    'Expense Category': 'Catégorie de Dépense',
    // Common Table Headers
    'Date': 'Date',
    'Type': 'Type',
    'Status': 'Statut',
    'Quantity': 'Quantité',
    'Amount': 'Montant',
    'Product': 'Produit',
    'Channel': 'Canal',
    // Chart Labels
    'Last 7 Days': '7 Derniers Jours',
    'Last 30 Days': '30 Derniers Jours',
    'This Month': 'Ce Mois',
    'Last Month': 'Mois Dernier',
    'This Year': 'Cette Année',
    'Previous Period': 'Période Précédente',
    'Current Period': 'Période Actuelle',
    'Variation': 'Variation',
    // Status Labels
    'Active': 'Actif',
    'Inactive': 'Inactif',
    'Completed': 'Terminé',
    'Pending': 'En Attente',
    'In Progress': 'En Cours',
    // Filter Labels
    'Filter by Date': 'Filtrer par Date',
    'Filter by Type': 'Filtrer par Type',
    'Filter by Status': 'Filtrer par Statut',
    'Apply Filters': 'Appliquer les Filtres',
    'Clear Filters': 'Effacer les Filtres',
    'Date Range': 'Période',
    'Start Date': 'Date de Début',
    'End Date': 'Date de Fin',
    // Dashboard sections
    'Costs Dashboard': 'Tableau de Bord des Coûts',
    'Today\'s Costs': 'Coûts du Jour',
    'Largest Expense': 'Plus Grande Dépense',
    'Monthly Variation': 'Variation Mensuelle',
    'Avg Daily Costs': 'Coûts Journaliers Moyens',
    'Highest Cost': 'Coût le Plus Élevé',
    // Filters
    'Activity Type': 'Type d\'Activité',
    'Expense Type': 'Type de Dépense',
    'Month': 'Mois',
    'All Activity Types': 'Tous les Types d\'Activité',
    'All Expense Types': 'Tous les Types de Dépense',
    // Actions
    'Delete Selected': 'Supprimer la Sélection',
    'Loading data...': 'Chargement des données...',
    'No cost records found.': 'Aucun enregistrement trouvé.',
    'N/A': 'N/D',
    // Summary sections
    'Costs by Expense Type': 'Coûts par Type de Dépense',
    'Expense Distribution': 'Distribution des Dépenses',
    'Costs by Activity': 'Coûts par Activité',
    'Expense Types': 'Types de Dépense',
    'Total': 'Total',
    'No data available': 'Aucune donnée disponible',
    // Pagination
    'Previous': 'Précédent',
    'Next': 'Suivant',
    'Showing': 'Affichage de',
    'to': 'à',
    'of': 'sur',
    'entries': 'entrées',
    // Dark mode
    'Toggle dark mode': 'Basculer le mode sombre',
    'Light': 'Clair',
    'Dark': 'Sombre',
    'System': 'Système',
    // Common terms
    'Error': 'Erreur',
    'Success': 'Succès',
    'Reset': 'Réinitialiser',
    'Apply': 'Appliquer',
    'Close': 'Fermer',
    'Confirm': 'Confirmer',
  }
}; 