import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { MOBILE_CHECKINS } from '@/api/urls';
import { flushQueue, readQueue, submitCheckin, QUEUE_MAX_AGE_MS } from '../lib/queue';
import type { CheckinCreateBody } from '../types';

// Disk o'rniga xotira (formDraft native/web yo'llari bu yerda sinalmaydi).
const mockStore = new Map<string, unknown>();
jest.mock('@/lib/formDraft', () => ({
  loadDraft: jest.fn(async (k: string) => (mockStore.has(k) ? JSON.parse(JSON.stringify(mockStore.get(k))) : null)),
  saveDraft: jest.fn(async (k: string, v: unknown) => void mockStore.set(k, v)),
  clearDraft: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const body = (uuid: string, captured_at = new Date().toISOString()): CheckinCreateBody => ({
  photo_base64: 'data:image/jpeg;base64,QUJD',
  latitude: 41.3,
  longitude: 69.28,
  accuracy_m: 10,
  captured_at,
  direction: 'entrance',
  client_uuid: uuid,
});

describe('oflayn navbat', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(() => mockStore.clear());
  afterEach(() => mock.reset());

  it('yuborildi — navbatga tushmaydi; tana aynan shartnoma kalitlari (strict 422 bo\'lmasin)', async () => {
    mock.onPost(MOBILE_CHECKINS).reply(200, { id: 1 });
    const r = await submitCheckin(body('uuid-0001'));
    expect(r.kind).toBe('sent');
    expect(Object.keys(JSON.parse(mock.history.post[0].data)).sort()).toEqual(
      ['accuracy_m', 'captured_at', 'client_uuid', 'direction', 'latitude', 'longitude', 'photo_base64'].sort(),
    );
    expect(await readQueue()).toEqual([]);
  });

  it('tarmoq yo\'q — navbatga; ikki marta saqlanmaydi (bir xil client_uuid)', async () => {
    mock.onPost(MOBILE_CHECKINS).networkError();
    expect((await submitCheckin(body('uuid-0002'))).kind).toBe('queued');
    await submitCheckin(body('uuid-0002'));
    expect((await readQueue()).map((q) => q.body.client_uuid)).toEqual(['uuid-0002']);
  });

  it('403 (safar yo\'q) — navbatga EMAS, chaqiruvchiga otiladi', async () => {
    mock.onPost(MOBILE_CHECKINS).reply(403, { code: 'no_active_business_trip' });
    await expect(submitCheckin(body('uuid-0003'))).rejects.toBeTruthy();
    expect(await readQueue()).toEqual([]);
  });

  it('flush: yuborilgani chiqadi, 5xx qoladi, 4xx failed bo\'lib chiqadi', async () => {
    mock.onPost(MOBILE_CHECKINS).networkError();
    await submitCheckin(body('uuid-ok-1'));
    await submitCheckin(body('uuid-5xx-2'));
    await submitCheckin(body('uuid-4xx-3'));
    mock.reset();
    mock.onPost(MOBILE_CHECKINS).reply((cfg) => {
      const u = JSON.parse(cfg.data).client_uuid as string;
      if (u.includes('5xx')) return [503, {}];
      if (u.includes('4xx')) return [400, { code: 'checkin_time_invalid' }];
      return [200, { id: 9 }];
    });
    const r = await flushQueue();
    expect(r.sent).toHaveLength(1);
    expect(r.failed.map((f) => f.item.body.client_uuid)).toEqual(['uuid-4xx-3']);
    expect(r.pending).toBe(1);
    expect((await readQueue()).map((q) => q.body.client_uuid)).toEqual(['uuid-5xx-2']);
  });

  it('47 soatdan eski — yuborilmaydi, failed (too_old)', async () => {
    mock.onPost(MOBILE_CHECKINS).networkError();
    const old = new Date(Date.now() - QUEUE_MAX_AGE_MS - 60_000).toISOString();
    await submitCheckin(body('uuid-old-1', old));
    mock.reset();
    mock.onPost(MOBILE_CHECKINS).reply(200, { id: 1 });
    const r = await flushQueue();
    expect(r.failed).toHaveLength(1);
    expect((r.failed[0].error as Error).message).toBe('too_old');
    expect(mock.history.post).toHaveLength(0);
  });
});
