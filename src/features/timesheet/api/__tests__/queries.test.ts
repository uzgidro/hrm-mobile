import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  TURNSTILE_ATTENDANCE_NORMALIZED,
  NAVBATCHILIK_GROUPS_MY,
  NAVBATCHILIK_GROUP_MEMBERS,
  WORK_SCHEDULE_DAYS,
  WORK_SCHEDULE_DAYS_BY_DEPARTMENT,
  EMPLOYEES_LIST,
  HOLIDAYS_LIST,
  DUTY_DAYS_LIST,
} from '@/api/urls';
import {
  timesheetKeys,
  myTimesheetQuery,
  myNavbatchilikGroupsQuery,
  groupMembersQuery,
  myScheduleDaysQuery,
  departmentMembersQuery,
  departmentScheduleDaysQuery,
  holidaysQuery,
  offDayDutyQuery,
} from '../queries';
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

describe('myNavbatchilikGroupsQuery', () => {
  it('keys under the timesheet root', () => {
    expect(myNavbatchilikGroupsQuery().queryKey).toEqual(['timesheet', 'duty-groups']);
  });

  it('fetches /my with no params and unwraps an envelope', async () => {
    mock.onGet(NAVBATCHILIK_GROUPS_MY).reply(200, { items: [{ id: 1, name: 'G' }] });
    const data = await (myNavbatchilikGroupsQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 1, name: 'G' }]);
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('passes a bare array through', async () => {
    mock.onGet(NAVBATCHILIK_GROUPS_MY).reply(200, [{ id: 2 }]);
    const data = await (myNavbatchilikGroupsQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 2 }]);
  });
});

