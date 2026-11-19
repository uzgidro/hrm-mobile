import { apiClient } from '@/api/client';
import { applyDietToStays, deletePackage, markSession, quote, reorderPackages, savePackage, saveStayDiet } from '../sections2';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(), request: jest.fn() } }));
const api = apiClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock>;

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset().mockResolvedValue({ data: { ok: true } }));
});

describe('sections2 api', () => {
  it('creates with POST and updates with PUT', async () => {
    await savePackage({ body: { name_uz: 'A' } });
    expect(api.post).toHaveBeenCalledWith('sanatorium/packages', { name_uz: 'A' });
    await savePackage({ id: 5, body: { name_uz: 'A' } });
    expect(api.put).toHaveBeenCalledWith('sanatorium/packages/5', { name_uz: 'A' });
  });
  it('reorders and deletes packages', async () => {
    await reorderPackages([3, 1, 2]);
    expect(api.post).toHaveBeenCalledWith('sanatorium/packages/reorder', { ids: [3, 1, 2] });
    api.delete.mockResolvedValue({ data: { deleted: false, deactivated: true, used_by: 2 } });
    await expect(deletePackage(7)).resolves.toEqual({ deleted: false, deactivated: true, used_by: 2 });
  });
  it('posts the quote body as is', async () => {
    await quote({ start: '2026-12-01' });
    expect(api.post).toHaveBeenCalledWith('sanatorium/quote', { start: '2026-12-01' });
  });
  it('marks a session with an optional note', async () => {
    await markSession({ id: 4, status: 'done' });
    expect(api.post).toHaveBeenCalledWith('sanatorium/procedure-sessions/4/mark', { status: 'done' });
  });
  it('patches the stay diet', async () => {
    await saveStayDiet({ id: 9, body: { diet_id: null } });
    expect(api.patch).toHaveBeenCalledWith('sanatorium/stays/9/diet', { diet_id: null });
  });
  it('applies a diet to stays and reports a failure instead of throwing', async () => {
    expect(await applyDietToStays([1, 2], null)).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
    expect(await applyDietToStays([1, 2], 3)).toBeNull();
    expect(api.patch).toHaveBeenCalledTimes(2);
    api.patch.mockRejectedValue(new Error('boom'));
    expect(await applyDietToStays([1], 3)).toBeInstanceOf(Error);
  });
});
