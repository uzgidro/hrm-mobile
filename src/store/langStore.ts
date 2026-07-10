// App-language store, mirroring prefsStore's persist+hydrate shape. Owns the
// selected language and drives i18next + dayjs through applyLanguage(). On first
// launch (no saved choice) it defaults to the device language mapped to one of
// our four; an explicit user choice is persisted and wins thereafter.
import { create } from 'zustand';
import { getLocales } from 'expo-localization';
import { storage } from '../api/storage';
import { applyLanguage } from '../i18n';
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  mapDeviceLocale,
  type AppLanguage,
} from '../i18n/locales';

const LANGUAGE_KEY = 'app_language';

interface LangState {
  language: AppLanguage;
  hydrated: boolean;
  setLanguage: (lang: AppLanguage) => void;
  hydrate: () => Promise<void>;
}

function detectDeviceLanguage(): AppLanguage {
  try {
    return mapDeviceLocale(getLocales());
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const useLangStore = create<LangState>((set) => ({
  language: DEFAULT_LANGUAGE,
  hydrated: false,

  setLanguage: (lang) => {
    set({ language: lang });
    applyLanguage(lang);
    storage.setItem(LANGUAGE_KEY, lang).catch(() => {});
  },

  // Awaited by the auth bootstrap before the splash hides, so the first frame
  // is already in the right language (no flash of the wrong one). Never throws.
  hydrate: async () => {
    try {
      const saved = await storage.getItem(LANGUAGE_KEY);
      const lang = isAppLanguage(saved) ? saved : detectDeviceLanguage();
      applyLanguage(lang);
      set({ language: lang, hydrated: true });
    } catch {
      applyLanguage(DEFAULT_LANGUAGE);
      set({ hydrated: true });
    }
  },
}));
