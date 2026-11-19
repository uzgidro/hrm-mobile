import { apiClient } from '@/api/client';
import {
  convertWaitlist, fetchHkBoard, fetchTransfers, fetchWaitlist, moveStay, saveFeatures, saveStage, setRoomHkStatus,
} from '../sections1';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const api = apiClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', jest.Mock>;

beforeEach(() => {
  for (const k of Object.keys(api) as (keyof typeof api)[]) api[k]!.mockResolvedValue({ data: {} });
});

describe('sections1 api', () => {
  it('sends only the changed switches under `features`', async () => {
    api.patch!.mockResolvedValue({ data: [] });
    await saveFeatures({ journey: false });
    expect(api.patch).toHaveBeenCalledWith('sanatorium/features', { features: { journey: false } });
  });
  it('creates a stage with POST and edits it with PUT', async () => {
    await saveStage({ body: { key: 'a_b' } });
    expect(api.post).toHaveBeenCalledWith('sanatorium/journey/stages', { key: 'a_b' });
    await saveStage({ id: 4, body: { name_uz: 'x' } });
    expect(api.put).toHaveBeenCalledWith('sanatorium/journey/stages/4', { name_uz: 'x' });
  });
  it('moves a stay with an optional note', async () => {
    await moveStay({ stayId: 9, stage_id: 2 });
    expect(api.post).toHaveBeenCalledWith('sanatorium/journey/stays/9/stage', { stage_id: 2 });
    await moveStay({ stayId: 9, stage_id: 2, note: 'hi' });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/journey/stays/9/stage', { stage_id: 2, note: 'hi' });
  });
  it('drops blank waitlist filters and keeps the page', async () => {
    api.get!.mockResolvedValue({ data: { items: [], total: 0 } });
    const r = await fetchWaitlist({ status: 'all', q: '' }, 2);
    expect(api.get).toHaveBeenCalledWith('sanatorium/waitlist', { params: { page: 2, size: 30 } });
    expect(r.page).toBe(2);
  });
  it('drops «all» transfer filters', async () => {
    api.get!.mockResolvedValue({ data: { items: [], total: 0 } });
    await fetchTransfers({ status: 'all', direction: 'arrival', q: ' ' }, 1);
    expect(api.get).toHaveBeenCalledWith('sanatorium/transfers', { params: { direction: 'arrival', page: 1, size: 30 } });
  });
  it('filters the housekeeping board by status', async () => {
    await fetchHkBoard('dirty');
    expect(api.get).toHaveBeenCalledWith('sanatorium/housekeeping/board', { params: { status: 'dirty' } });
    await fetchHkBoard('all');
    expect(api.get).toHaveBeenLastCalledWith('sanatorium/housekeeping/board', { params: {} });
  });
  it('patches the room status and converts a waitlist entry', async () => {
    await setRoomHkStatus({ roomId: 3, status: 'clean' });
    expect(api.patch).toHaveBeenCalledWith('sanatorium/rooms/3/hk-status', { status: 'clean' });
    await convertWaitlist({ id: 5, body: {} });
    expect(api.post).toHaveBeenCalledWith('sanatorium/waitlist/5/convert', {});
  });
});
