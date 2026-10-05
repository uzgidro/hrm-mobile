import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { ORGANIZATION_BRANCHES, REGISTRATIONS } from '@/api/urls';
import {
  REG_PAGE_SIZE,
  registrationParams,
  type RegistrationFilter,
  type RegistrationRow,
  type RegistrationsPage,
} from '../utils/registrations';

export const registrationsKeys = {
  all: ['registrations'] as const,
  list: (p: object) => [...registrationsKeys.all, 'list', p] as const,
  branches: () => [...registrationsKeys.all, 'branches'] as const,
};

/** Tizim administratori uchun (server `require_system_admin`); 403 ni qayta so'rash befoyda (v2 `retry: false`). */
export function registrationsQuery(status: RegistrationFilter, search: string, page: number) {
  const params = registrationParams(status, search, page);
  return queryOptions({
    queryKey: registrationsKeys.list(params),
    queryFn: () =>
      apiClient.get<Partial<RegistrationsPage>>(REGISTRATIONS, { params }).then((r): RegistrationsPage => ({
        items: unwrapList<RegistrationRow>(r.data),
        total: r.data?.total ?? 0,
        pages: r.data?.pages ?? Math.max(1, Math.ceil((r.data?.total ?? 0) / REG_PAGE_SIZE)),
      })),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function regBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: registrationsKeys.branches(),
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}