describe('groupMembersQuery', () => {
  it('keys per group id', () => {
    expect(groupMembersQuery(3).queryKey).toEqual(['timesheet', 'duty-members', 3]);
    expect(groupMembersQuery(3).queryKey).not.toEqual(groupMembersQuery(4).queryKey);
  });

  it('fetches the effective roster for the group', async () => {
    mock.onGet(NAVBATCHILIK_GROUP_MEMBERS(3)).reply(200, [{ id: 10, legal_name: 'A' }]);
    const data = await (groupMembersQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual([{ id: 10, legal_name: 'A' }]);
  });
});

describe('myScheduleDaysQuery', () => {
  it('is disabled until an employee id is known (endpoint is not self-scoped)', () => {
    expect(myScheduleDaysQuery('2026-07', undefined).enabled).toBe(false);
    expect(myScheduleDaysQuery('2026-07', 7).enabled).toBe(true);
  });

  it('requests the month range for OUR employee id only', async () => {
    mock.onGet(WORK_SCHEDULE_DAYS).reply(200, { items: [] });
    await (myScheduleDaysQuery('2026-07', 7).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toMatchObject({
      employee_id: 7,
      date_from: '2026-07-01',
      date_to: '2026-07-31',
      size: 100,
    });
  });

  it('separates cache per month and employee', () => {
    expect(myScheduleDaysQuery('2026-07', 7).queryKey).toEqual(['timesheet', 'schedule-days', '2026-07', 7]);
    expect(myScheduleDaysQuery('2026-08', 7).queryKey).not.toEqual(myScheduleDaysQuery('2026-07', 7).queryKey);
  });

  it('unwraps the paginated envelope', async () => {
    const rows = [{ id: 1, schedule_date: '2026-07-02' }];
    mock.onGet(WORK_SCHEDULE_DAYS).reply(200, { items: rows, total: 1 });
    const data = await (myScheduleDaysQuery('2026-07', 7).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual(rows);
  });
});

describe('holidaysQuery', () => {
  it('keys per branch under the timesheet root', () => {
    expect(holidaysQuery(3).queryKey).toEqual(['timesheet', 'holidays', 3]);
    expect(holidaysQuery().queryKey).toEqual(['timesheet', 'holidays', null]);
  });

  it('passes the branch filter and size (web HolidaysPage parity)', async () => {
    mock.onGet(HOLIDAYS_LIST).reply(200, { items: [] });
    await (holidaysQuery(3).queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ size: 100, organization_branch_id: 3 });
  });

  it('omits the branch param when unknown', async () => {
    mock.onGet(HOLIDAYS_LIST).reply(200, { items: [] });
    await (holidaysQuery().queryFn as () => Promise<unknown>)();
    expect(mock.history.get[0].params).toEqual({ size: 100 });
  });

  it('unwraps the envelope', async () => {
    const rows = [{ id: 1, name: 'Navroz', date_from: '2026-03-21', date_to: '2026-03-21' }];
    mock.onGet(HOLIDAYS_LIST).reply(200, { items: rows, total: 1 });
    const data = await (holidaysQuery(3).queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual(rows);
  });
});

describe('offDayDutyQuery', () => {
  it('keys under the timesheet root, distinct from navbatchilik keys', () => {
    expect(offDayDutyQuery().queryKey).toEqual(['timesheet', 'off-day-duty', null]);
    expect(offDayDutyQuery(7).queryKey).toEqual(['timesheet', 'off-day-duty', 7]);
  });

  it('fetches the paginated duty-days list', async () => {
    const rows = [{ id: 1, date_from: '2026-01-01', date_to: '2026-01-02', employees: [] }];
    mock.onGet(DUTY_DAYS_LIST).reply(200, { items: rows, total: 1 });
    const data = await (offDayDutyQuery().queryFn as () => Promise<unknown[]>)();
    expect(data).toEqual(rows);
    expect(mock.history.get[0].params).toEqual({ size: 100 });
  });

  // Web'da filial parametrini axios interceptor'i qo'shadi; mobilda interceptor
  // yo'q, shuning uchun so'rov uni O'ZI yuborishi shart (aks holda ko'p filialli
  // kadr hisobida butun tashkilotning navbatchiligi chiqadi).
  it('sends organization_branch_id when a branch is known', async () => {
    mock.onGet(DUTY_DAYS_LIST).reply(200, { items: [], total: 0 });
    await (offDayDutyQuery(7).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ size: 100, organization_branch_id: 7 });
  });
});

// ── Bo'lim navbatchiligi (department.has_navbatchilik) ───────────────────────
// Guruhga a'zo bo'lmagan navbatchi bo'lim: guruh zanjiri hech nima qaytarmaydi,
// shu bois grid bo'sh chiqardi. Bu ikki so'rov o'sha bo'shliqni yopadi.

describe('departmentMembersQuery', () => {
  it('is disabled until the department is known', () => {
    expect(departmentMembersQuery(undefined).enabled).toBe(false);
    expect(departmentMembersQuery(31).enabled).toBe(true);
  });

  it('keys per department, distinct from the group roster key', () => {
    expect(departmentMembersQuery(31).queryKey).toEqual(['timesheet', 'dept-members', 31]);
    expect(departmentMembersQuery(31).queryKey).not.toEqual(timesheetKeys.groupMembers(31));
  });

  it('asks for the whole department in one page', async () => {
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [{ id: 5, legal_name: 'A' }], total: 1 });
    const data = await (departmentMembersQuery(31).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ department_id: 31, size: 100 });
    expect(data).toEqual([{ id: 5, legal_name: 'A' }]);
  });
});

describe('departmentScheduleDaysQuery', () => {
  it('is disabled until the department is known', () => {
    expect(departmentScheduleDaysQuery('2026-07', undefined).enabled).toBe(false);
    expect(departmentScheduleDaysQuery('2026-07', 31).enabled).toBe(true);
  });

  it('keys per month + department, distinct from the group schedule key', () => {
    expect(departmentScheduleDaysQuery('2026-07', 31).queryKey)
      .toEqual(['timesheet', 'dept-schedule-days', '2026-07', 31]);
    expect(departmentScheduleDaysQuery('2026-07', 31).queryKey)
      .not.toEqual(timesheetKeys.groupScheduleDays('2026-07', 31));
  });

  it('expands the month and returns a flat unpaginated list', async () => {
    const rows = [
      { id: 1, employee_id: 5, schedule_date: '2026-07-04', schedule_type: 'day' },
      { id: 2, employee_id: 6, schedule_date: '2026-07-04', schedule_type: 'night' },
    ];
    mock.onGet(WORK_SCHEDULE_DAYS_BY_DEPARTMENT(31)).reply(200, rows);
    const data = await (departmentScheduleDaysQuery('2026-07', 31).queryFn as () => Promise<unknown[]>)();
    expect(mock.history.get[0].params).toEqual({ date_from: '2026-07-01', date_to: '2026-07-31' });
    expect(data).toEqual(rows);
  });
});
