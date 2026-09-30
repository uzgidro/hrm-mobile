// KPP posti so'rovlari — web v2 `features/kpp/useKpp.ts` bilan bir xil manbalar.
import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { VISITORS_LIST, VISITOR_TURNSTILE_ATTENDANCE } from '@/api/urls';
import type { Visitor } from '@/types';

export type VisitFilter = 'all' | 'today' | 'yesterday' | 'never';

export type VisitorPass = {
  id?: number;
  event_id?: number | string;
  visitor_id?: number;
  happen_time?: string;
  direction_type?: string;
  visitor?: { id?: number; legal_name?: string | null; photo_path?: string | null } | null;
  turnstile?: { display_name?: string | null; acs_dev_name?: string | null } | null;
};

export const kppKeys = {
  all: ['kpp'] as const,
  visitors: (search: string, visit: VisitFilter, branchId: number | undefined) =>
    ['kpp', 'visitors', search, visit, branchId ?? null] as const,
  events: (day: string, visitorId: number | null) => ['kpp', 'events', day, visitorId] as const,
};

export function kppVisitorsQuery({ search, visit, branchId }: { search: string; visit: VisitFilter; branchId: number | undefined }) {
  return queryOptions({
    queryKey: kppKeys.visitors(search, visit, branchId),
    queryFn: () =>
      apiClient
        .get(VISITORS_LIST, {
          params: {
            ...(search ? { search } : {}),
            ...(visit !== 'all' ? { visit } : {}),
            ...(branchId ? { organization_branch_id: branchId } : {}),
            size: 200,
          },
        })
        .then((r) => unwrapList<Visitor>(r.data)),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
}

export function visitorEventsQuery(day: string, visitorId: number | null) {
  return queryOptions({
    queryKey: kppKeys.events(day, visitorId),
    queryFn: () =>
      apiClient
        .get(VISITOR_TURNSTILE_ATTENDANCE, {
          params: { date_from: day, date_to: day, ...(visitorId ? { visitor_id: visitorId } : {}) },
        })
        .then((r) => unwrapList<VisitorPass>(r.data)),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
}
