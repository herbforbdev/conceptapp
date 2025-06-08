import { useLanguage } from '@/context/LanguageContext';

// Export the useTranslation hook for components to use
export const useTranslation = () => {
  const context = useLanguage();
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

// Export language utilities
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

export const getDefaultLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'en';
  
  const savedLang = localStorage.getItem('language');
  if (savedLang && isValidLanguage(savedLang)) {
    return savedLang;
  }
  
  const browserLang = navigator.language.split('-')[0];
  return isValidLanguage(browserLang) ? browserLang : 'en';
};

export const saveLanguagePreference = (lang: SupportedLanguage): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
  }
}; 