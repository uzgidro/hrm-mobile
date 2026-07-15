import MockAdapter from 'axios-mock-adapter';
import { keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { KPI_MY_SCORECARD, KPI_ENTRY_DETAIL } from '@/api/urls';
import { kpiKeys, myScorecardQuery, kpiEntryQuery } from '../queries';
import type { KpiScorecard, KpiEntry } from '@/types';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('kpiKeys', () => {
  it('builds a hierarchical key tree so `all` prefixes scorecard and entry', () => {
    expect(kpiKeys.all).toEqual(['kpi']);
    expect(kpiKeys.scorecard('')).toEqual(['kpi', 'scorecard', '']);
    expect(kpiKeys.scorecard('2026-07')).toEqual(['kpi', 'scorecard', '2026-07']);
    expect(kpiKeys.entry(5)).toEqual(['kpi', 'entry', 5]);
    expect(kpiKeys.scorecard('').slice(0, 1)).toEqual(kpiKeys.all);
    expect(kpiKeys.entry(5).slice(0, 1)).toEqual(kpiKeys.all);
  });
});

describe('myScorecardQuery', () => {
  it('keys by period and omits both params for the current month (self)', async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(200, { entries: [] });
    const opts = myScorecardQuery();
    expect(opts.queryKey).toEqual(['kpi', 'scorecard', '']);
    await (opts.queryFn as () => Promise<KpiScorecard>)();
    // employee_id omitted → the caller's own card; empty period → current month
    expect(mock.history.get[0].params).toEqual({});
  });

  it('passes period=YYYY-MM when a historical month is picked', async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(200, { entries: [] });
    const opts = myScorecardQuery('2026-06');
    expect(opts.queryKey).toEqual(['kpi', 'scorecard', '2026-06']);
    await (opts.queryFn as () => Promise<KpiScorecard>)();
    expect(mock.history.get[0].params).toEqual({ period: '2026-06' });
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
