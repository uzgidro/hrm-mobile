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

