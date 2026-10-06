// Tanlagichlar uchun server sahifalash (2026-10-06): ilgari xodim tanlagichlari faqat 1-sahifani
// (30 / 100 ta) olib, qolgan xodimlar ro'yxatda umuman ko'rinmasdi («kesib tashlayapti»).
// `pagedListOptions` (infinite query) ustida: qidiruv serverda, oxiriga yetganda keyingi sahifa.
import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { EMPLOYEE_OPTIONS, EMPLOYEES_LIST } from '@/api/urls';
import type { Employee } from '@/types';
import type { EmployeeOptionRow } from '@/utils/employees';
import { flattenPages, pagedListOptions, pagesTotal, type ListParams } from './pagedList';

export const PICKER_PAGE_SIZE = 50;

export function useInfinitePicker<T>(opts: {
  queryKey: QueryKey;
  url: string;
  params?: ListParams;
  enabled?: boolean;
  size?: number;
}) {
  const q = useInfiniteQuery({
    ...pagedListOptions<T>({
      queryKey: opts.queryKey,
      url: opts.url,
      params: opts.params,
      size: opts.size ?? PICKER_PAGE_SIZE,
      staleTime: 2 * 60 * 1000,
    }),
    enabled: opts.enabled ?? true,
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => flattenPages(q.data?.pages), [q.data]);
  return {
    rows,
    total: pagesTotal(q.data?.pages),
    loading: q.isLoading || (q.isFetching && !q.isFetchingNextPage && rows.length === 0),
    loadingMore: q.isFetchingNextPage,
    onEndReached: () => {
      if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
    },
  };
}

/** Butun tashkilot bo'yicha yengil xodim tanlagichi (`/employees/options`, PII'siz). */
export function useEmployeeOptionsPicker(search: string, opts: { enabled?: boolean; orgBranchId?: number } = {}) {
  const q = search.trim();
  return useInfinitePicker<EmployeeOptionRow>({
    queryKey: ['employee-options', 'infinite', opts.orgBranchId ?? null, q],
    url: EMPLOYEE_OPTIONS,
    params: { search: q || undefined, organization_branch_id: opts.orgBranchId },
    enabled: opts.enabled,
  });
}

/**
 * Filial ko'lamidagi `/employees` tanlagichi — `useQuery` bilan bir xil shakl (`data`, `isFetching`,
 * `isLoading`) qaytaradi, ustiga `onEndReached` / `loadingMore`. Eski «size: 30» tanlagichlar
 * shu bilan almashtirildi (birinchi 30 xodimdan keyingilari ko'rinmasdi).
 */
export function useEmployeeListPicker(opts: {
  key: string;
  search: string;
  enabled: boolean;
  params?: ListParams;
}) {
  const q = opts.search.trim();
  const p = useInfinitePicker<Employee>({
    queryKey: [opts.key, 'employee-picker', 'infinite', q, opts.params ?? null],
    url: EMPLOYEES_LIST,
    params: { ...(opts.params ?? {}), search: q || undefined },
    enabled: opts.enabled,
  });
  return { data: p.rows, isFetching: p.loading, isLoading: p.loading, onEndReached: p.onEndReached, loadingMore: p.loadingMore };
}
