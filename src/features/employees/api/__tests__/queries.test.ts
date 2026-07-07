import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { EMPLOYEE_DETAIL, EMPLOYEES_LIST, TURNSTILE_ATTENDANCE_EVENTS } from '@/api/urls';
import { employeesQueryKey } from '@/utils/employees';
import {
  employeeKeys,
  employeesListQuery,
  employeeDetailQuery,
  employeeAttendanceQuery,
} from '../queries';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('employeeKeys', () => {
  it('builds a hierarchical key tree so `all` is a prefix of list, detail and attendance', () => {
    expect(employeeKeys.all).toEqual(['employees']);
    expect(employeeKeys.list(5)).toEqual(['employees', 'list', 5]);
    expect(employeeKeys.list()).toEqual(['employees', 'list', null]);
    expect(employeeKeys.detail(9)).toEqual(['employees', 'detail', 9]);
    expect(employeeKeys.attendance(9, '2026-07')).toEqual(['employees', 'attendance', 9, '2026-07']);
    // `all` is a strict prefix of every key → invalidating it matches them all.
    expect(employeeKeys.list(5).slice(0, 1)).toEqual(employeeKeys.all);
    expect(employeeKeys.detail(9).slice(0, 1)).toEqual(employeeKeys.all);
    expect(employeeKeys.attendance(9, '2026-07').slice(0, 1)).toEqual(employeeKeys.all);
  });
});

describe('employeesListQuery', () => {
  it('reuses the SHARED employeesQueryKey (not employeeKeys.list) so the roster cache stays shared', () => {
    expect(employeesListQuery(7).queryKey).toEqual(employeesQueryKey(7));
    expect(employeesListQuery(7).queryKey).toEqual(['team-employees-all', 7]);
    expect(employeesListQuery().queryKey).toEqual(employeesQueryKey());
  });

  it('returns the paginated fetchAllEmployees result (single page, total <= 100)', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    mock.onGet(EMPLOYEES_LIST).reply(200, { items, total: 2 });
    const data = await (employeesListQuery(7).queryFn as () => Promise<{ items: unknown[]; total: number }>)();
    expect(data).toEqual({ items, total: 2 });
    // orgBranchId is forwarded to the roster helper.
    expect(mock.history.get[0].params).toMatchObject({ organization_branch_id: 7, size: 100 });
  });
});

describe('employeeDetailQuery', () => {
  it('carries the detail key and is enabled for a real id', () => {
    const opts = employeeDetailQuery(42);
    expect(opts.queryKey).toEqual(['employees', 'detail', 42]);
    expect(opts.enabled).toBe(true);
  });

  it('keeps the calendar screen\'s 5-minute staleTime (no refetch on every remount)', () => {
    expect(employeeDetailQuery(42).staleTime).toBe(5 * 60 * 1000);
  });

  it('is disabled for a falsy id (0 / undefined)', () => {
    expect(employeeDetailQuery(0).enabled).toBe(false);
    expect(employeeDetailQuery(undefined as unknown as number).enabled).toBe(false);
  });

  it('fetches the employee from EMPLOYEE_DETAIL(id)', async () => {
    mock.onGet(EMPLOYEE_DETAIL(42)).reply(200, { id: 42, legal_name: 'X' });
    const data = await (employeeDetailQuery(42).queryFn as unknown as () => Promise<{ id: number }>)();
    expect(data.id).toBe(42);
    expect(mock.history.get[0].url).toBe(EMPLOYEE_DETAIL(42));
  });
});

describe('employeeAttendanceQuery', () => {
  it('carries the attendance key and is enabled for a real id', () => {
    const opts = employeeAttendanceQuery(9, '2026-07');
    expect(opts.queryKey).toEqual(['employees', 'attendance', 9, '2026-07']);
    expect(opts.enabled).toBe(true);
  });

  it('is disabled for a falsy id', () => {
    expect(employeeAttendanceQuery(0, '2026-07').enabled).toBe(false);
  });

  it('sends the full-month date range + employee_id', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, []);
    await (employeeAttendanceQuery(9, '2026-07').queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({
      date_from: '2026-07-01',
      date_to: '2026-07-31',
      employee_id: 9,
    });
  });

  it('computes February end-of-month correctly (leap year)', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, []);
    await (employeeAttendanceQuery(9, '2024-02').queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toMatchObject({ date_from: '2024-02-01', date_to: '2024-02-29' });
  });

  it('returns a bare array response as-is', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, [{ id: 1 }, { id: 2 }]);
    const data = await (employeeAttendanceQuery(9, '2026-07').queryFn as () => Promise<unknown[]>)();
    expect(data).toHaveLength(2);
  });

  it('unwraps an { items } envelope', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: [{ id: 1 }] });
    const data = await (employeeAttendanceQuery(9, '2026-07').queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1 }]);
  });
});
