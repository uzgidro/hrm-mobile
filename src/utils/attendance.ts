import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, TURNSTILE_ATTENDANCE_NORMALIZED, DASHBOARD_EMPLOYEES_BY_CATEGORY } from '../api/urls';
import { AttendanceEvent, EmployeeAttendance, EmployeeCategories } from '../types';
import { mapWithConcurrency } from './concurrency';

interface AttendancePage { items: AttendanceEvent[]; total: number }

// ── Raw turnstile events of ONE day (entry/exit times on roster rows) ────────
//
// `GET /turnstile-attendance-events` is NOT page/size paginated — it takes
// `limit` (default and max 5000) / `offset` and answers a bare array. The old
// helper sent `size=100&page=1` (silently dropped by FastAPI), so its
// "parallel pagination" branch was dead code, and when the branch filter
// returned 0 rows it re-fetched the WHOLE organisation's day (up to 5000 full
// rows) as a "fallback". Both are gone: one bounded, branch-scoped request.
const EVENTS_LIMIT = 5000;

export async function fetchAllAttendanceEvents(
  date: string,
  orgBranchId?: number,
): Promise<AttendancePage> {
  const params: Record<string, unknown> = { date_from: date, date_to: date, limit: EVENTS_LIMIT };
  if (orgBranchId) params.organization_branch_id = orgBranchId;
  const res = await apiClient.get(TURNSTILE_ATTENDANCE_EVENTS, { params });
  const raw = res.data as unknown;
  const items = (Array.isArray(raw) ? raw : ((raw as { items?: AttendanceEvent[] })?.items ?? [])) as AttendanceEvent[];
  return { items, total: items.length };
}

export function attendanceQueryKey(date: string, orgBranchId?: number) {
  return ['team-attendance', date, orgBranchId] as const;
}

// ── The day's ROSTER — server-computed statuses ─────────────────────────────
//
// `GET /turnstile-attendance-events/normalized` (the web EmployeeAttendancePage
// source): one row per employee with `attendance.calendar[date]` resolved by
// the backend (schedule, holidays, navbatchilik days off, leaves, trips,
// `ignore_lateness`, remote workers, lateness excuses). `supervised=true` =
// only my direct reports (server-side `supervisor_id`), which replaces the
// client "onlySubordinates" intersection over the whole roster.
//
// Max page is 500; a branch fits in one request, a whole-organisation view
// (a role without a branch) walks the remaining pages in parallel.
const ROSTER_PAGE = 500;
const PAGE_CONCURRENCY = 4;

interface NormalizedPage { items: EmployeeAttendance[]; total: number }

export async function fetchDayRoster(
  date: string,
  orgBranchId?: number,
  supervised = false,
): Promise<NormalizedPage> {
  const base: Record<string, unknown> = {
    date_from: date, date_to: date, size: ROSTER_PAGE, page: 1,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
    ...(supervised ? { supervised: true } : {}),
  };
  const first = (await apiClient.get<NormalizedPage>(TURNSTILE_ATTENDANCE_NORMALIZED, { params: base })).data;
  const items = first?.items ?? [];
  const total = first?.total ?? items.length;
  if (total <= ROSTER_PAGE) return { items, total };
  const pages = Array.from({ length: Math.ceil(total / ROSTER_PAGE) - 1 }, (_, i) => i + 2);
  const rest = await mapWithConcurrency(pages, PAGE_CONCURRENCY, (page) =>
    apiClient
      .get<NormalizedPage>(TURNSTILE_ATTENDANCE_NORMALIZED, { params: { ...base, page } })
      .then((r) => r.data?.items ?? []),
  );
  return { items: [...items, ...rest.flat()], total };
}

export function rosterQueryKey(date: string, orgBranchId?: number, supervised = false) {
  return ['team-roster', date, orgBranchId ?? null, supervised] as const;
}

// Shared by Home / Team / AttendanceDetail so the three screens read ONE cache
// entry per (date, branch, supervised).
export function dayRosterQuery(date: string, orgBranchId?: number, supervised = false) {
  return queryOptions({
    queryKey: rosterQueryKey(date, orgBranchId, supervised),
    queryFn: () => fetchDayRoster(date, orgBranchId, supervised),
    staleTime: 3 * 60 * 1000,
  });
}

// ── TODAY's roster — `/dashboard/employees-by-category` ─────────────────────
//
// Why a second source: `/normalized` narrows a REGULAR employee to "self +
// direct reports" (backend audit rule — the web tabel page is not shown to
// them at all), so on the phone the Home/Team roster collapsed to one row.
// The web EMPLOYEE dashboard, however, shows the whole branch for today from
// this endpoint (branch scope only). Same categories the web maps: late,
// vacation, trip, sick, dekret, other leave, day off, present, absent, plus
// `lateness_excused_employee_ids` and `still_inside_since`. 30 s server cache.
export function dayCategoriesQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: ['team-categories', orgBranchId ?? null] as const,
    queryFn: () =>
      apiClient
        .get<EmployeeCategories>(DASHBOARD_EMPLOYEES_BY_CATEGORY, {
          params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
        })
        .then((r) => r.data ?? {}),
    staleTime: 60 * 1000,
  });
}
