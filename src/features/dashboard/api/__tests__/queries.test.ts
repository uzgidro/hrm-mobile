import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, WORK_LEAVES, NOTIFICATIONS_LIST } from '@/api/urls';
import {
  homeAttendanceQuery,
  homeMyLeavesQuery,
  homeAssignedLeavesQuery,
  homeNotificationsQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('homeAttendanceQuery', () => {
  it('carries the self-attendance key ["attendance", id, monthKey] and forwards the date range + employee_id', async () => {
    const opts = homeAttendanceQuery(7, '2026-07', '2026-07-01', '2026-07-31');
    expect(opts.queryKey).toEqual(['attendance', 7, '2026-07']);
    expect(opts.staleTime).toBe(2 * 60 * 1000);
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: [], total: 0 });
    await (opts.queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({
      date_from: '2026-07-01',
      date_to: '2026-07-31',
      employee_id: 7,
    });
  });

  it('is disabled until an employee id resolves', () => {
    expect(homeAttendanceQuery(undefined, '2026-07', '2026-07-01', '2026-07-31').enabled).toBe(false);
    expect(homeAttendanceQuery(7, '2026-07', '2026-07-01', '2026-07-31').enabled).toBe(true);
  });

  it('returns a bare-array response as-is', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (homeAttendanceQuery(7, '2026-07', '2026-07-01', '2026-07-31').queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: [{ id: 1 }] });
    const data = await (homeAttendanceQuery(7, '2026-07', '2026-07-01', '2026-07-31').queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});

describe('homeMyLeavesQuery', () => {
  it('keys UNDER the work-leaves ROOT so leave sign/reject invalidations reach the home card', () => {
    const key = homeMyLeavesQuery(7).queryKey;
    // invalidateQueries(['work-leaves']) (what sign/reject calls) prefix-matches this.
    expect(key[0]).toBe('work-leaves');
    expect(key).toEqual(['work-leaves', 'home', 'mine', 7]);
  });

  it('null-pads a missing employee id and keeps the 2-minute staleTime', () => {
    expect(homeMyLeavesQuery(undefined).queryKey).toEqual(['work-leaves', 'home', 'mine', null]);
    expect(homeMyLeavesQuery(7).staleTime).toBe(2 * 60 * 1000);
  });

  it('sends employee_id + size and slices the result to 5', async () => {
    const opts = homeMyLeavesQuery(7);
    mock.onGet(WORK_LEAVES).reply(200, { items: Array.from({ length: 8 }, (_, i) => ({ id: i })) });
    const data = await (opts.queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(5);
    expect(mock.history.get[0].params).toEqual({ employee_id: 7, size: 5 });
  });

  it('slices a bare-array response to 5 as well', async () => {
    mock.onGet(WORK_LEAVES).reply(200, Array.from({ length: 9 }, (_, i) => ({ id: i })));
    const data = await (homeMyLeavesQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(5);
  });
});

describe('homeAssignedLeavesQuery', () => {
  it('keys UNDER the work-leaves ROOT so leave sign/reject invalidations reach the incoming feed', () => {
    const key = homeAssignedLeavesQuery(7).queryKey;
    expect(key[0]).toBe('work-leaves');
    expect(key).toEqual(['work-leaves', 'home', 'assigned', 7]);
  });

  it('polls every 60s and keeps a 30s staleTime', () => {
    const opts = homeAssignedLeavesQuery(7);
    expect(opts.staleTime).toBe(30 * 1000);
    expect(opts.refetchInterval).toBe(60 * 1000);
  });

  it('sends assigned_signer + size and unwraps an { items } envelope', async () => {
    const opts = homeAssignedLeavesQuery(7);
    mock.onGet(WORK_LEAVES).reply(200, { items: [{ id: 1 }, { id: 2 }] });
    const data = await (opts.queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
    expect(mock.history.get[0].params).toEqual({ assigned_signer: true, size: 50 });
  });

  it('returns a bare-array response as-is', async () => {
    mock.onGet(WORK_LEAVES).reply(200, [{ id: 1 }]);
    const data = await (homeAssignedLeavesQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});

describe('homeNotificationsQuery', () => {
  it('KEEPS the ["notifications", id] key so the push service + mark-read invalidations reach the badge', () => {
    const key = homeNotificationsQuery(7).queryKey;
    // push service + mark-read call invalidateQueries(['notifications']) → prefix-matches.
    expect(key[0]).toBe('notifications');
    expect(key).toEqual(['notifications', 7]);
  });

  it('is disabled until an employee id resolves and polls every 60s', () => {
    expect(homeNotificationsQuery(undefined).enabled).toBe(false);
    const opts = homeNotificationsQuery(7);
    expect(opts.enabled).toBe(true);
    expect(opts.staleTime).toBe(30 * 1000);
    expect(opts.refetchInterval).toBe(60 * 1000);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, { items: [{ id: 1 }] });
    const data = await (homeNotificationsQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('returns a bare-array response as-is', async () => {
    mock.onGet(NOTIFICATIONS_LIST).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (homeNotificationsQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });
});
