import { useMemo } from 'react';
import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  WORK_LEAVES,
  NOTIFICATIONS_LIST,
  TURNSTILE_ATTENDANCE_EVENTS,
  EMPLOYEES_BIRTHDAYS,
  TURNSTILE_DAY_BOARD,
  DASHBOARD_EMPLOYEES_BY_CATEGORY,
  DASHBOARD_EMPLOYEE_COUNT,
  DASHBOARD_AGE_STATS,
  DASHBOARD_NATIONALITY_STATS,
  DASHBOARD_JOB_POSITION_STATS,
  DASHBOARD_OVERDUE_TASKS,
} from '@/api/urls';
import type { DayBoard, EmployeesByCategory } from '../utils/attendanceBoard';
import { fetchAllAttendanceEvents, attendanceQueryKey, dayRosterQuery } from '@/utils/attendance';
import { leaveStatusGroup } from '@/utils/leaveStatus';
import { menuBadgesQuery } from '@/features/notifications/api/queries';
import type { AttendanceEvent, WorkLeave, Notification, EmployeeBirthday } from '@/types';

// Per-feature queryOptions factories for the home dashboard. The home tab is a
// COMPOSITE screen — it stitches together attendance, leaves, notifications,
// employees and birthdays — so this file only owns the four home-specific reads
// (the self schedule card, the two leave feeds and the notifications badge). The
// three heavy prefetches (employees roster / today's attendance / birthdays)
// reuse the SAME shared/feature keys the destination screens (team,
// attendance-detail, birthdays) read, so the warmed entries are shared instead
// of forked — see `prefetchHomeData`.

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
// so sign/reject invalidations reach it. The incoming-queue BADGE no longer
// comes from this list (see `useShellBadges`), so the 60 s poll is gone: the
// rows on the home card refresh on sign/reject invalidation and pull-to-refresh.
export function homeAssignedLeavesQuery(employeeId: number | undefined) {
  return queryOptions({
    queryKey: ['work-leaves', 'home', 'assigned', employeeId ?? null] as const,
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { assigned_signer: true, size: 50 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
    staleTime: 30 * 1000,
  });
}

// The notifications feed powering the header bell badge. The key is KEPT as
// `['notifications', employeeId]`: the push service (`app/_layout.tsx` foreground
// receipt) and mark-read both call `invalidateQueries(['notifications'])`, which
// prefix-matches this. Changing the root would silently break the badge refresh.
export function homeNotificationsQuery(employeeId: number | undefined) {
  return queryOptions({
    queryKey: ['notifications', employeeId] as const,
    // ⚠️ `limit`: the home card draws THREE rows, and this endpoint is unbounded
    // (the largest account holds 2 083 notifications). The unread number no
    // longer comes from this list — see `useShellBadges`. No interval either:
    // the push receipt and mark-read invalidate `['notifications']` already.
    queryFn: () =>
      apiClient
        .get(NOTIFICATIONS_LIST, { params: { limit: 5 } })
        .then((r) => unwrapList<Notification>(r.data)),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
  });
}

/**
 * The two rail/home badges — pending leaves to sign and unread notifications —
 * from ONE request, the menu-badges poll the app already makes.
 *
 * ⚠️ MEASURED 2026-09-11: the phone polled THREE endpoints every 60 s for
 * these numbers — the full notification list, `work-leaves?assigned_signer`
 * (50 rows, then counted in JS) and menu-badges. The server now counts both
 * (`leaves`, `unread_notifications`), so the first two polls are gone.
 *
 * Against an OLDER API the two fields are absent; only then do the old list
 * queries run, so the badges keep working through a staggered rollout.
 */
export function useShellBadges(employeeId: number | undefined, isSupervisor: boolean) {
  const { data: badges } = useQuery(menuBadgesQuery());
  const serverLeaves = badges?.leaves;
  const serverUnread = badges?.unread_notifications;

  const { data: assignedLeaves = [] } = useQuery({
    ...homeAssignedLeavesQuery(employeeId),
    enabled: !!employeeId && isSupervisor && serverLeaves === undefined,
  });
  const { data: notifications = [] } = useQuery({
    ...homeNotificationsQuery(employeeId),
    enabled: !!employeeId && serverUnread === undefined,
  });

  const pendingCount = useMemo(() => {
    if (!isSupervisor) return 0;
    if (serverLeaves !== undefined) return serverLeaves;
    return assignedLeaves.filter(
      (l) => leaveStatusGroup(l.status) === 'pending' && !l.signers?.some((s) => s.id === employeeId)
    ).length;
  }, [assignedLeaves, isSupervisor, employeeId, serverLeaves]);

  const unreadCount = useMemo(
    () => (serverUnread !== undefined ? serverUnread : notifications.filter((n) => !n.is_read).length),
    [notifications, serverUnread]
  );

  return { pendingCount, unreadCount };
}

// Today's turnstile events for the WHOLE branch, powering the roster in the
// Home attendance content block. REUSES the shared `attendanceQueryKey` +
// `fetchAllAttendanceEvents` helper (same ones `prefetchHomeData` below and
// the attendance feature's `dayAttendanceQuery` use) so the cache is shared,
// not forked — this is the identical factory shape as
// `src/features/attendance/api/queries.ts#dayAttendanceQuery`, just kept here
// so dashboard doesn't cross-import the attendance feature (see
// `src/features/README.md`).
export function homeTodayAttendanceQuery(dateKey: string, orgBranchId?: number) {
  return queryOptions({
    queryKey: attendanceQueryKey(dateKey, orgBranchId),
    queryFn: () => fetchAllAttendanceEvents(dateKey, orgBranchId),
    staleTime: 3 * 60 * 1000,
  });
}

// Warm the caches the OTHER screens read so navigating to team /
// attendance-detail / birthdays is instant. Each entry reuses the EXACT shared
// key + staleTime the destination screen uses (employeesListQuery,
// attendanceQueryKey, birthdayKeys.list shape) so nothing is forked — the
// prefetched entry is the one those screens consume.
export function prefetchHomeData(
  qc: QueryClient,
  orgBranchId: number | undefined,
  today: string,
) {
  // The roster itself (server statuses) — same key Home/Team/AttendanceDetail read.
  qc.prefetchQuery(dayRosterQuery(today, orgBranchId, false));
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

// ── v3 board so'rovlari (web v2 `useDashboard` / `useEmployeeStats` / `useOverdueSummary`) ──
// Hammasi `['dashboard', …]` ostida — pull-to-refresh `dashboardKeys.all` ni invalidatsiya qiladi.
export const dashboardKeys = {
  all: ['dashboard'] as const,
  day: (branchId: number | undefined, day: string) => ['dashboard', 'day-board', branchId ?? null, day] as const,
  categories: (branchId: number | undefined) => ['dashboard', 'categories', branchId ?? null] as const,
  composition: (branchId: number | undefined) => ['dashboard', 'composition', branchId ?? null] as const,
  overdue: (branchId: number | undefined) => ['dashboard', 'overdue', branchId ?? null] as const,
};

const branchParams = (branchId: number | undefined) => (branchId ? { organization_branch_id: branchId } : {});

/** Kunlik taxta — v2: cross-branch voqealar lentaga kiradi, lenta cheklanmagan (latest: -1). */
export function boardDayQuery(branchId: number | undefined, day: string) {
  return queryOptions({
    queryKey: dashboardKeys.day(branchId, day),
    queryFn: () =>
      apiClient
        .get<DayBoard>(TURNSTILE_DAY_BOARD, {
          params: { ...branchParams(branchId), day, include_cross_branch: true, latest: -1 },
        })
        .then((r) => r.data),
    staleTime: 60 * 1000,
  });
}

export function boardCategoriesQuery(branchId: number | undefined) {
  return queryOptions({
    queryKey: dashboardKeys.categories(branchId),
    queryFn: () =>
      apiClient
        .get<EmployeesByCategory>(DASHBOARD_EMPLOYEES_BY_CATEGORY, { params: branchParams(branchId) })
        .then((r) => r.data ?? {}),
    staleTime: 60 * 1000,
  });
}

export type Composition = {
  total: number;
  gender: { male: number; female: number; unknown: number };
  age: { key: string; value: number }[];
  nationality: { key: string; value: number }[];
  positions: { label: string; count: number }[];
};

/**
 * «Xodimlar tarkibi» kartasi — v2 DemographicsPanel manbalari. To'rt so'rov
 * parallel; bittasi yiqilsa o'sha bo'lim bo'sh qoladi, karta butunlay emas.
 */
export function compositionQuery(branchId: number | undefined) {
  return queryOptions({
    queryKey: dashboardKeys.composition(branchId),
    queryFn: async (): Promise<Composition> => {
      const params = { params: branchParams(branchId) };
      const [count, age, nat, pos] = await Promise.allSettled([
        apiClient.get(DASHBOARD_EMPLOYEE_COUNT, params),
        apiClient.get(DASHBOARD_AGE_STATS, params),
        apiClient.get(DASHBOARD_NATIONALITY_STATS, params),
        apiClient.get(DASHBOARD_JOB_POSITION_STATS, params),
      ]);
      const val = <T,>(r: PromiseSettledResult<{ data: T }>): T | undefined =>
        r.status === 'fulfilled' ? r.value.data : undefined;
      const c = val<{ total_count?: number; gender_stats?: { male?: number; female?: number; unknown?: number } }>(count);
      const g = c?.gender_stats ?? {};
      const gender = { male: g.male ?? 0, female: g.female ?? 0, unknown: g.unknown ?? 0 };
      const ageStats = val<{ stats?: Record<string, number> }>(age)?.stats ?? {};
      const nats = val<{ nationality?: string | null; count: number }[]>(nat) ?? [];
      const posRows = val<{ job_position_name?: string | null; count: number }[]>(pos) ?? [];
      return {
        total: c?.total_count ?? gender.male + gender.female + gender.unknown,
        gender,
        age: Object.entries(ageStats)
          .map(([key, v]) => ({ key, value: Number(v) }))
          .filter((x) => x.value > 0)
          .sort((a, b) => b.value - a.value),
        nationality: nats
          .filter((n) => n.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map((n) => ({ key: n.nationality || 'Unknown', value: n.count })),
        positions: posRows
          .filter((p) => p.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((p) => ({ label: p.job_position_name ?? '—', count: p.count })),
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}

export type OverdueSummary = { total?: number; by_department?: { department_name: string; count: number }[] };

export function overdueSummaryQuery(branchId: number | undefined) {
  return queryOptions({
    queryKey: dashboardKeys.overdue(branchId),
    queryFn: () =>
      apiClient.get<OverdueSummary>(DASHBOARD_OVERDUE_TASKS, { params: branchParams(branchId) }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
