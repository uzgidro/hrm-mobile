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
  it("mehmonlar: qidiruv, tashrif filtri, filial ixtiyoriy, size 200", async () => {
    mock.onGet(VISITORS_LIST).reply(200, { items: [{ id: 1 }], total: 1 });
    const r = await (kppVisitorsQuery({ search: 'ali', visit: 'today', branchId: undefined }).queryFn as () => Promise<unknown>)();
    expect(r).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ search: 'ali', visit: 'today', size: 200 });
  });

  it("bo'sh qidiruv va 'all' filtri yuborilmaydi", async () => {
    mock.onGet(VISITORS_LIST).reply(200, []);
    await (kppVisitorsQuery({ search: '', visit: 'all', branchId: 4 }).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 4, size: 200 });
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
