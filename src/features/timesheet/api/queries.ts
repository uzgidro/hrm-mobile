import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import {
  TURNSTILE_ATTENDANCE_NORMALIZED,
  NAVBATCHILIK_GROUPS_MY,
  NAVBATCHILIK_GROUP_MEMBERS,
  WORK_SCHEDULE_DAYS,
} from '@/api/urls';
import type { Employee, EmployeeAttendance, NavbatchilikGroup, WorkScheduleDay } from '@/types';

// List endpoints return either a bare array or an { items } envelope.
function unwrap<T>(d: any): T[] {
  return (Array.isArray(d) ? d : (d?.items ?? [])) as T[];
}

// Per-feature queryOptions factories for "Мой табель" (Учёт времени, Wave 1).
// The normalized endpoint returns one row per employee with an
// attendance.calendar {date -> code} map; for a personal tabel we request our
// OWN employee_id and read items[0]. The endpoint is NOT self-restricting, so
// the screen must pass the current user's employee id (never a foreign one).
export const timesheetKeys = {
  all: ['timesheet'] as const,
  my: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'my', month, employeeId ?? null] as const,
  myGroups: () => [...timesheetKeys.all, 'duty-groups'] as const,
  groupMembers: (groupId: number) => [...timesheetKeys.all, 'duty-members', groupId] as const,
  myScheduleDays: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'schedule-days', month, employeeId ?? null] as const,
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
