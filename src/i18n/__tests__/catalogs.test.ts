// Catalog parity + i18n behavior. The parity test is the build-time safety net
// against a forgotten translation: every locale must expose the exact same set
// of dotted key paths as the uz-Latn source of truth.
import i18n from '../index';
import uzLatn from '../locales/uz-Latn';
import uzCyrl from '../locales/uz-Cyrl';
import ru from '../locales/ru';
import en from '../locales/en';

// Flatten a nested catalog object into sorted dotted key paths. i18next plural
// suffixes (_one/_few/_many/_other) are normalized to their base key, since a
// language legitimately has a different set of plural forms (ru has few/many,
// uz/en don't) — parity is about which logical strings exist, not plural forms.
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      out.push(...keyPaths(v as Record<string, unknown>, path));
    } else {
      out.push(path.replace(/_(one|two|few|many|other|zero)$/, ''));
    }
  }
  return out;
}

const uniqSorted = (a: string[]) => [...new Set(a)].sort();

describe('catalog parity', () => {
  const base = uniqSorted(keyPaths(uzLatn));

  it.each([
    ['uz-Cyrl', uzCyrl],
    ['ru', ru],
    ['en', en],
  ])('%s has the same key set as uz-Latn', (_name, cat) => {
    const keys = uniqSorted(keyPaths(cat as Record<string, unknown>));
    const missing = base.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !base.includes(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});

describe('i18n resolution', () => {
  afterEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('resolves a dotted key path', () => {
    expect(i18n.t('common.cancel')).toBe('Bekor');
  });

  it('is configured to fall back to uz-Latn', () => {
    // Parity tests keep catalogs complete so the chain rarely fires at runtime;
    // assert the config so a regression in fallbackLng is caught.
    expect(i18n.options.fallbackLng).toMatchObject({
      'uz-Cyrl': ['uz-Latn'],
      default: ['uz-Latn'],
    });
  });

  it('actually traverses the fallback chain for a base-only key', async () => {
    // Inject a key that exists ONLY in uz-Latn, then request it under ru/uz-Cyrl.
    i18n.addResource('uz-Latn', 'translation', 'common.__fallbackProbe', 'PROBE');
    await i18n.changeLanguage('ru');
    expect(i18n.t('common.__fallbackProbe')).toBe('PROBE');
    await i18n.changeLanguage('uz-Cyrl');
    expect(i18n.t('common.__fallbackProbe')).toBe('PROBE');
  });

  it('switches all common labels when language changes', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('common.cancel')).toBe('Cancel');
    await i18n.changeLanguage('uz-Cyrl');
    expect(i18n.t('common.cancel')).toBe('Бекор');
  });
});
