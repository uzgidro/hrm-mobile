import { apiClient } from '../api/client';
import { TURNSTILE_ATTENDANCE_EVENTS } from '../api/urls';
import { AttendanceEvent } from '../types';

interface AttendancePage { items: AttendanceEvent[]; total: number }

async function paginatedFetch(params: Record<string, unknown>): Promise<AttendancePage> {
  const firstRes = await apiClient.get(TURNSTILE_ATTENDANCE_EVENTS, { params });
  const raw = firstRes.data as any;

  // Handle plain array response (API sometimes returns array without pagination wrapper)
  if (Array.isArray(raw)) return { items: raw as AttendanceEvent[], total: raw.length };
  if (!raw?.items) return { items: [], total: 0 };
  if (raw.total <= 100) return { items: raw.items, total: raw.total };

  // Parallel pagination for remaining pages (cap at 20 pages = 2000 events)
  const totalPages = Math.min(Math.ceil(raw.total / 100), 20);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      apiClient
        .get(TURNSTILE_ATTENDANCE_EVENTS, { params: { ...params, page: i + 2 } })
        .then((r) => {
          const d = r.data as any;
          return ((Array.isArray(d) ? d : d?.items) ?? []) as AttendanceEvent[];
        })
        .catch(() => [] as AttendanceEvent[]),
    ),
  );
  const items = [...raw.items, ...rest.flat()];
  return { items, total: raw.total };
}

/**
 * Fetches attendance events for a given date.
 * Strategy: try with organization_branch_id first (fast, scoped).
 * If 0 results, fallback to no filter — empIdSet in team.tsx/attendance-detail.tsx
 * cross-references to only count the correct branch employees.
 * This handles cases where turnstile events have no organization_branch_id set.
 */
export async function fetchAllAttendanceEvents(
  date: string,
  orgBranchId?: number,
): Promise<AttendancePage> {
  const base: Record<string, unknown> = { date_from: date, date_to: date, size: 100, page: 1 };

  if (orgBranchId) {
    const result = await paginatedFetch({ ...base, organization_branch_id: orgBranchId });
    if (result.items.length > 0) return result;
    // 0 events with branch filter → events may lack organization_branch_id (BFD/MCHJ case)
  }

  // Fallback: all events for the date — empIdSet cross-reference handles branch scoping
  return paginatedFetch(base);
}

export function attendanceQueryKey(date: string, orgBranchId?: number) {
  return ['team-attendance', date, orgBranchId] as const;
}
