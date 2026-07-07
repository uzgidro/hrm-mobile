import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { EMPLOYEE_DETAIL, TURNSTILE_ATTENDANCE_EVENTS } from '@/api/urls';
import { fetchAllEmployees, employeesQueryKey } from '@/utils/employees';
import type { AttendanceEvent, EmployeeFull } from '@/types';

// Hierarchical query keys — `all` is a strict prefix of every detail/attendance
// key, so invalidating `employeeKeys.all` refreshes an open profile AND its
// calendar in one call (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
//
// NOTE on `list`: the employees LIST is keyed by the shared
// `employeesQueryKey(orgBranchId)` from `@/utils/employees`, NOT by
// `employeeKeys.list(...)`. Several other screens (team, attendance-detail,
// birthdays, the home-tab prefetch, project form) read/prefetch that same key
// to share one cached roster across the app. `employeesListQuery` below reuses
// `employeesQueryKey` verbatim so that cross-screen cache stays shared;
// `employeeKeys.list` is provided only for parity/invalidation convenience.
export const employeeKeys = {
  all: ['employees'] as const,
  list: (orgBranchId?: number) => [...employeeKeys.all, 'list', orgBranchId ?? null] as const,
  detail: (id: number) => [...employeeKeys.all, 'detail', id] as const,
  attendance: (id: number, monthKey: string) =>
    [...employeeKeys.all, 'attendance', id, monthKey] as const,
};

// The employees LIST — wraps the shared, parallel-paginated `fetchAllEmployees`
// helper and reuses the shared `employeesQueryKey` so the roster cache is shared
// with every other screen that reads it. Do NOT swap this key for
// `employeeKeys.list(...)`: that would fork the cache and break sharing.
export function employeesListQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });
}

export function employeeDetailQuery(id: number) {
  return queryOptions({
    queryKey: employeeKeys.detail(id),
    queryFn: () => apiClient.get<EmployeeFull>(EMPLOYEE_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Employee profile data changes rarely — the calendar screen kept this at
    // 5 min; preserve it so we don't refetch on every remount/focus.
    staleTime: 5 * 60 * 1000,
  });
}

export function employeeAttendanceQuery(id: number, monthKey: string) {
  const { dateFrom, dateTo } = monthRange(monthKey);
  return queryOptions({
    queryKey: employeeKeys.attendance(id, monthKey),
    queryFn: () =>
      apiClient
        .get(TURNSTILE_ATTENDANCE_EVENTS, {
          params: {
            date_from: dateFrom,
            date_to: dateTo,
            employee_id: id,
          },
        })
        .then((r) => {
          const d = r.data;
          // The endpoint returns either a bare array or an { items } envelope.
          return (Array.isArray(d) ? d : (d?.items ?? [])) as AttendanceEvent[];
        }),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// Derive the month's first/last day from a "YYYY-MM" key. This reproduces the
// calendar's original `currentMonth.format('YYYY-MM-DD')` / `.endOf('month')`
// range exactly (currentMonth is always startOf('month')), while keeping the
// factory self-contained and unit-testable from a plain monthKey.
function monthRange(monthKey: string): { dateFrom: string; dateTo: string } {
  const [year, month] = monthKey.split('-').map(Number);
  const dateFrom = `${monthKey}-01`;
  // Day 0 of the next month = last day of this month.
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}
