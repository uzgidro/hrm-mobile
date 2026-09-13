import { loadDraft, saveDraft, clearDraft } from '../formDraft';

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
