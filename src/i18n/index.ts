// i18next singleton. Initialized eagerly and synchronously (resources bundled
// inline, no async backend) so the async renderWithProviders / RNTL never race
// a loading catalog — by the time any component renders, t() already resolves.
//
// Keys are dotted paths into one flat catalog per language, e.g. t('common.ok'),
// t('orders.title'). The leading segment ("common", "orders", …) is a plain
// nested object (a section), NOT an i18next namespace — this keeps a single
// default namespace and lets feature waves add sections without touching init.
// uz-Latn is the source of truth and the fallback for every other language, so
// a not-yet-translated key renders readable Uzbek instead of a raw path.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uzLatn from './locales/uz-Latn';
import uzCyrl from './locales/uz-Cyrl';
import ru from './locales/ru';
import en from './locales/en';
import { DEFAULT_LANGUAGE, type AppLanguage } from './locales';
import { setDayjsLocale } from './dayjs';

const resources = {
  'uz-Latn': { translation: uzLatn },
  'uz-Cyrl': { translation: uzCyrl },
  ru: { translation: ru },
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: {
    'uz-Cyrl': ['uz-Latn'],
    default: ['uz-Latn'],
  },
  keySeparator: '.',
  interpolation: { escapeValue: false },
  returnNull: false,
  // Synchronous init: resources are bundled inline, so translations resolve
  // before the first render (no async backend to await).
  initAsync: false,
});

// Change language everywhere: i18next + the global dayjs locale, in sync.
export function applyLanguage(lang: AppLanguage): void {
  void i18n.changeLanguage(lang);
  setDayjsLocale(lang);
}

// Seed dayjs to the initial language so dates are correct before the first
// language switch.
setDayjsLocale(DEFAULT_LANGUAGE);

export default i18n;
