// The four supported app languages. uz-Latn is the source of truth (the app
// was authored in Uzbek Latin); the other three fall back to it for any key
// that isn't translated yet, so a missing key always renders readable Uzbek
// rather than a raw key path.
export const LANGUAGES = ['uz-Latn', 'uz-Cyrl', 'ru', 'en'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'uz-Latn';

export function isAppLanguage(v: string | null | undefined): v is AppLanguage {
  return v != null && (LANGUAGES as readonly string[]).includes(v);
}

// Native name shown in the language switcher (each language names itself).
export const LANGUAGE_NATIVE_NAME: Record<AppLanguage, string> = {
  'uz-Latn': "O'zbekcha",
  'uz-Cyrl': 'Ўзбекча',
  ru: 'Русский',
  en: 'English',
};

// Which flag each language uses. Both Uzbek scripts share the Uzbekistan flag;
// they are told apart by the native-name label above.
export const LANGUAGE_FLAG: Record<AppLanguage, 'UZ' | 'RU' | 'GB'> = {
  'uz-Latn': 'UZ',
  'uz-Cyrl': 'UZ',
  ru: 'RU',
  en: 'GB',
};

// Map a device locale tag (from expo-localization, e.g. "uz-UZ", "ru-RU",
// "en-US", "uz-Cyrl-UZ") to one of our four languages. Used only on first
// launch when the user has not picked a language yet.
export function mapDeviceLocale(
  locales: { languageTag?: string; languageCode?: string | null }[] | undefined
): AppLanguage {
  for (const loc of locales ?? []) {
    const tag = (loc.languageTag ?? '').toLowerCase();
    const code = (loc.languageCode ?? '').toLowerCase();
    if (code === 'uz' || tag.startsWith('uz')) {
      return tag.includes('cyrl') ? 'uz-Cyrl' : 'uz-Latn';
    }
    if (code === 'ru' || tag.startsWith('ru')) return 'ru';
    if (code === 'en' || tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LANGUAGE;
}
