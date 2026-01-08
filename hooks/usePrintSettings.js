import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPrintSettings, generatePrintStyles, DEFAULT_PRINT_CONFIG } from '@/services/firestore/printSettingsService';

/**
 * Custom hook for managing print settings
 * @returns {Object} Print settings and utilities
 */
export const usePrintSettings = () => {
  const { user } = useAuth();
  const [printSettings, setPrintSettings] = useState(DEFAULT_PRINT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadSettings();
    } else {
      setPrintSettings(DEFAULT_PRINT_CONFIG);
      setIsLoading(false);
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const settings = await getPrintSettings(user?.uid);
      setPrintSettings(settings);
    } catch (error) {
      console.error('Error loading print settings:', error);
      setPrintSettings(DEFAULT_PRINT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate print styles for useReactToPrint
   * @param {Object} options - Options for print
   * @param {string} options.reportTitle - Report title for header
   * @returns {string} CSS string for print styles
   */
  const getPrintStyles = (options = {}) => {
    return generatePrintStyles(printSettings, {
      user,
      reportTitle: options.reportTitle || ''
    });
  };

  return {
    printSettings,
    isLoading,
    getPrintStyles,
    reloadSettings: loadSettings
  };
};

