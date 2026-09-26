import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, TURNSTILE_DAY_BOARD, TURNSTILE_ATTENDANCE_NORMALIZED } from '../../api/urls';
import { fetchAllAttendanceEvents, fetchDayRoster, rosterQueryKey, dayRosterQuery } from '../attendance';

const DATE = '2026-07-06';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.restore(); });

const rows = (start: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: start + i }));

describe('fetchAllAttendanceEvents — the day board, raw feed only as a fallback', () => {
  const ev = (id: number, employee_id: number, t: string) => ({ id, employee_id, happen_time: `${DATE}T${t}:00` });

  it('asks /day-board for the day and flattens each person to first/entry/exit/last (deduplicated)', async () => {
    mock.onGet(TURNSTILE_DAY_BOARD).reply(200, {
      people: [
        { employee_id: 5, first_id: 1, entry_id: 1, exit_id: 3, last_id: 3 },
        { employee_id: 6, first_id: 4, entry_id: null, exit_id: 4, last_id: 4 },
      ],
      events: [ev(1, 5, '08:55'), ev(3, 5, '18:02'), ev(4, 6, '09:30')],
    });
    const result = await fetchAllAttendanceEvents(DATE, 7);
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ day: DATE, latest: 0, organization_branch_id: 7 });
    expect(result.items.map((e) => e.id)).toEqual([1, 3, 4]);
    expect(result.total).toBe(3);
  });

  it('falls back to the raw feed on a server without the endpoint (404)', async () => {
    mock.onGet(TURNSTILE_DAY_BOARD).reply(404);
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, rows(1, 40));
    const result = await fetchAllAttendanceEvents(DATE, 7);
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.get[1].params).toEqual({ date_from: DATE, date_to: DATE, limit: 5000, organization_branch_id: 7 });
    expect(result).toEqual({ items: rows(1, 40), total: 40 });
  });

  it('fallback accepts an { items } envelope too', async () => {
    mock.onGet(TURNSTILE_DAY_BOARD).reply(404);
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: rows(1, 3), total: 3 });
    expect((await fetchAllAttendanceEvents(DATE)).items).toHaveLength(3);
  });

  it('does NOT swallow real failures (500) into the fallback', async () => {
    mock.onGet(TURNSTILE_DAY_BOARD).reply(500);
    await expect(fetchAllAttendanceEvents(DATE, 7)).rejects.toBeTruthy();
    expect(mock.history.get).toHaveLength(1);
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
