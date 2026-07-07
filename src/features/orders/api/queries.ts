import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS,
  ORDER_ACT_DETAIL,
  ORDER_ACT_CATEGORIES,
  DEPARTMENTS_LIST,
  EMPLOYEES_LIST,
  ORGANIZATION_BRANCH_LEADERS,
} from '@/api/urls';
import { fetchAllEmployees } from '@/utils/employees';
import type { Employee, OrderAct, OrderActCategory } from '@/types';

// Hierarchical query keys.
//
// `all` is deliberately `['order-acts']` (NOT a fresh namespace): the old tab
// and create-order screens invalidate/read `['order-acts']` directly, so
// keeping `all` equal to that string means those existing prefix invalidations
// still match every list AND any open detail. The list key is
// `['order-acts', orgBranchId]` — byte-for-byte the old tab key — so the tab's
// cache identity and refetchInterval are unchanged. The old detail lived under
// a separate `['order-detail', id]` tree; it now lives under `all` so a single
// `invalidateQueries({ queryKey: orderKeys.all })` from the decree workflow
// refreshes the list AND the open detail in one call.
export const orderKeys = {
  all: ['order-acts'] as const,
  list: (orgBranchId?: number) => [...orderKeys.all, orgBranchId ?? null] as const,
  detail: (id: number) => [...orderKeys.all, 'detail', id] as const,
};

// The list endpoint returns either a bare array or a { items } envelope.
function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}

// The list tab. Key/params mirror the old tab query exactly.
export function ordersListQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: orderKeys.list(orgBranchId),
    queryFn: () =>
      apiClient
        .get(ORDER_ACTS, { params: orgBranchId ? { organization_branch_id: orgBranchId } : {} })
        .then((r) => unwrapList<OrderAct>(r.data)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function orderDetailQuery(id: number) {
  return queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient.get<OrderAct>(ORDER_ACT_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Decree state must reflect the server on every open — another signer in the
    // approval chain may have acted. Override the global staleTime.
    refetchOnMount: 'always',
  });
}

// ── Create-order dropdown queries ────────────────────────────────────────────
// These read-only lookups keep the old inline keys so they share the same cache
// entries as before the migration.

export function orderCategoriesQuery(creatorRole: 'hr' | 'employee') {
  return queryOptions({
    queryKey: ['order-act-categories', creatorRole] as const,
    queryFn: () =>
      apiClient
        .get<OrderActCategory[]>(ORDER_ACT_CATEGORIES, { params: { creator_role: creatorRole } })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function orderEmployeesQuery(branchId?: number) {
  return queryOptions({
    queryKey: ['create-order-employees', branchId] as const,
    queryFn: () => fetchAllEmployees(branchId),
    staleTime: 5 * 60 * 1000,
  });
}

export function orderDepartmentsQuery(branchId?: number) {
  return queryOptions({
    queryKey: ['departments', branchId] as const,
    queryFn: () =>
      apiClient
        .get(DEPARTMENTS_LIST, { params: branchId ? { organization_branch_id: branchId } : {} })
        .then((r) => unwrapList<{ id: number; name: string }>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

// Rahbariyat (leadership) — barcha buyruqlar uchun kerak (web bilan bir xil).
// 1) Filialga belgilangan rahbarlar bo'lsa — shular. 2) Aks holda: "raisi"
//    lavozimidagilar + ministr roli (maslahatchilar chiqarib tashlanadi).
export function orderLeadershipQuery(branchId?: number) {
  return queryOptions({
    queryKey: ['order-leadership', branchId] as const,
    enabled: !!branchId,
    queryFn: async () => {
      if (branchId) {
        const branchLeaders = await apiClient
          .get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then((r) =>
            (Array.isArray(r.data) ? r.data : [])
              .map((l: { employee?: Employee }) => l.employee)
              .filter(Boolean) as Employee[]
          )
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      const [raisiRes, ministrRes] = await Promise.all([
        apiClient
          .get(EMPLOYEES_LIST, {
            params: {
              job_position_name_search: 'raisi',
              size: 50,
              ...(branchId ? { organization_branch_id: branchId } : {}),
            },
          })
          .then((r) => unwrapList<Employee>(r.data)),
        apiClient
          .get(EMPLOYEES_LIST, { params: { multi_org_employee_role: 'ministr', size: 10 } })
          .then((r) => unwrapList<Employee>(r.data))
          .catch(() => [] as Employee[]),
      ]);
      const base = raisiRes.filter((e) => {
        const pos =
          (typeof e.job_position === 'object' ? e.job_position?.name : (e.job_position as unknown as string)) || '';
        return !pos.toLowerCase().includes('maslahatch');
      });
      const ids = new Set(base.map((e) => e.id));
      ministrRes.forEach((e) => {
        if (!ids.has(e.id)) base.push(e);
      });
      return base;
    },
    staleTime: 5 * 60 * 1000,
  });
}
