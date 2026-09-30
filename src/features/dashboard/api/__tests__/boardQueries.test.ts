import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  TURNSTILE_DAY_BOARD,
  DASHBOARD_EMPLOYEES_BY_CATEGORY,
  DASHBOARD_EMPLOYEE_COUNT,
  DASHBOARD_AGE_STATS,
  DASHBOARD_NATIONALITY_STATS,
  DASHBOARD_JOB_POSITION_STATS,
  DASHBOARD_OVERDUE_TASKS,
} from '@/api/urls';
import {
  dashboardKeys,
  boardDayQuery,
  boardCategoriesQuery,
  compositionQuery,
  overdueSummaryQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('board so\'rovlari (v2 paritet)', () => {
  it("dashboardKeys ierarxik — hammasi ['dashboard'] ostida", () => {
    expect(dashboardKeys.all).toEqual(['dashboard']);
    expect(boardDayQuery(3, '2026-09-29').queryKey.slice(0, 1)).toEqual(['dashboard']);
    expect(compositionQuery(3).queryKey.slice(0, 1)).toEqual(['dashboard']);
  });

  it('day-board: filial, kun, cross-branch va to\'liq lenta paramlari', async () => {
    mock.onGet(TURNSTILE_DAY_BOARD).reply(200, { day: '2026-09-29', entries: 0, exits: 0, total: 0, max_id: null, people: [], latest: [], events: [], employees: [], turnstiles: [] });
    await (boardDayQuery(3, '2026-09-29').queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({
      organization_branch_id: 3,
      day: '2026-09-29',
      include_cross_branch: true,
      latest: 20, // telefonda 8 qator chiziladi; hisoblagichlar people dan
    });
  });

  it('day-board v2 kabi 300 s da yangilanadi (60 s emas — mobil trafik)', () => {
    expect(boardDayQuery(3, '2026-09-29').refetchInterval).toBe(300_000);
  });

  it('kategoriyalar: filial bo\'lmasa param yuborilmaydi', async () => {
    mock.onGet(DASHBOARD_EMPLOYEES_BY_CATEGORY).reply(200, {});
    await (boardCategoriesQuery(undefined).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({});
  });

  it('tarkib: to\'rt manba bitta natijaga yig\'iladi, bittasi xato bersa ham qolganlari', async () => {
    mock.onGet(DASHBOARD_EMPLOYEE_COUNT).reply(200, { total_count: 147, gender_stats: { male: 115, female: 23, unknown: 9 } });
    mock.onGet(DASHBOARD_AGE_STATS).reply(200, { stats: { '31-40': 53, '41-50': 35 } });
    mock.onGet(DASHBOARD_NATIONALITY_STATS).reply(500);
    mock.onGet(DASHBOARD_JOB_POSITION_STATS).reply(200, [{ job_position_name: 'Bosh mutaxassis', count: 47 }]);
    const r = (await (compositionQuery(3).queryFn as () => Promise<unknown>)()) as Record<string, unknown>;
    expect(r).toMatchObject({
      total: 147,
      gender: { male: 115, female: 23, unknown: 9 },
      age: [{ key: '31-40', value: 53 }, { key: '41-50', value: 35 }],
      nationality: [],
      positions: [{ label: 'Bosh mutaxassis', count: 47 }],
    });
  });

  it('muddati o\'tgan topshiriqlar', async () => {
    mock.onGet(DASHBOARD_OVERDUE_TASKS).reply(200, { total: 2, by_department: [] });
    const r = await (overdueSummaryQuery(3).queryFn as () => Promise<unknown>)();
    expect(r).toEqual({ total: 2, by_department: [] });
    expect(mock.history.get[0].params).toEqual({ organization_branch_id: 3 });
  });
});
