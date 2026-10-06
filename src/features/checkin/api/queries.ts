import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { retryUnlessMissing } from '@/api/errors';
import { MOBILE_CHECKINS, MOBILE_CHECKINS_ME, MOBILE_CHECKINS_ME_STATUS, MOBILE_CHECKIN_DETAIL } from '@/api/urls';
import type { CheckinStatus, MobileCheckin } from '../types';

export const CHECKIN_PAGE_SIZE = 20;

export const checkinKeys = {
  all: ['mobile-checkins'] as const,
  status: () => [...checkinKeys.all, 'status'] as const,
  mine: (p: object) => [...checkinKeys.all, 'mine', p] as const,
  hrList: (p: object) => [...checkinKeys.all, 'hr', p] as const,
  detail: (id: number) => [...checkinKeys.all, 'detail', id] as const,
};

type Page<T> = { items: T[]; total: number; pages: number };

/** `ListOrPage` javobi: `page` berilsa `{items,total,pages}`, aks holda massiv. */
export function toPage<T>(data: unknown): Page<T> {
  if (Array.isArray(data)) return { items: data as T[], total: data.length, pages: 1 };
  const d = (data ?? {}) as { items?: T[]; total?: number; pages?: number };
  const items = d.items ?? [];
  return { items, total: d.total ?? items.length, pages: d.pages ?? 1 };
}

/**
 * Bugun telefondan belgilay oladimi (FAQAT kadr vaqtinchalik buyruqdan qo'ygan xizmat safari),
 * safar manzili va bugungi belgilar. Bosh sahifa kartasi va «Keldim» ekrani shu bitta so'rovdan.
 * `enabled` — xodim kartasi bor hisob (admin/kiosk/mehmonga so'rov yuborilmaydi).
 */
export function checkinStatusQuery(enabled = true) {
  return queryOptions({
    queryKey: checkinKeys.status(),
    queryFn: () => apiClient.get<CheckinStatus>(MOBILE_CHECKINS_ME_STATUS).then((r) => r.data),
    enabled,
    staleTime: 60_000,
    // Kun almashishi / kadr safarni hozir qo'yishi — ilovaga qaytganda yangilanadi.
    refetchOnWindowFocus: true,
  });
}

export function myCheckinsQuery(f: { dateFrom: string; dateTo: string; page: number }) {
  const params = { date_from: f.dateFrom, date_to: f.dateTo, page: f.page, size: CHECKIN_PAGE_SIZE };
  return queryOptions({
    queryKey: checkinKeys.mine(params),
    queryFn: () => apiClient.get(MOBILE_CHECKINS_ME, { params }).then((r) => toPage<MobileCheckin>(r.data)),
    placeholderData: keepPreviousData,
  });
}

export type HrCheckinFilter = {
  dateFrom: string;
  dateTo: string;
  status: '' | 'active' | 'cancelled';
  farOnly: boolean;
  search: string;
  page: number;
};

/** Kadr ro'yxati — server ko'lami (o'z filiallari), qidiruv va filtrlar serverda. */
export function hrCheckinsQuery(f: HrCheckinFilter) {
  const params: Record<string, string | number | boolean> = {
    date_from: f.dateFrom,
    date_to: f.dateTo,
    page: f.page,
    size: CHECKIN_PAGE_SIZE,
  };
  if (f.status) params.status = f.status;
  if (f.farOnly) params.far_only = true;
  if (f.search.trim()) params.search = f.search.trim();
  return queryOptions({
    queryKey: checkinKeys.hrList(params),
    queryFn: () => apiClient.get(MOBILE_CHECKINS, { params }).then((r) => toPage<MobileCheckin>(r.data)),
    placeholderData: keepPreviousData,
  });
}

export function checkinDetailQuery(id: number) {
  return queryOptions({
    queryKey: checkinKeys.detail(id),
    queryFn: () => apiClient.get<MobileCheckin>(MOBILE_CHECKIN_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    retry: retryUnlessMissing,
  });
}
