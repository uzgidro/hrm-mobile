import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import {
  TURNSTILE_ATTENDANCE_NORMALIZED,
  TURNSTILE_ATTENDANCE_EVENTS,
  NAVBATCHILIK_GROUPS_MY,
  NAVBATCHILIK_GROUP_MEMBERS,
  WORK_SCHEDULE_DAYS,
  WORK_SCHEDULE_DAYS_BY_GROUP,
  HOLIDAYS_LIST,
  DUTY_DAYS_LIST,
} from '@/api/urls';
import type { AttendanceEvent, DutyDay, Employee, EmployeeAttendance, Holiday, NavbatchilikGroup, WorkScheduleDay } from '@/types';

// List endpoints return either a bare array or an { items } envelope.
function unwrap<T>(d: any): T[] {
  return (Array.isArray(d) ? d : (d?.items ?? [])) as T[];
}

// Per-feature queryOptions factories for "Мой табель" (Учёт времени, Wave 1).
// The normalized endpoint returns one row per employee with an
// attendance.calendar {date -> code} map; for a personal tabel we request our
// OWN employee_id and read items[0].
//
// The endpoint is not self-scoped by default — it is a whole-branch tabel for
// the roles that are allowed one. Since backend `f9c79f0` a plain employee only
// ever gets their own row + subordinates + headed departments, so a foreign id
// yields nothing; we still always pass our own id, both for the correct row and
// because supervisors/dept heads WOULD otherwise get several rows back.
export const timesheetKeys = {
  all: ['timesheet'] as const,
  my: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'my', month, employeeId ?? null] as const,
  myEvents: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'my-events', month, employeeId ?? null] as const,
  myGroups: () => [...timesheetKeys.all, 'duty-groups'] as const,
  groupMembers: (groupId: number) => [...timesheetKeys.all, 'duty-members', groupId] as const,
  myScheduleDays: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'schedule-days', month, employeeId ?? null] as const,
  groupScheduleDays: (month: string, groupId?: number) =>
    [...timesheetKeys.all, 'group-schedule-days', month, groupId ?? null] as const,
  holidays: (orgBranchId?: number) => [...timesheetKeys.all, 'holidays', orgBranchId ?? null] as const,
  offDayDuty: (orgBranchId?: number) =>
    [...timesheetKeys.all, 'off-day-duty', orgBranchId ?? null] as const,
};

// Fetch my monthly tabel row. `month` is 'YYYY-MM'; we expand it to the full
// month's date range the endpoint expects. Returns the single EmployeeAttendance
// row (or null if the employee has no data for the month).
export function myTimesheetQuery(month: string, employeeId?: number) {
  const start = dayjs(`${month}-01`);
  const dateFrom = start.format('YYYY-MM-DD');
  const dateTo = start.endOf('month').format('YYYY-MM-DD');
  return queryOptions({
    queryKey: timesheetKeys.my(month, employeeId),
    enabled: !!employeeId,
    queryFn: () =>
      apiClient
        .get(TURNSTILE_ATTENDANCE_NORMALIZED, {
          params: { employee_id: employeeId, date_from: dateFrom, date_to: dateTo, size: 1 },
        })
        .then((r) => unwrap<EmployeeAttendance>(r.data)[0] ?? null),
    staleTime: 5 * 60 * 1000,
  });
}

// Raw turnstile entry/exit events for MY month — the normalized tabel row has no
// per-event times, so the day-detail (Вход/Выход + Журнал) needs these. Same
// endpoint EmployeeCalendarScreen uses, but kept inside the timesheet feature
// (CLAUDE.md: no cross-feature imports; the URL constant is shared in src/api).
export function myTimesheetEventsQuery(month: string, employeeId?: number) {
  const start = dayjs(`${month}-01`);
  const dateFrom = start.format('YYYY-MM-DD');
  const dateTo = start.endOf('month').format('YYYY-MM-DD');
  return queryOptions({
    queryKey: timesheetKeys.myEvents(month, employeeId),
    enabled: !!employeeId,
    queryFn: () =>
      apiClient
        .get(TURNSTILE_ATTENDANCE_EVENTS, {
          params: { employee_id: employeeId, date_from: dateFrom, date_to: dateTo },
        })
        .then((r) => unwrap<AttendanceEvent>(r.data)),
    staleTime: 2 * 60 * 1000,
  });
}

