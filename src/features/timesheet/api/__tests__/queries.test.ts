import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { TURNSTILE_ATTENDANCE_NORMALIZED } from '@/api/urls';
import { timesheetKeys, myTimesheetQuery } from '../queries';
import type { EmployeeAttendance } from '@/types';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('timesheetKeys', () => {
  it('roots at the timesheet key and separates by month + employee', () => {
    expect(timesheetKeys.all).toEqual(['timesheet']);
    expect(timesheetKeys.my('2026-07', 42)).toEqual(['timesheet', 'my', '2026-07', 42]);
    expect(timesheetKeys.my('2026-07')).toEqual(['timesheet', 'my', '2026-07', null]);
    // `all` is a strict prefix → invalidating it matches every month/employee.
    expect(timesheetKeys.my('2026-07', 42).slice(0, 1)).toEqual(timesheetKeys.all);
    expect(timesheetKeys.my('2026-07', 42)).not.toEqual(timesheetKeys.my('2026-08', 42));
  });
});

describe('myTimesheetQuery', () => {
  it('is disabled until an employee id is known (endpoint is not self-scoped)', () => {
    expect(myTimesheetQuery('2026-07', undefined).enabled).toBe(false);
    expect(myTimesheetQuery('2026-07', 5).enabled).toBe(true);
  });

  it('expands the month to a full date range and passes the caller employee_id', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [], total: 0 });
    await (myTimesheetQuery('2026-07', 7).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toMatchObject({
      employee_id: 7,
      date_from: '2026-07-01',
      date_to: '2026-07-31',
      size: 1,
    });
  });

  it('handles February month-end correctly (leap year)', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [] });
    await (myTimesheetQuery('2028-02', 7).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toMatchObject({ date_from: '2028-02-01', date_to: '2028-02-29' });
  });

  it('returns the single employee row from an { items } envelope', async () => {
    const row: EmployeeAttendance = {
      id: 7,
      legal_name: 'Test',
      attendance: { present_days_count: 20, calendar: { '2026-07-01': 'present' } },
    };
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [row], total: 1 });
    const data = await (myTimesheetQuery('2026-07', 7).queryFn as () => Promise<EmployeeAttendance | null>)();
    expect(data).toEqual(row);
  });

  it('unwraps a bare-array response too', async () => {
    const row = { id: 7, legal_name: 'Test' };
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, [row]);
    const data = await (myTimesheetQuery('2026-07', 7).queryFn as () => Promise<unknown>)();
    expect(data).toEqual(row);
  });

  it('returns null when the month has no row', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [], total: 0 });
    const data = await (myTimesheetQuery('2026-07', 7).queryFn as () => Promise<unknown>)();
    expect(data).toBeNull();
  });
});
