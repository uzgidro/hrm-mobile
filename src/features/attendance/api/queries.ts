import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_LEAVES } from '@/api/urls';
import { fetchAllAttendanceEvents, attendanceQueryKey } from '@/utils/attendance';
import type { WorkLeave } from '@/types';

// Per-feature queryOptions factories for the attendance-centric dashboards
// (team, attendance-detail). These screens COMPOSE several domains — employees,
// attendance, leaves, birthdays — so this file only owns the two pieces that are
// truly attendance-shaped (the day's turnstile events and the team leaves feed).
// The employees roster and the birthdays feed keep their own shared/feature keys.
//
// NOTE on `attendanceKeys.day`: the attendance LIST is keyed by the shared
// `attendanceQueryKey(date, orgBranchId)` from `@/utils/attendance`, NOT by a
// forked feature key. The home-tab prefetch (`app/(tabs)/index.tsx`), team and
// attendance-detail all read/prefetch that same key to share one cached day of
// events. `dayAttendanceQuery` below reuses `attendanceQueryKey` verbatim so the
// cross-screen cache stays shared; `attendanceKeys.day` mirrors it for
// parity/invalidation convenience — do NOT swap the factory onto it.
export const attendanceKeys = {
  all: ['team-attendance'] as const,
  day: (date: string, orgBranchId?: number) => attendanceQueryKey(date, orgBranchId),
};

// The day's attendance events — wraps the shared, parallel-paginated
// `fetchAllAttendanceEvents` helper and reuses the shared `attendanceQueryKey`
// so the cache is shared with every screen that reads it (home prefetch, team,
// attendance-detail). Returns the `{ items, total }` page shape the screens
// destructure via `.data?.items`. Do NOT fork this key.
export function dayAttendanceQuery(date: string, orgBranchId?: number) {
  return queryOptions({
    queryKey: attendanceQueryKey(date, orgBranchId),
    queryFn: () => fetchAllAttendanceEvents(date, orgBranchId),
    staleTime: 3 * 60 * 1000,
  });
}

// The dashboards' team-leaves feed (`WORK_LEAVES?size=N`). Cross-feature imports
// are disallowed by the features boundary rule (see `src/features/README.md`),
// so instead of importing `leaveKeys` from the leaves feature we key this under
// the SAME `'work-leaves'` root that `leaveKeys.all` produces. That keeps
// leave-sign / leave-reject invalidations — which call
// `invalidateQueries(['work-leaves'])` — prefix-matching these dashboard queries,
// so approving a request on the leave-detail screen refreshes the team /
// attendance-detail feeds too. The `dateKey` segment preserves the original
// per-date cache separation the screens used (`['team-leaves', date]`).
export function teamLeavesQuery(dateKey: string, size: number) {
  return queryOptions({
    queryKey: ['work-leaves', 'team', dateKey] as const,
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { size } }).then((r) => {
        const d = r.data as any;
        // The list endpoint returns either a bare array or an { items } envelope.
        return (Array.isArray(d) ? d : (d?.items ?? [])) as WorkLeave[];
      }),
    staleTime: 2 * 60 * 1000,
  });
}