// ── Wave 2 — "Мои дежурства" (navbatchilik, read-only) ───────────────────────

// My duty groups (truly self-scoped on the backend; [] for non-members).
export function myNavbatchilikGroupsQuery() {
  return queryOptions({
    queryKey: timesheetKeys.myGroups(),
    queryFn: () =>
      apiClient.get(NAVBATCHILIK_GROUPS_MY).then((r) => unwrap<NavbatchilikGroup>(r.data)),
    staleTime: 10 * 60 * 1000,
  });
}

// A group's effective (department-expanded) roster — the read-only "who's on
// duty with me" list. /my embeds only DIRECT members, so the card fetches this.
export function groupMembersQuery(groupId: number) {
  return queryOptions({
    queryKey: timesheetKeys.groupMembers(groupId),
    queryFn: () =>
      apiClient.get(NAVBATCHILIK_GROUP_MEMBERS(groupId)).then((r) => unwrap<Employee>(r.data)),
    staleTime: 10 * 60 * 1000,
  });
}

// My assigned duty/shift days for a month. work-schedule-days is NOT
// self-scoped — we always pass our OWN employee_id (disabled until known),
// mirroring the module's client-side read-only rule.
export function myScheduleDaysQuery(month: string, employeeId?: number) {
  const start = dayjs(`${month}-01`);
  return queryOptions({
    queryKey: timesheetKeys.myScheduleDays(month, employeeId),
    enabled: !!employeeId,
    queryFn: () =>
      apiClient
        .get(WORK_SCHEDULE_DAYS, {
          params: {
            employee_id: employeeId,
            date_from: start.format('YYYY-MM-DD'),
            date_to: start.endOf('month').format('YYYY-MM-DD'),
            size: 100,
          },
        })
        .then((r) => unwrap<WorkScheduleDay>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

// ALL group members' duty days for a month, in ONE request (backend resolves the
// effective roster server-side → no N+1). Returns a flat WorkScheduleDay[] with
// each row's employee_id; the screen keys them by `${employee_id}_${date}`.
// "Дежурства других" — lets a group member see the whole group's schedule.
export function groupScheduleDaysQuery(month: string, groupId?: number) {
  const start = dayjs(`${month}-01`);
  return queryOptions({
    queryKey: timesheetKeys.groupScheduleDays(month, groupId),
    enabled: !!groupId,
    queryFn: () =>
      apiClient
        .get(WORK_SCHEDULE_DAYS_BY_GROUP(groupId as number), {
          params: {
            date_from: start.format('YYYY-MM-DD'),
            date_to: start.endOf('month').format('YYYY-MM-DD'),
          },
        })
        .then((r) => unwrap<WorkScheduleDay>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Wave 3 — "Праздники / дежурные дни" (read-only lists) ────────────────────

// Branch-scoped holidays list (web HolidaysPage parity: size=100 + branch id).
export function holidaysQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: timesheetKeys.holidays(orgBranchId),
    queryFn: () =>
      apiClient
        .get(HOLIDAYS_LIST, {
          params: { size: 100, ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}) },
        })
        .then((r) => unwrap<Holiday>(r.data)),
    staleTime: 60 * 60 * 1000,
  });
}

// Duty-day ranges (who works through the off-days). Branch-scoped like the web
// HolidaysPage tab: the desktop client injects `organization_branch_id` into
// every request via an axios interceptor, mobile has no such interceptor — so
// the param is passed explicitly here. The backend now also enforces the
// caller's branch scope server-side, but a multi-branch (HR) account would
// still get every branch's rows without this param.
export function offDayDutyQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: timesheetKeys.offDayDuty(orgBranchId),
    queryFn: () =>
      apiClient
        .get(DUTY_DAYS_LIST, {
          params: { size: 100, ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}) },
        })
        .then((r) => unwrap<DutyDay>(r.data)),
    staleTime: 60 * 60 * 1000,
  });
}
