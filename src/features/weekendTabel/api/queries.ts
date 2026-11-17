import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WEEKEND_TABEL, WEEKEND_TABEL_ORDERS } from '@/api/urls';
import type { GridParams, WeekendGrid, WeekendOrder } from '../types';
import { gridQuery } from '../utils/weekend';

export const weekendKeys = {
  all: ['weekend-tabel'] as const,
  grid: (p: GridParams) => [...weekendKeys.all, 'grid', p] as const,
  orders: (year: number, month: number, branchId?: number) =>
    [...weekendKeys.all, 'orders', branchId ?? null, year, month] as const,
};

// Errors are handled on the screen (a 404 means the server has no such module yet), so no global toast.
const meta = { skipErrorToast: true };

export function weekendGridQuery(p: GridParams, enabled = true) {
  return queryOptions({
    queryKey: weekendKeys.grid(p),
    queryFn: () => apiClient.get<WeekendGrid>(WEEKEND_TABEL, { params: gridQuery(p) }).then((r) => r.data),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
    meta,
  });
}

/** Approved overtime orders that fall on rest days of the month. */
export function weekendOrdersQuery(year: number, month: number, branchId: number | undefined, enabled = true) {
  return queryOptions({
    queryKey: weekendKeys.orders(year, month, branchId),
    queryFn: () =>
      apiClient
        .get<WeekendOrder[]>(WEEKEND_TABEL_ORDERS, {
          params: { year, month, organization_branch_id: branchId || undefined },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled,
    retry: false,
    meta,
  });
}
