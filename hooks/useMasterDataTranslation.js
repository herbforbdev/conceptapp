import { useLanguage } from '@/context/LanguageContext';
import { masterDataTranslations } from '@/lib/translations/masterData';

export function useMasterDataTranslation() {
  const { language } = useLanguage();

  const translateProduct = (productId) => {
    if (!productId) return '';
    const translation = masterDataTranslations.products[productId];
    return translation ? translation[language] || translation.en || productId : productId;
  };

  const translateProductType = (type) => {
    if (!type) return '';
    const translation = masterDataTranslations.productTypes[type];
    return translation ? translation[language] || translation.en || type : type;
  };

  const translateActivityType = (type) => {
    if (!type) return '';
    const translation = masterDataTranslations.activityTypes[type];
    return translation ? translation[language] || translation.en || type : type;
  };

  const translateExpenseType = (type) => {
    if (!type) return '';
    const translation = masterDataTranslations.expenseTypes[type];
    return translation ? translation[language] || translation.en || type : type;
  };

  // Helper to translate any master data type
  const translateMasterData = (type, key) => {
    if (!type || !key) return '';
    const translations = masterDataTranslations[type];
    if (!translations) return key;
    const translation = translations[key];
    return translation ? translation[language] || translation.en || key : key;
  };

  return {
    translateProduct,
    translateProductType,
    translateActivityType,
    translateExpenseType,
    translateMasterData
  };
} 