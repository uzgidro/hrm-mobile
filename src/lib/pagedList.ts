// Server-paged lists. Every list endpoint that opts in with `page`/`size`
// answers with the `core.pagination.PageOut` envelope
// `{ items, total, page, size, pages }`; without those params it answers a
// bare array (the legacy shape). The helpers below are pure so they can be
// unit-tested without React (RNTL-14 rule: no hook tests).
//
// WHY (audit 2026-09-13): letters/orders/visitors/news were fetched WHOLE
// (~6-8.5 KB per row, 140k letters on PROD for a chancellery clerk) and then
// searched with `.includes` in JS — no Cyrillic/apostrophe folding, and the
// first paint waited for the entire payload. Paging 30 rows at a time and
// sending `search`/tab/status to the server fixes both.
import { infiniteQueryOptions, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface PageOut<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const PAGE_SIZE = 30;

/** Params that are `undefined`/`null`/`''`/`'all'` are dropped so the query
 *  key stays canonical and the server never receives an empty filter. */
export type ListParams = Record<string, string | number | boolean | null | undefined>;

export function cleanParams(params: ListParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === 'all') continue;
    out[k] = v;
  }
  return out;
}

/** Accepts the envelope OR a bare array (an older backend that ignores
 *  `page`/`size`), so a client update never breaks against a lagging API. */
export function unwrapPage<T>(data: unknown, page: number, size: number): PageOut<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length, page: 1, size: data.length, pages: 1 };
  }
  const d = (data ?? {}) as Partial<PageOut<T>>;
  const items = Array.isArray(d.items) ? d.items : [];
  const total = typeof d.total === 'number' ? d.total : items.length;
  return {
    items,
    total,
    page: d.page ?? page,
    size: d.size ?? size,
    pages: d.pages ?? (size > 0 ? Math.max(1, Math.ceil(total / size)) : 1),
  };
}

export function nextPageParam<T>(last: PageOut<T>): number | undefined {
  // A bare-array reply reports pages=1, so it never asks for a second page.
  return last.page < last.pages ? last.page + 1 : undefined;
}

export function flattenPages<T>(pages?: PageOut<T>[]): T[] {
  if (!pages || pages.length === 0) return [];
  return pages.flatMap((p) => p.items);
}

export function pagesTotal<T>(pages?: PageOut<T>[]): number | undefined {
  return pages && pages.length > 0 ? pages[0].total : undefined;
}

/**
 * Infinite-query factory for one server-paged list. Callers spread extra
 * options (staleTime, refetchInterval, enabled) after it.
 */
export function pagedListOptions<T>(opts: {
  queryKey: QueryKey;
  url: string;
  params?: ListParams;
  size?: number;
  staleTime?: number;
  refetchInterval?: number | false;
  enabled?: boolean;
  refetchOnMount?: boolean | 'always';
}) {
  const size = opts.size ?? PAGE_SIZE;
  const params = cleanParams(opts.params ?? {});
  return infiniteQueryOptions({
    queryKey: opts.queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiClient
        .get(opts.url, { params: { ...params, page: pageParam, size } })
        .then((r) => unwrapPage<T>(r.data, pageParam, size)),
    getNextPageParam: (last) => nextPageParam(last),
    staleTime: opts.staleTime,
    refetchInterval: opts.refetchInterval,
    enabled: opts.enabled,
    refetchOnMount: opts.refetchOnMount,
  });
}
