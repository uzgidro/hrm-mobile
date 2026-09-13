import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { EMPLOYEES_BIRTHDAYS } from '@/api/urls';
import type { EmployeeBirthday } from '@/types';

// Hierarchical query keys — `all` is a strict prefix of the list key, so
// invalidating `birthdayKeys.all` refreshes every branch's list in one call
// (prefix match). This is the per-feature queryOptions pattern (TkDodo): key +
// queryFn colocated so screens, prefetch and invalidation reference one source
// of truth.
export const birthdayKeys = {
  all: ['birthdays'] as const,
  list: (orgBranchId?: number) => [...birthdayKeys.all, 'list', orgBranchId ?? null] as const,
};

// The branch birthdays feed (`GET employees/birthdays`). Both dashboards (team's
// upcoming-birthdays card and the full birthdays screen) send
// `organization_branch_id` only when a branch is resolved, and both tolerate the
// bare-array vs `{ items }` envelope the endpoint may return — so one factory
// serves both. The birthdays screen additionally intersects the result with the
// user's subordinates client-side; that filtering stays in the screen.
export function birthdaysListQuery(
  orgBranchId?: number,
  opts: { search?: string; supervisorId?: number } = {},
) {
  const search = opts.search?.trim() || undefined;
  const supervisorId = opts.supervisorId;
  // The plain (unfiltered) key stays byte-for-byte `['birthdays','list',branch]`
  // so the Team/Home prefetch keeps sharing this cache entry.
  const filtered = search !== undefined || supervisorId !== undefined;
  return queryOptions({
    queryKey: filtered
      ? ([...birthdayKeys.list(orgBranchId), { search: search ?? null, supervisorId: supervisorId ?? null }] as const)
      : birthdayKeys.list(orgBranchId),
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_BIRTHDAYS, {
          params: {
            ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
            // Server search (name / position / department) and "only my team"
            // (`supervisor_id`, backend 2026-09-13) — the screen no longer
            // downloads the whole roster to intersect it in JS.
            ...(search ? { search } : {}),
            ...(supervisorId ? { supervisor_id: supervisorId } : {}),
          },
        })
        .then((r) => {
          const d = r.data;
          // The endpoint returns either a bare array or an { items } envelope.
          return (Array.isArray(d) ? d : (d?.items ?? [])) as EmployeeBirthday[];
        }),
    staleTime: 60 * 60 * 1000,
  });
}
