import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, TURNSTILE_ATTENDANCE_NORMALIZED } from '../../api/urls';
import { fetchAllAttendanceEvents, fetchDayRoster, rosterQueryKey, dayRosterQuery } from '../attendance';

const DATE = '2026-07-06';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.restore(); });

const rows = (start: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: start + i }));

describe('fetchAllAttendanceEvents — one bounded, branch-scoped request', () => {
  it('sends date window + limit (the route has no page/size) and reads a bare array', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, rows(1, 40));
    const result = await fetchAllAttendanceEvents(DATE, 7);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ date_from: DATE, date_to: DATE, limit: 5000, organization_branch_id: 7 });
    expect(result).toEqual({ items: rows(1, 40), total: 40 });
  });

  it('does NOT fall back to an unscoped organisation-wide fetch when the branch has no events', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, []);
    const result = await fetchAllAttendanceEvents(DATE, 7);
    expect(mock.history.get).toHaveLength(1);
    expect(result.items).toEqual([]);
  });

  it('accepts an { items } envelope too', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: rows(1, 3), total: 3 });
    expect((await fetchAllAttendanceEvents(DATE)).items).toHaveLength(3);
  });
});

describe('fetchDayRoster — /normalized, server statuses', () => {
  it('asks for the day, the branch and supervised=true; one page for a branch', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: rows(1, 120), total: 120 });
    const res = await fetchDayRoster(DATE, 7, true);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({
      date_from: DATE, date_to: DATE, size: 500, page: 1, organization_branch_id: 7, supervised: true,
    });
    expect(res.items).toHaveLength(120);
    expect(res.total).toBe(120);
  });

  it('omits supervised/branch when not given', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [], total: 0 });
    await fetchDayRoster(DATE);
    expect(mock.history.get[0].params).toEqual({ date_from: DATE, date_to: DATE, size: 500, page: 1 });
  });

  it('walks the remaining pages (whole-organisation roles) and concatenates in order', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply((cfg) => {
      const page = Number(cfg.params.page);
      const count = page === 3 ? 200 : 500;
      return [200, { items: rows((page - 1) * 500 + 1, count), total: 1200 }];
    });
    const res = await fetchDayRoster(DATE);
    expect(mock.history.get).toHaveLength(3);
    expect(res.items).toHaveLength(1200);
    expect(res.items[500]).toEqual({ id: 501 });
  });

  it('query key varies by date / branch / supervised', () => {
    expect(rosterQueryKey(DATE, 7, true)).toEqual(['team-roster', DATE, 7, true]);
    expect(dayRosterQuery(DATE, 7).queryKey).toEqual(['team-roster', DATE, 7, false]);
    expect(rosterQueryKey(DATE)).not.toEqual(rosterQueryKey(DATE, 7));
  });
});
