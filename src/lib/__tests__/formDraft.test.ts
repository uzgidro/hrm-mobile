import { loadDraft, saveDraft, clearDraft, setDraftOwner, getDraftOwner, clearOwnerDrafts } from '../formDraft';

// Under jest-expo the platform is iOS, so the native (expo-file-system) branch
// runs; the module is mocked by jest-expo. We only assert the contract that
// matters to the forms: a failure never throws, and a cleared draft is gone.
describe('formDraft storage contract', () => {
  it('never throws on any operation and returns null when nothing is stored', async () => {
    await expect(saveDraft('t', { a: 1 })).resolves.toBeUndefined();
    await expect(clearDraft('t')).resolves.toBeUndefined();
    await expect(loadDraft('missing-key')).resolves.toBeNull();
  });
});

describe('formDraft egasi (sessiyaga bog\'langan)', () => {
  afterEach(() => setDraftOwner(null));

  it('ega id\'si `u<id>` ko\'rinishida; sessiya yo\'q — null', () => {
    setDraftOwner(42);
    expect(getDraftOwner()).toBe('u42');
    setDraftOwner(null);
    expect(getDraftOwner()).toBeNull();
  });

  it('sessiyasiz hech narsa o\'qilmaydi va tashlanmaydi', async () => {
    setDraftOwner(null);
    await expect(saveDraft('t', { a: 1 })).resolves.toBeUndefined();
    await expect(loadDraft('t')).resolves.toBeNull();
    await expect(clearOwnerDrafts(null)).resolves.toBeUndefined();
  });
});


describe('OTA migratsiyasi: egasiz eski qoralamalar (veb yo\'li — xotiradagi localStorage)', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map([
      ['draft:mobile-checkin-queue', '[{"body":{"client_uuid":"q1"}}]'],
      ['draft:letter-create', '{"shortSummary":"A ning xati"}'],
      ['unrelated', 'x'],
    ]);
    (globalThis as any).localStorage = {
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });
  // isolateModules — yangi modul reyestri: Platform'ni ham o'sha reyestrdan olib veb qilamiz.
  /* eslint-disable @typescript-eslint/no-require-imports -- isolateModules faqat require bilan ishlaydi */
  const loadWeb = () => {
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    return require('../formDraft');
  };
  /* eslint-enable @typescript-eslint/no-require-imports */

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('tiklangan sessiya: «Keldim» navbati egaga ko\'chadi, qolgan eski qoralama o\'chadi', async () => {
    await jest.isolateModulesAsync(async () => {
      const fd = loadWeb();
      fd.adoptLegacyDraftsForRestoredSession(['mobile-checkin-queue']);
      fd.setDraftOwner(5);
      await flush();
      expect(store.get('draft:u5:mobile-checkin-queue')).toContain('q1');
      expect(store.has('draft:mobile-checkin-queue')).toBe(false);
      expect(store.has('draft:letter-create')).toBe(false);
      expect(store.get('unrelated')).toBe('x');
    });
  });

  it('yangi login (tiklanmagan sessiya): eski navbat BOSHQA xodimga o\'tmaydi — o\'chadi', async () => {
    await jest.isolateModulesAsync(async () => {
      const fd = loadWeb();
      fd.adoptLegacyDraftsForRestoredSession(['mobile-checkin-queue']);
      fd.cancelLegacyDraftAdoption(); // bootstrap: sessiya yo'q → login ekrani
      fd.setDraftOwner(9);
      await flush();
      expect(store.has('draft:u9:mobile-checkin-queue')).toBe(false);
      expect(store.has('draft:mobile-checkin-queue')).toBe(false);
    });
  });
});
