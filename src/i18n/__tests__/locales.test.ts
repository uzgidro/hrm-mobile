import { mapDeviceLocale, isAppLanguage, DEFAULT_LANGUAGE } from '../locales';

describe('mapDeviceLocale', () => {
  it('maps Uzbek (Latin/default) to uz-Latn', () => {
    expect(mapDeviceLocale([{ languageTag: 'uz-UZ', languageCode: 'uz' }])).toBe('uz-Latn');
  });

  it('maps an explicit Cyrillic Uzbek tag to uz-Cyrl', () => {
    expect(mapDeviceLocale([{ languageTag: 'uz-Cyrl-UZ', languageCode: 'uz' }])).toBe('uz-Cyrl');
  });

  it('maps Russian to ru', () => {
    expect(mapDeviceLocale([{ languageTag: 'ru-RU', languageCode: 'ru' }])).toBe('ru');
  });

  it('maps English to en', () => {
    expect(mapDeviceLocale([{ languageTag: 'en-US', languageCode: 'en' }])).toBe('en');
  });

  it('falls back to the default for an unsupported language', () => {
    expect(mapDeviceLocale([{ languageTag: 'de-DE', languageCode: 'de' }])).toBe(DEFAULT_LANGUAGE);
  });

  it('falls back to the default for an empty locale list', () => {
    expect(mapDeviceLocale([])).toBe(DEFAULT_LANGUAGE);
    expect(mapDeviceLocale(undefined)).toBe(DEFAULT_LANGUAGE);
  });

  it('uses the first supported locale in the list', () => {
    expect(
      mapDeviceLocale([
        { languageTag: 'de-DE', languageCode: 'de' },
        { languageTag: 'ru-RU', languageCode: 'ru' },
      ])
    ).toBe('ru');
  });
});

describe('isAppLanguage', () => {
  it('accepts the four supported languages', () => {
    expect(isAppLanguage('uz-Latn')).toBe(true);
    expect(isAppLanguage('uz-Cyrl')).toBe(true);
    expect(isAppLanguage('ru')).toBe(true);
    expect(isAppLanguage('en')).toBe(true);
  });

  it('rejects unknown / null values', () => {
    expect(isAppLanguage('de')).toBe(false);
    expect(isAppLanguage(null)).toBe(false);
    expect(isAppLanguage(undefined)).toBe(false);
  });
});
