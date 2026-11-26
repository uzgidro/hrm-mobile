import { apiClient } from '@/api/client';
import {
  addPayment, checkOutStays, createArrival, debtFromWarnings, extendStay, fetchGroupStays, fetchMyGuests, groupCheckIn, fetchRouteSheet, fetchSetupStatus, fetchSlots, fetchToday, moveStay,
} from '../api';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const api = apiClient as unknown as Record<'get' | 'post' | 'patch', jest.Mock>;
const missing = { response: { status: 404, data: { detail: 'Not Found' } } };

beforeEach(() => {
  for (const k of Object.keys(api) as (keyof typeof api)[]) api[k]!.mockReset().mockResolvedValue({ data: {} });
});

describe('reads fall back to null on an old server', () => {
  it('returns null for every simplified read on 404', async () => {
    api.get!.mockRejectedValue(missing);
    expect(await fetchToday()).toBeNull();
    expect(await fetchRouteSheet(4)).toBeNull();
    expect(await fetchSetupStatus()).toBeNull();
    expect(await fetchMyGuests()).toBeNull();
    expect(await fetchSlots(3, '2026-11-26', 20)).toEqual([]);
  });
  it('rethrows real errors', async () => {
    api.get!.mockRejectedValue({ response: { status: 500 } });
    await expect(fetchToday()).rejects.toBeTruthy();
  });
  it('reads the queue and the doctor slots with their params', async () => {
    api.get!.mockResolvedValueOnce({ data: { date: '2026-11-25', items: [], counts: {}, totals: {} } });
    expect((await fetchToday())?.date).toBe('2026-11-25');
    expect(api.get).toHaveBeenCalledWith('sanatorium/today', undefined);
    api.get!.mockResolvedValueOnce({ data: { slots: ['2026-11-26T10:00:00'] } });
    expect(await fetchSlots(3, '2026-11-26', 20)).toEqual(['2026-11-26T10:00:00']);
    expect(api.get).toHaveBeenLastCalledWith('sanatorium/doctors/3/slots', { params: { day: '2026-11-26', minutes: 20 } });
  });
  it('unwraps the my-guests list', async () => {
    api.get!.mockResolvedValue({ data: { items: [{ stay_id: 1 }] } });
    expect(await fetchMyGuests()).toEqual([{ stay_id: 1 }]);
  });
});

describe('writes', () => {
  it('posts the arrival body as is', async () => {
    const body = { members: [{ full_name: 'A B' }], start: '2026-11-25', end: '2026-11-30', guest_type: 'rest' as const, with_meals: true, check_in: false };
    await createArrival(body);
    expect(api.post).toHaveBeenCalledWith('sanatorium/arrivals', body);
  });
  it('extends / moves with the whole-group flag only when asked', async () => {
    await extendStay({ id: 5, planned_to: '2026-12-10' });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/stays/5/extend', { planned_to: '2026-12-10' });
    await moveStay({ id: 5, room_id: 9, whole_group: true });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/stays/5/move', { room_id: 9, whole_group: true });
  });
  it('falls back to the classic PATCH on an old server', async () => {
    api.post!.mockRejectedValue(missing);
    await extendStay({ id: 5, planned_to: '2026-12-10' });
    expect(api.patch).toHaveBeenLastCalledWith('sanatorium/stays/5', { planned_to: '2026-12-10' });
    await moveStay({ id: 5, room_id: 9 });
    expect(api.patch).toHaveBeenLastCalledWith('sanatorium/stays/5', { room_id: 9 });
    await addPayment({ id: 5, amount: '100.00', paid_before: '250.00' });
    expect(api.patch).toHaveBeenLastCalledWith('sanatorium/stays/5/payment', { paid_amount: '350.00' });
  });
  it('does not mask business errors with the fallback', async () => {
    api.post!.mockRejectedValue({ response: { status: 404, data: { detail: { code: 'stay_closed' } } } });
    await expect(extendStay({ id: 5, planned_to: '2026-12-10' })).rejects.toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
  });
  it('adds a payment through the new endpoint', async () => {
    await addPayment({ id: 5, amount: '100.00', note: 'cash' });
    expect(api.post).toHaveBeenCalledWith('sanatorium/stays/5/payments', { amount: '100.00', note: 'cash' });
  });
  it('checks out one stay classically and a group all-or-nothing', async () => {
    await checkOutStays({ ids: [7] });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/stays/7/check-out');
    await checkOutStays({ ids: [7, 8], allow_debt: true });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/stays/group-check-out', { stay_ids: [7, 8], allow_debt: true });
  });
  it('reads the debt warning of a response', () => {
    expect(debtFromWarnings({ warnings: [{ code: 'debt', amount: '120000.00' }] })).toBe(120000);
    expect(debtFromWarnings({ warnings: [{ code: 'debt', amount: '100.00', stay_id: 1 }, { code: 'debt', amount: '50.50', stay_id: 2 }, { code: 'overpaid', amount: '9' }] })).toBe(150.5);
    expect(debtFromWarnings({ warnings: [] })).toBe(0);
    expect(debtFromWarnings(undefined)).toBe(0);
  });
});

describe('client_ref and old-server fallbacks', () => {
  it('sends client_ref with a payment and again without it when the server rejects the field', async () => {
    api.post!.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ loc: ['body', 'client_ref'], type: 'extra_forbidden' }] } } });
    await addPayment({ id: 7, amount: '100.00', client_ref: 'abc-123456' });
    expect(api.post).toHaveBeenNthCalledWith(1, 'sanatorium/stays/7/payments', { amount: '100.00', client_ref: 'abc-123456' });
    expect(api.post).toHaveBeenNthCalledWith(2, 'sanatorium/stays/7/payments', { amount: '100.00' });
  });
  it('retries a rejected arrival without client_ref only for that error', async () => {
    api.post!.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ loc: ['body', 'client_ref'] }] } } });
    await createArrival({ start: 'a', end: 'b', guest_type: 'rest', with_meals: true, check_in: false, client_ref: 'r-12345678' });
    expect(api.post).toHaveBeenLastCalledWith('sanatorium/arrivals', { start: 'a', end: 'b', guest_type: 'rest', with_meals: true, check_in: false });
    api.post!.mockReset().mockRejectedValue({ response: { status: 409, data: { detail: { code: 'duplicate_submit' } } } });
    await expect(createArrival({ start: 'a', end: 'b', guest_type: 'rest', with_meals: true, check_in: false, client_ref: 'r-12345678' })).rejects.toBeTruthy();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('checks a family in one by one when the group endpoint is missing', async () => {
    api.post!.mockImplementation((url: string) => (url.includes('group') ? Promise.reject(missing) : Promise.resolve({ data: { id: 1 } })));
    const res = await groupCheckIn([4, 5]);
    expect(res.stays).toHaveLength(2);
    expect(api.post).toHaveBeenCalledWith('sanatorium/stays/4/check-in');
  });
  it('pages the stay list at 100 per page to find a group', async () => {
    const page = Array.from({ length: 100 }, (_, i) => ({ id: i, group_key: i === 3 ? 'g' : null }));
    api.get!.mockResolvedValueOnce({ data: { items: page } }).mockResolvedValueOnce({ data: { items: [{ id: 200, group_key: 'g' }] } });
    const rows = await fetchGroupStays('g', 'checked_in');
    expect(rows.map((r) => r.id)).toEqual([3, 200]);
    expect(api.get).toHaveBeenNthCalledWith(1, 'sanatorium/stays', { params: { group_key: 'g', status: 'checked_in', size: 100, page: 1 } });
  });
});
