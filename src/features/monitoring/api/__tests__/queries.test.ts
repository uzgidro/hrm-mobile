import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  DASHBOARD_MAIN,
  DASHBOARD_LATE_EMPLOYEES,
  DASHBOARD_LATE_EMPLOYEES_FREQUENT,
  VISITOR_TURNSTILE_ATTENDANCE,
} from '@/api/urls';
import { monitoringMainQuery, lateEmployeesQuery, frequentLateQuery, visitorPassesQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

const DAY = '2026-09-30';

describe("monitoring so'rovlari (v2 useMonitoring)", () => {
  it('filial yo\'q — hech biri yoqilmagan', () => {
    for (const q of [monitoringMainQuery(undefined, DAY), lateEmployeesQuery(undefined), frequentLateQuery(undefined, DAY), visitorPassesQuery(undefined, DAY)]) {
      expect(q.enabled).toBe(false);
    }
  });

  it('asosiy statistika — bugungi kun, 120 s polling', async () => {
    const q = monitoringMainQuery(3, DAY);
    expect(q.refetchInterval).toBe(120_000);
    mock.onGet(DASHBOARD_MAIN).reply(200, { total_employees_count: 10 });
    expect(await (q.queryFn as () => Promise<unknown>)()).toEqual({ total_employees_count: 10 });
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3, date_from: DAY, date_to: DAY });
  });

  it('kechikkanlar (bugun) — dashboard/late-employees', async () => {
    mock.onGet(DASHBOARD_LATE_EMPLOYEES).reply(200, [{ employee_id: 1, late_minutes: 12, happen_time: 'x' }]);
    const r = await (lateEmployeesQuery(3).queryFn as () => Promise<unknown>)();
    expect(r).toEqual([{ employee_id: 1, late_minutes: 12, happen_time: 'x' }]);
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3 });
  });

  it("ko'p kechikadiganlar — oy oralig'i, limit 5", async () => {
    mock.onGet(DASHBOARD_LATE_EMPLOYEES_FREQUENT).reply(200, []);
    await (frequentLateQuery(3, DAY).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3, limit: 5, date_from: '2026-09-01', date_to: '2026-09-30' });
  });

  it("mehmon o'tishlari — bugun", async () => {
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply(200, { items: [{ id: 1 }] });
    expect(await (visitorPassesQuery(3, DAY).queryFn as () => Promise<unknown>)()).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3, date_from: DAY, date_to: DAY });
  });
});
