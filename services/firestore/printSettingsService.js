import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

const COLLECTION_NAME = 'PrintSettings';

/**
 * Default print configuration
 */
export const DEFAULT_PRINT_CONFIG = {
  // Company Information
  company: {
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: null // URL to logo image
  },
  
  // Page Settings
  page: {
    size: 'A4',
    orientation: 'portrait',
    margin: {
      top: '15mm',
      right: '10mm',
      bottom: '15mm',
      left: '10mm'
    }
  },
  
  // Header Settings
  header: {
    enabled: true,
    showCompanyName: true,
    showReportTitle: true,
    fontSize: '10pt',
    color: '#666'
  },
  
  // Footer Settings
  footer: {
    enabled: true,
    showPageNumbers: true,
    showGeneratedDate: true,
    showPreparedBy: true,
    fontSize: '9pt',
    color: '#666'
  },
  
  // Typography
  typography: {
    bodyFontSize: '11pt',
    tableFontSize: '10pt',
    lineHeight: '1.4'
  },
  
  // Table Settings
  table: {
    borderCollapse: true,
    repeatHeader: true,
    avoidRowBreak: true
  },
  
  // Colors
  colors: {
    preserveColors: true
  }
};

/**
 * Get print settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Print settings
 */
export const getPrintSettings = async (userId) => {
  try {
    const docRef = doc(firestore, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Return default settings if none exist
    return DEFAULT_PRINT_CONFIG;
  } catch (error) {
    console.error('Error getting print settings:', error);
    return DEFAULT_PRINT_CONFIG;
  }
};

/**
 * Save print settings for a user
 * @param {string} userId - User ID
 * @param {Object} settings - Print settings to save
 * @returns {Promise<void>}
 */
export const savePrintSettings = async (userId, settings) => {
  try {
    const docRef = doc(firestore, COLLECTION_NAME, userId);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving print settings:', error);
    throw error;
  }
};

/**
 * Generate print styles from settings
 * @param {Object} settings - Print settings
 * @param {Object} options - Additional options (user, reportTitle, etc.)
 * @returns {string} CSS string for print styles
 */
export const generatePrintStyles = (settings, options = {}) => {
  const { user = null, reportTitle = '' } = options;
  
  const pageSize = settings.page.orientation === 'landscape' 
    ? `${settings.page.size} landscape` 
    : settings.page.size;
  
  const margins = `${settings.page.margin.top} ${settings.page.margin.right} ${settings.page.margin.bottom} ${settings.page.margin.left}`;
  
  // Build header content
  let headerContent = '';
  if (settings.header.enabled) {
    const parts = [];
    if (settings.header.showCompanyName && settings.company.name) {
      parts.push(settings.company.name);
    }
    if (settings.header.showReportTitle && reportTitle) {
      parts.push(reportTitle);
    }
    headerContent = parts.length > 0 ? `"${parts.join(' - ')}"` : '""';
  }
  
  // Build footer content
  let footerContent = '';
  if (settings.footer.enabled) {
    const parts = [];
    if (settings.footer.showPageNumbers) {
      parts.push('"Page " counter(page) " of " counter(pages)');
    }
    footerContent = parts.length > 0 ? parts.join(' | ') : '""';
  }
  
  return `
    @page {
      size: ${pageSize};
      margin: ${margins};
      ${settings.header.enabled && headerContent ? `
      @top-center {
        content: ${headerContent};
        font-size: ${settings.header.fontSize};
        color: ${settings.header.color};
      }` : ''}
      ${settings.footer.enabled && footerContent ? `
      @bottom-center {
        content: ${footerContent};
        font-size: ${settings.footer.fontSize};
        color: ${settings.footer.color};
      }` : ''}
    }
    @media print {
      ${settings.colors.preserveColors ? `
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }` : ''}
      body {
        font-size: ${settings.typography.bodyFontSize};
        line-height: ${settings.typography.lineHeight};
      }
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .print-content {
        display: block !important;
      }
      .print-page-break {
        page-break-after: always;
      }
      .print-avoid-break {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: auto;
        ${settings.table.borderCollapse ? 'border-collapse: collapse;' : ''}
        width: 100%;
        font-size: ${settings.typography.tableFontSize};
      }
      ${settings.table.repeatHeader ? `
      thead {
        display: table-header-group;
      }` : ''}
      tfoot {
        display: table-footer-group;
      }
      ${settings.table.avoidRowBreak ? `
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead tr {
        page-break-after: avoid;
      }
      tbody tr {
        page-break-inside: avoid;
      }` : ''}
      .print-header {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #385e82;
      }
      .print-footer {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
        font-size: 9pt;
        color: #666;
      }
      .print-summary-section {
        margin-bottom: 25px;
        page-break-inside: avoid;
      }
      .print-table-wrapper {
        page-break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
      .print-content {
        padding: 20px;
      }
    }
  `;
};

