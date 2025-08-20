import { initReacti18n } from 'react-i18next';
import en from './locales/en/common.json';
import zh from './locales/zh/common.json';
import jp from './locales/jp/common.json';

// Language resources
const resources = {
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
  jp: {
    translation: jp,
  },
};

// Initialize i18n
i18n.use(initReacti18n).init({
  resources,
  lng: 'zh-TW', // Default language
  fallbackLng: 'zh-TW', // Fallback language if not found
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;