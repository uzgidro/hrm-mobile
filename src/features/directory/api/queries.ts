import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions, cleanParams } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { PhoneDirectoryEntry, OrganizationBranch } from '@/types';

// Phone book, fetched PER SCOPE and paged; search on the server (see
// `phoneDirectoryQuery`). Same per-feature queryOptions pattern as visitors.
export const directoryKeys = {
  all: ['phone-directory'] as const,
};

// Branch list — used to name the scope/branch filter and to find the executive
// ("Ijro apparati") branch. Shared cache key so it de-dupes with any other
// branch fetch. Rarely changes.
export function directoryBranchesQuery() {
  return queryOptions({
    queryKey: ['org-branches'] as const,
    queryFn: () =>
      apiClient
        .get<OrganizationBranch[] | { items?: OrganizationBranch[] }>(ORGANIZATION_BRANCHES)
        .then((r) => {
          const d = r.data as OrganizationBranch[] | { items?: OrganizationBranch[] } | null;
          return (Array.isArray(d) ? d : (d?.items ?? [])) as OrganizationBranch[];
        }),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Server-paged phone book (30 rows). Scope → `branch_id` (one branch) or
 * `exclude_branch_id` (every system branch = all but the head office);
 * search → server `search` over name / position / department / both numbers
 * (backend 2026-09-13, Cyrillic-Latin folding). The search runs over the
 * WHOLE organisation regardless of scope (user request 2026-09-07) — which
 * used to mean downloading all 2 321 rows (2.5 MB) as soon as two characters
 * were typed and filtering in JS.
 *
 * ATAYLAB `branch_id`, `organization_branch_id` EMAS — oxirgisini so'rov
 * qatlami har so'rovga o'zi qo'shadi va backend uni bu endpointda ataylab
 * e'tiborsiz qoldiradi.
 */
export interface DirectoryParams {
  branchId?: number | null;
  excludeBranchId?: number | null;
  search?: string;
}

export function phoneDirectoryQuery(p: DirectoryParams) {
  const search = p.search?.trim() || undefined;
  const params = search
    ? { search }
    : { branch_id: p.branchId ?? undefined, exclude_branch_id: p.excludeBranchId ?? undefined };
  return pagedListOptions<PhoneDirectoryEntry>({
    queryKey: [...directoryKeys.all, 'paged', cleanParams(params)] as const,
    url: PHONE_DIRECTORY,
    params,
    // The directory changes rarely; keep it warm across opens.
    staleTime: 10 * 60 * 1000,
  });
}
