import MockAdapter from 'axios-mock-adapter';
import { keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { KPI_MY_SCORECARD, KPI_MY_TEAM, KPI_ENTRY_DETAIL, KPI_BONUSES, KPI_TASK_STATUSES } from '@/api/urls';
import {
  kpiKeys, myScorecardQuery, myTeamQuery, kpiEntryQuery, entryBonusesQuery, taskStatusesQuery,
} from '../queries';
import type { KpiScorecard, KpiEntry, KpiTeam, KpiBonus, KpiTaskStatus } from '@/types';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('kpiKeys', () => {
  it('builds a hierarchical key tree so `all` prefixes every leaf', () => {
    expect(kpiKeys.all).toEqual(['kpi']);
    expect(kpiKeys.scorecard('')).toEqual(['kpi', 'scorecard', '', null]);
    expect(kpiKeys.scorecard('2026-07')).toEqual(['kpi', 'scorecard', '2026-07', null]);
    expect(kpiKeys.scorecard('2026-07', 42)).toEqual(['kpi', 'scorecard', '2026-07', 42]);
    expect(kpiKeys.team('')).toEqual(['kpi', 'team', '']);
    expect(kpiKeys.entry(5)).toEqual(['kpi', 'entry', 5]);
    expect(kpiKeys.bonuses(5)).toEqual(['kpi', 'bonuses', 5]);
    expect(kpiKeys.taskStatuses()).toEqual(['kpi', 'task-statuses', null]);
    expect(kpiKeys.taskStatuses(5)).toEqual(['kpi', 'task-statuses', 5]);
    for (const key of [kpiKeys.scorecard(''), kpiKeys.team(''), kpiKeys.entry(5), kpiKeys.bonuses(5), kpiKeys.taskStatuses()]) {
      expect(key.slice(0, 1)).toEqual(kpiKeys.all);
    }
  });
});

describe('myScorecardQuery', () => {
  it('keys by period and omits both params for the current month (self)', async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(200, { entries: [] });
    const opts = myScorecardQuery();
    expect(opts.queryKey).toEqual(['kpi', 'scorecard', '', null]);
    await (opts.queryFn as () => Promise<KpiScorecard>)();
    // employee_id omitted → the caller's own card; empty period → current month
    expect(mock.history.get[0].params).toEqual({});
  });

  it('passes period=YYYY-MM when a historical month is picked', async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(200, { entries: [] });
    const opts = myScorecardQuery('2026-06');
    expect(opts.queryKey).toEqual(['kpi', 'scorecard', '2026-06', null]);
    await (opts.queryFn as () => Promise<KpiScorecard>)();
    expect(mock.history.get[0].params).toEqual({ period: '2026-06' });
  });

  it("passes employee_id when a supervisor opens a subordinate's card", async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(200, { entries: [] });
    const opts = myScorecardQuery('2026-06', 42);
    expect(opts.queryKey).toEqual(['kpi', 'scorecard', '2026-06', 42]);
    await (opts.queryFn as () => Promise<KpiScorecard>)();
    expect(mock.history.get[0].params).toEqual({ period: '2026-06', employee_id: 42 });
  });

  it('returns the flat scorecard envelope as-is', async () => {
    const card: KpiScorecard = { result_percent: 87, entries: [{ id: 1 }] };
    mock.onGet(KPI_MY_SCORECARD).reply(200, card);
    const data = await (myScorecardQuery().queryFn as () => Promise<KpiScorecard>)();
    expect(data.result_percent).toBe(87);
    expect(data.entries).toHaveLength(1);
  });

  it('keeps the previous period card visible while a new period loads', () => {
    expect(myScorecardQuery('2026-06').placeholderData).toBe(keepPreviousData);
  });
});

describe('myTeamQuery', () => {
  it('fetches the team envelope; empty period omits the param', async () => {
    const team: KpiTeam = { period_begin: '2026-07-01', employees: [{ employee_id: 7 }] };
    mock.onGet(KPI_MY_TEAM).reply(200, team);
    const opts = myTeamQuery();
    expect(opts.queryKey).toEqual(['kpi', 'team', '']);
    const data = await (opts.queryFn as () => Promise<KpiTeam>)();
    expect(mock.history.get[0].params).toEqual({});
    expect(data.employees).toHaveLength(1);
  });

  it('passes period and keeps previous data across switches', async () => {
    mock.onGet(KPI_MY_TEAM).reply(200, { employees: [] });
    const opts = myTeamQuery('2026-06');
    expect(opts.queryKey).toEqual(['kpi', 'team', '2026-06']);
    await (opts.queryFn as () => Promise<KpiTeam>)();
    expect(mock.history.get[0].params).toEqual({ period: '2026-06' });
    expect(opts.placeholderData).toBe(keepPreviousData);
  });
});

describe('entryBonusesQuery', () => {
  it('lists bonuses for an entry via object_type/object_id', async () => {
    const rows: KpiBonus[] = [{ id: 1, oper_type_name: 'Mukofot', bonus_percent: 10 }];
    mock.onGet(KPI_BONUSES).reply(200, rows);
    const opts = entryBonusesQuery(5);
    expect(opts.queryKey).toEqual(['kpi', 'bonuses', 5]);
    const data = await (opts.queryFn as () => Promise<KpiBonus[]>)();
    expect(mock.history.get[0].params).toEqual({ object_type: 'entry', object_id: 5 });
    expect(data).toHaveLength(1);
  });

  it('is disabled for a falsy entry id', () => {
    expect(entryBonusesQuery(0).enabled).toBe(false);
  });
});

describe('taskStatusesQuery', () => {
  it('keys under kpiKeys.all and fetches the per-branch status catalog', async () => {
    const rows: KpiTaskStatus[] = [{ id: 1, name: 'Bajarildi', counts_for_fact: true }];
    mock.onGet(KPI_TASK_STATUSES).reply(200, rows);
    const opts = taskStatusesQuery();
    expect(opts.queryKey).toEqual(['kpi', 'task-statuses', null]);
    const data = await (opts.queryFn as () => Promise<KpiTaskStatus[]>)();
    // no branch_id → the catalog for the user's own branch(es)
    expect(mock.history.get[0].params).toEqual({});
    expect(data).toHaveLength(1);
  });

  it('forwards branch_id when given (cross-branch supervisor dropdown)', async () => {
    mock.onGet(KPI_TASK_STATUSES).reply(200, []);
    await (taskStatusesQuery(5).queryFn as () => Promise<KpiTaskStatus[]>)();
    expect(mock.history.get[0].params).toEqual({ branch_id: 5 });
  });

  it('defaults a non-array response to []', async () => {
    mock.onGet(KPI_TASK_STATUSES).reply(200, null);
    expect(await (taskStatusesQuery().queryFn as () => Promise<KpiTaskStatus[]>)()).toEqual([]);
  });
});

describe('kpiEntryQuery', () => {
  it('carries the entry key and always revalidates on mount', () => {
    const opts = kpiEntryQuery(42);
    expect(opts.queryKey).toEqual(['kpi', 'entry', 42]);
    expect(opts.refetchOnMount).toBe('always');
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(kpiEntryQuery(0).enabled).toBe(false);
  });

  it('fetches the entry with its tasks', async () => {
    mock.onGet(KPI_ENTRY_DETAIL(42)).reply(200, { id: 42, tasks: [{ id: 1 }] });
    const data = await (kpiEntryQuery(42).queryFn as () => Promise<KpiEntry>)();
    expect(data.id).toBe(42);
    expect(data.tasks).toHaveLength(1);
  });
});
