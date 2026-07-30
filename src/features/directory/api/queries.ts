import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { PhoneDirectoryEntry, OrganizationBranch } from '@/types';

// One flat, unscoped query — the whole company phone book. Search/filter is
// client-side (see PhoneDirectoryScreen). Same per-feature queryOptions pattern
// as visitors.
export const directoryKeys = { all: ['phone-directory'] as const };

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

export function phoneDirectoryQuery() {
  return queryOptions({
    queryKey: directoryKeys.all,
    queryFn: () =>
      apiClient
        .get<PhoneDirectoryEntry[] | { items: PhoneDirectoryEntry[] }>(PHONE_DIRECTORY)
        .then((r) => {
          const d = r.data as PhoneDirectoryEntry[] | { items?: PhoneDirectoryEntry[] } | null;
          if (Array.isArray(d)) return d;
          return d?.items ?? [];
        }),
    // The directory changes rarely; keep it warm across opens.
    staleTime: 10 * 60 * 1000,
  });
}
