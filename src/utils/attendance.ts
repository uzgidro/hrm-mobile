import { apiClient } from '../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS } from '../api/urls';
import { AttendanceEvent } from '../types';

interface AttendancePage { items: AttendanceEvent[]; total: number }

/**
 * Fetches all attendance events for a given date in parallel.
 * Page 1 is fetched first to get the total, remaining pages run in parallel.
 */
export async function fetchAllAttendanceEvents(
  date: string,
  orgBranchId?: number,
): Promise<AttendancePage> {
  const base: Record<string, unknown> = {
    date_from: date,
    date_to: date,
    size: 100,
    page: 1,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
  };

  const firstRes = await apiClient.get<AttendancePage>(TURNSTILE_ATTENDANCE_EVENTS, { params: base });
  const first = firstRes.data;

  if (!first?.items) return { items: [], total: 0 };
  if (first.total <= 100) return first;

  const totalPages = Math.ceil(first.total / 100);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      apiClient
        .get<AttendancePage>(TURNSTILE_ATTENDANCE_EVENTS, { params: { ...base, page: i + 2 } })
        .then((r) => r.data?.items ?? []),
    ),
  );
  const items = [...first.items, ...rest.flat()];
  return { items, total: items.length };
}

/** Shared query key so both team.tsx and attendance-detail.tsx share the same cache. */
export function attendanceQueryKey(date: string, orgBranchId?: number) {
  return ['team-attendance', date, orgBranchId] as const;
}
