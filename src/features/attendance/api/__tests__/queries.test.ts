import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, WORK_LEAVES } from '@/api/urls';
import { attendanceQueryKey } from '@/utils/attendance';
import { attendanceKeys, dayAttendanceQuery, teamLeavesQuery } from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('attendanceKeys', () => {
  it('roots at the shared team-attendance key and mirrors attendanceQueryKey for the day', () => {
    expect(attendanceKeys.all).toEqual(['team-attendance']);
    expect(attendanceKeys.day('2026-07-06', 42)).toEqual(attendanceQueryKey('2026-07-06', 42));
    expect(attendanceKeys.day('2026-07-06')).toEqual(attendanceQueryKey('2026-07-06'));
    // `all` is a strict prefix of the day key → invalidating it matches the day.
    expect(attendanceKeys.day('2026-07-06', 42).slice(0, 1)).toEqual(attendanceKeys.all);
  });
});

describe('dayAttendanceQuery', () => {
  it('REUSES the shared attendanceQueryKey (not a forked feature key) so the day cache stays shared', () => {
    expect(dayAttendanceQuery('2026-07-06', 3).queryKey).toEqual(attendanceQueryKey('2026-07-06', 3));
    expect(dayAttendanceQuery('2026-07-06', 3).queryKey).toEqual(['team-attendance', '2026-07-06', 3]);
    expect(dayAttendanceQuery('2026-07-06').queryKey).toEqual(attendanceQueryKey('2026-07-06'));
  });

  it('keeps the dashboards 3-minute staleTime', () => {
    expect(dayAttendanceQuery('2026-07-06', 3).staleTime).toBe(3 * 60 * 1000);
  });

  it('fetches the day events via fetchAllAttendanceEvents (branch-scoped, single page)', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items, total: 2 });
    const data = await (dayAttendanceQuery('2026-07-06', 3).queryFn as () => Promise<{ items: unknown[]; total: number }>)();
    expect(data).toEqual({ items, total: 2 });
    // date range + branch filter forwarded to the paginated helper.
    expect(mock.history.get[0].params).toMatchObject({
      date_from: '2026-07-06',
      date_to: '2026-07-06',
      organization_branch_id: 3,
      size: 100,
    });
  });

  it('returns a bare-array response as a { items, total } page', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    const data = await (dayAttendanceQuery('2026-07-06').queryFn as () => Promise<{ items: unknown[]; total: number }>)();
    expect(data).toEqual({ items: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 3 });
  });
});

describe('teamLeavesQuery', () => {
  it('keys under the work-leaves ROOT so leave sign/reject invalidations reach the dashboards', () => {
    const key = teamLeavesQuery('2026-07-06', 20).queryKey;
    // invalidateQueries(['work-leaves']) (what sign/reject calls) prefix-matches this.
    expect(key[0]).toBe('work-leaves');
    expect(key).toEqual(['work-leaves', 'team', '2026-07-06']);
  });

  it('separates the per-date caches by the dateKey segment', () => {
    expect(teamLeavesQuery('2026-07-06', 20).queryKey).not.toEqual(teamLeavesQuery('2026-07-07', 20).queryKey);
  });

  it('keeps the dashboards 2-minute staleTime', () => {
    expect(teamLeavesQuery('2026-07-06', 20).staleTime).toBe(2 * 60 * 1000);
  });

  it('sends the requested size and unwraps an { items } envelope', async () => {
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 1 }] });
    const data = await (teamLeavesQuery('2026-07-06', 20).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
    expect(mock.history.get[0].params).toEqual({ size: 20 });
  });

  it('returns a bare-array response as-is with the requested size', async () => {
    mock.onGet(WORK_LEAVES).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (teamLeavesQuery('2026-07-06', 100).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
    expect(mock.history.get[0].params).toEqual({ size: 100 });
  });
});
