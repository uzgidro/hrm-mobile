import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { TURNSTILE_ATTENDANCE_NORMALIZED } from '@/api/urls';
import type { EmployeeAttendance } from '@/types';

// Per-feature queryOptions factories for "Мой табель" (Учёт времени, Wave 1).
// The normalized endpoint returns one row per employee with an
// attendance.calendar {date -> code} map; for a personal tabel we request our
// OWN employee_id and read items[0]. The endpoint is NOT self-restricting, so
// the screen must pass the current user's employee id (never a foreign one).
export const timesheetKeys = {
  all: ['timesheet'] as const,
  my: (month: string, employeeId?: number) =>
    [...timesheetKeys.all, 'my', month, employeeId ?? null] as const,
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
        .then((r) => {
          const d = r.data as any;
          const items = (Array.isArray(d) ? d : (d?.items ?? [])) as EmployeeAttendance[];
          return items[0] ?? null;
        }),
    staleTime: 5 * 60 * 1000,
  });
}
