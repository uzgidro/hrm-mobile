import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  WORK_LEAVES,
  NOTIFICATIONS_LIST,
  TURNSTILE_ATTENDANCE_EVENTS,
  EMPLOYEES_BIRTHDAYS,
} from '@/api/urls';
import { fetchAllAttendanceEvents, attendanceQueryKey } from '@/utils/attendance';
import { fetchAllEmployees, employeesQueryKey } from '@/utils/employees';
import type { AttendanceEvent, WorkLeave, Notification, EmployeeBirthday } from '@/types';

// Per-feature queryOptions factories for the home dashboard. The home tab is a
// COMPOSITE screen — it stitches together attendance, leaves, notifications,
// employees and birthdays — so this file only owns the four home-specific reads
// (the self schedule card, the two leave feeds and the notifications badge). The
// three heavy prefetches (employees roster / today's attendance / birthdays)
// reuse the SAME shared/feature keys the destination screens (team,
// attendance-detail, birthdays) read, so the warmed entries are shared instead
// of forked — see `prefetchHomeData`.

// The list endpoint returns either a bare array or an { items } envelope.
function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}

// The signed-in user's own month of turnstile events, powering the "Bugungi
// jadval" schedule card (the screen filters to today client-side).
//
// NOTE on the key: `['attendance', employeeId, monthKey]` is KEPT verbatim. This
// is the home tab's own self-attendance key — distinct from both the shared
// team-day key (`attendanceQueryKey` → `['team-attendance', …]`) and the
// employees feature's per-employee calendar key (`['employees','attendance', …]`).
// Nothing else reads this exact shape today, but the caller passes an explicit
// `from`/`to` range so the factory stays self-contained and testable.
export function homeAttendanceQuery(
  employeeId: number | undefined,
  monthKey: string,
  from: string,
  to: string,
) {
  return queryOptions({
    queryKey: ['attendance', employeeId, monthKey] as const,
    queryFn: () =>
      apiClient
        .get(TURNSTILE_ATTENDANCE_EVENTS, {
          params: { date_from: from, date_to: to, employee_id: employeeId },
        })
        .then((r) => unwrapList<AttendanceEvent>(r.data)),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

// My own recent leave requests (non-supervisor branch). Keyed UNDER the
// `'work-leaves'` root that the leaves feature's `leaveKeys.all` produces, so a
// leave signed/rejected elsewhere (`invalidateQueries(['work-leaves'])`)
// prefix-matches and refreshes this home card. Preserves the original
// `.slice(0, 5)` cap. Cross-feature imports are disallowed by the features
// boundary rule, so we spell the root string directly rather than importing
// `leaveKeys`.
export function homeMyLeavesQuery(employeeId: number | undefined) {
  return queryOptions({
    queryKey: ['work-leaves', 'home', 'mine', employeeId ?? null] as const,
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { employee_id: employeeId, size: 5 } })
        .then((r) => unwrapList<WorkLeave>(r.data).slice(0, 5)),
    staleTime: 2 * 60 * 1000,
  });
}

// Leaves assigned to me to sign (supervisor branch). Same `'work-leaves'` root
// so sign/reject invalidations reach it; polled every 60s for the incoming-queue
// badge.
export function homeAssignedLeavesQuery(employeeId: number | undefined) {
  return queryOptions({
    queryKey: ['work-leaves', 'home', 'assigned', employeeId ?? null] as const,
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { assigned_signer: true, size: 50 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// The notifications feed powering the header bell badge. The key is KEPT as
// `['notifications', employeeId]`: the push service (`app/_layout.tsx` foreground
// receipt) and mark-read both call `invalidateQueries(['notifications'])`, which
// prefix-matches this. Changing the root would silently break the badge refresh.
export function homeNotificationsQuery(employeeId: number | undefined) {
  return queryOptions({
    queryKey: ['notifications', employeeId] as const,
    queryFn: () => apiClient.get(NOTIFICATIONS_LIST).then((r) => unwrapList<Notification>(r.data)),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Warm the caches the OTHER screens read so navigating to team /
// attendance-detail / birthdays is instant. Each entry reuses the EXACT shared
// key + staleTime the destination screen uses (employeesQueryKey,
// attendanceQueryKey, birthdayKeys.list shape) so nothing is forked — the
// prefetched entry is the one those screens consume.
export function prefetchHomeData(
  qc: QueryClient,
  orgBranchId: number | undefined,
  today: string,
) {
  qc.prefetchQuery({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });
  qc.prefetchQuery({
    queryKey: attendanceQueryKey(today, orgBranchId),
    queryFn: () => fetchAllAttendanceEvents(today, orgBranchId),
    staleTime: 3 * 60 * 1000,
  });
  qc.prefetchQuery({
    // Same key shape as the birthdays feature's birthdayKeys.list(orgBranchId)
    // so the Team screen's birthday card reads this warmed entry instead of
    // refetching.
    queryKey: ['birthdays', 'list', orgBranchId ?? null],
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_BIRTHDAYS, {
          params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
        })
        .then((r) => r.data as EmployeeBirthday[]),
    staleTime: 60 * 60 * 1000,
  });
}
