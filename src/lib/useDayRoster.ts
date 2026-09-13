// One day's attendance roster for the Home / Team / Attendance-detail screens.
//
// TODAY  → `/dashboard/employees-by-category` (the web employee dashboard's
//          source: whole branch for every role, categories resolved by the
//          server) + the day's raw events for entry/exit times.
// PAST   → `/turnstile-attendance-events/normalized` (calendar codes; the
//          server narrows a regular employee to own people — same rule as
//          the web tabel page).
// "Faqat bo'ysunuvchilar" is applied client-side today (ids from one small
// `/employees?supervisor_id=me` request) and server-side (`supervised`) for
// past days.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dayCategoriesQuery, dayRosterQuery, fetchAllAttendanceEvents, attendanceQueryKey } from '@/utils/attendance';
import { subordinateIdsQuery } from '@/utils/employees';
import {
  buildRosterFromCategories, buildRosterFromNormalized, filterRoster, type AttendanceRoster,
} from '@/utils/attendanceRoster';
import type { AttendanceEvent } from '@/types';

const EMPTY: AttendanceRoster = { rows: [], counts: { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 } };

export function useDayRoster(opts: {
  date: string;
  orgBranchId?: number;
  onlySubordinates: boolean;
  myId?: number;
  enabled?: boolean;
}) {
  const enabled = opts.enabled ?? true;
  const isToday = opts.date === dayjs().format('YYYY-MM-DD');
  const wantSubs = opts.onlySubordinates && !!opts.myId;

  const catsQ = useQuery({ ...dayCategoriesQuery(opts.orgBranchId), enabled: enabled && isToday });
  const normQ = useQuery({ ...dayRosterQuery(opts.date, opts.orgBranchId, wantSubs), enabled: enabled && !isToday });
  const eventsQ = useQuery({
    queryKey: attendanceQueryKey(opts.date, opts.orgBranchId),
    queryFn: () => fetchAllAttendanceEvents(opts.date, opts.orgBranchId),
    staleTime: 3 * 60 * 1000,
    enabled,
  });
  const subsQ = useQuery({ ...subordinateIdsQuery(opts.myId), enabled: enabled && isToday && wantSubs });

  const roster = useMemo(() => {
    const events: AttendanceEvent[] = eventsQ.data?.items ?? [];
    if (isToday) {
      if (!catsQ.data) return EMPTY;
      const full = buildRosterFromCategories(catsQ.data, events);
      return wantSubs ? filterRoster(full, subsQ.data ?? new Set<number>()) : full;
    }
    return buildRosterFromNormalized(normQ.data?.items ?? [], opts.date, events);
  }, [isToday, catsQ.data, normQ.data, eventsQ.data, subsQ.data, wantSubs, opts.date]);

  const primary = isToday ? catsQ : normQ;
  return {
    roster,
    /** Total in scope from the server (past days may page). */
    total: isToday ? roster.counts.total : (normQ.data?.total ?? roster.counts.total),
    isLoading: primary.isLoading || eventsQ.isLoading || (isToday && wantSubs && subsQ.isLoading),
    isError: primary.isError,
    error: primary.error,
    isFetching: primary.isFetching || eventsQ.isFetching,
    refetch: () => { void primary.refetch(); void eventsQ.refetch(); },
  };
}
