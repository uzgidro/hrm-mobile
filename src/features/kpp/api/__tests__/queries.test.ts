import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_TURNSTILE_ATTENDANCE } from '@/api/urls';
import { kppKeys, kppVisitorsQuery, visitorEventsQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('kpp so\'rovlari (v2 useKpp)', () => {
  const runPage = (q: ReturnType<typeof kppVisitorsQuery>, pageParam = 1) =>
    (q.queryFn as unknown as (c: { pageParam: number }) => Promise<{ items: unknown[]; pages: number }>)({ pageParam });

  it("mehmonlar: qidiruv, tashrif filtri, filial ixtiyoriy, 50 tadan sahifalab", async () => {
    mock.onGet(VISITORS_LIST).reply(200, { items: [{ id: 1 }], total: 120, page: 2, size: 50, pages: 3 });
    const q = kppVisitorsQuery({ search: 'ali', visit: 'today', branchId: undefined });
    const r = await runPage(q, 2);
    expect(r.items).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ search: 'ali', visit: 'today', page: 2, size: 50 });
    // 200 dan ortiq mehmon ham ochiladi — keyingi sahifa bor.
    expect(q.getNextPageParam(r as never, [], 2, [])).toBe(3);
  });

  it("bo'sh qidiruv va 'all' filtri yuborilmaydi", async () => {
    mock.onGet(VISITORS_LIST).reply(200, []);
    await runPage(kppVisitorsQuery({ search: '', visit: 'all', branchId: 4 }));
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 4, page: 1, size: 50 });
  });

  it("o'tishlar: bugungi kun, mehmon tanlansa visitor_id", async () => {
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply(200, { items: [], total: 0 });
    await (visitorEventsQuery('2026-09-30', 7).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ date_from: '2026-09-30', date_to: '2026-09-30', visitor_id: 7 });
  });

  it('kalitlar kpp ostida', () => {
    expect(kppKeys.all).toEqual(['kpp']);
    expect(visitorEventsQuery('2026-09-30', null).queryKey[0]).toBe('kpp');
  });
});
