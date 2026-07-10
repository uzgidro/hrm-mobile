// Centralized dayjs locale wiring. dayjs.locale() is a global mutation, so it
// must be set from one place and kept in sync with the app language. Every
// screen that formats dates relies on whatever locale is active here.
//
// Locale mapping (all four use a built-in dayjs locale — no custom locale
// needed): note that dayjs's built-in "uz" is actually CYRILLIC (Январ,
// Якшанба) while "uz-latn" is Latin (Yanvar, Yakshanba), so they map to our
// two Uzbek scripts respectively.
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/uz-latn';
import 'dayjs/locale/uz';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import type { AppLanguage } from './locales';

// localeData powers the month/weekday name lists used by src/i18n/dates.ts.
dayjs.extend(localeData);

const DAYJS_LOCALE: Record<AppLanguage, string> = {
  'uz-Latn': 'uz-latn',
  'uz-Cyrl': 'uz',
  ru: 'ru',
  en: 'en',
};

export function setDayjsLocale(lang: AppLanguage): void {
  dayjs.locale(DAYJS_LOCALE[lang]);
}
