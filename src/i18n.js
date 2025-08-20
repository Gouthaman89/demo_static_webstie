import en from './locales/en/common.json';
import zh from './locales/zh/common.json';
import jp from './locales/jp/common.json';

// Language resources (no external libs)
const resources = {
  en: { translation: en },
  zh: { translation: zh },
  jp: { translation: jp },
};

function normalizeLng(lng) {
  if (!lng) return 'zh';
  const lower = String(lng).toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('ja') || lower.startsWith('jp')) return 'jp';
  return 'zh'; // fallback
}

const store = {
  lng: 'zh', // default UI language
};

const i18n = {
  get language() {
    return store.lng;
  },
  set language(v) {
    store.lng = v || 'zh';
  },
  changeLanguage(lng) {
    store.lng = lng || 'zh';
    return Promise.resolve();
  },
  t(key) {
    const ns = resources[normalizeLng(store.lng)]?.translation || {};
    return ns[key] ?? key;
  },
};

export default i18n;