import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { ADMINS, EMPLOYEES_LIST, MULTI_MODAL_USERS, ORGANIZATION_BRANCHES } from '@/api/urls';
import {
  USERS_PAGE_SIZE,
  toPaged,
  type AdminRow,
  type EmployeeAccountRow,
  type KioskUser,
  type MultiOrgRow,
  type Paged,
} from '../utils/users';

export interface ListArgs {
  search: string;
  page: number;
  /** `null` — barcha filiallar (v2 global filial tanlagichi bo'sh). */
  branchId: number | null;
}

export const usersKeys = {
  all: ['users-admin'] as const,
  accounts: (a: ListArgs) => [...usersKeys.all, 'accounts', a] as const,
  admins: () => [...usersKeys.all, 'admins'] as const,
  multiOrg: (a: ListArgs) => [...usersKeys.all, 'multi-org', a] as const,
  kiosk: (branchId: number | null) => [...usersKeys.all, 'kiosk', branchId] as const,
  branches: () => [...usersKeys.all, 'branches'] as const,
};

const listParams = (a: ListArgs) => ({
  page: a.page,
  size: USERS_PAGE_SIZE,
  ...(a.search.trim() ? { search: a.search.trim() } : {}),
  ...(a.branchId ? { organization_branch_id: a.branchId } : {}),
});

/** Xodim HISOBLARI — faollik shu yerdan boshqariladi. 403 — tab «ruxsat yo'q» (v2 `retry: false`). */
export function accountsQuery(a: ListArgs) {
  return queryOptions({
    queryKey: usersKeys.accounts(a),
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, { params: listParams(a) })
        .then((r): Paged<EmployeeAccountRow> => toPaged(r.data, USERS_PAGE_SIZE)),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** Administrator hisoblari — v2 bitta so'rov, 200 tagacha (filial tanlagichiga bog'liq emas). */
export function adminsQuery() {
  return queryOptions({
    queryKey: usersKeys.admins(),
    queryFn: () => apiClient.get(ADMINS, { params: { page: 1, size: 200 } }).then((r) => unwrapList<AdminRow>(r.data)),
    retry: false,
  });
}

/**
 * ROL VAKILLARI — filial filtri M2M biriktirish bo'yicha (`include_multi_org`), uy filiali emas:
 * to'rt stansiyani qamragan o'rinbosar to'rttasida ham chiqadi (v2 MultiOrgTab).
 */
export function multiOrgQuery(a: ListArgs) {
  return queryOptions({
    queryKey: usersKeys.multiOrg(a),
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, { params: { is_multi_org_user: true, include_multi_org: true, ...listParams(a) } })
        .then((r): Paged<MultiOrgRow> => toPaged(r.data, USERS_PAGE_SIZE)),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** Kiosk hisoblari — sahifasiz massiv; id siz qatorlar tashlanadi (v2). */
export function kioskUsersQuery(branchId: number | null) {
  return queryOptions({
    queryKey: usersKeys.kiosk(branchId),
    queryFn: () =>
      apiClient
        .get(MULTI_MODAL_USERS, { params: branchId ? { organization_branch_id: branchId } : {} })
        .then((r) => unwrapList<KioskUser>(r.data).filter((k): k is KioskUser & { id: number } => k.id != null)),
    retry: false,
  });
}

export function usersBranchesQuery() {
  return queryOptions({
    queryKey: usersKeys.branches(),
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    staleTime: 10 * 60_000,
  });
}
