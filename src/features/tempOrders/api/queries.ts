// Vaqtinchalik buyruqlar ro'yxati — v2 `useTempOrders` (work-leaves/hr-list).
import { queryOptions, keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ORGANIZATION_BRANCHES, WORK_LEAVES_HR_LIST } from '@/api/urls';
import { unwrapList } from '@/api/response';

export type TempOrder = {
  id: number;
  employee?: { id?: number; legal_name?: string | null; photo_thumb_path?: string | null; photo_path?: string | null } | null;
  employee_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  type?: string | null;
  /** Xizmat safari manzili (backend 2026-10-06, WorkLeaveReadFull). */
  destination_branch?: { id: number; name?: string | null } | null;
  description?: string | null;
  status?: string | null;
};

export type TempOrderPage = { items: TempOrder[]; total: number; pages: number };

export const PAGE_SIZE = 50;

export const tempOrderKeys = {
  all: ['temp-orders'] as const,
  list: (p: { search: string; type: string | null; page: number; branchId: number | undefined }) =>
    ['temp-orders', 'list', p.search, p.type, p.page, p.branchId ?? null] as const,
};

export function tempOrdersQuery(p: { search: string; type: string | null; page: number; branchId: number | undefined }) {
  return queryOptions({
    queryKey: tempOrderKeys.list(p),
    queryFn: async (): Promise<TempOrderPage> => {
      const r = await apiClient.get(WORK_LEAVES_HR_LIST, {
        params: {
          page: p.page,
          size: PAGE_SIZE,
          ...(p.branchId ? { organization_branch_id: p.branchId } : {}),
          ...(p.search ? { search: p.search } : {}),
          ...(p.type ? { type: p.type } : {}),
        },
      });
      const d = r.data;
      if (Array.isArray(d)) return { items: d, total: d.length, pages: 1 };
      return { items: d?.items ?? [], total: d?.total ?? 0, pages: d?.pages ?? 1 };
    },
    placeholderData: keepPreviousData,
  });
}

/** Filiallar (xizmat safari manzili tanlagichi) — kam o'zgaradi, 10 daqiqa kesh. */
export function useBranchOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['temp-orders', 'branch-options'],
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}
