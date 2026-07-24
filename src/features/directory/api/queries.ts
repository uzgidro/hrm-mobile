import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY } from '@/api/urls';
import type { PhoneDirectoryEntry } from '@/types';

// One flat, unscoped query — the whole company phone book. Search/filter is
// client-side (see PhoneDirectoryScreen). Same per-feature queryOptions pattern
// as visitors.
export const directoryKeys = { all: ['phone-directory'] as const };

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
