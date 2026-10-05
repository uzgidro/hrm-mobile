import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ZOOM_AVAILABILITY, ZOOM_CONFIG, ZOOM_LIVE, ZOOM_MEETINGS } from '@/api/urls';
import {
  canProbe,
  type ZoomAvailability,
  type ZoomConfig,
  type ZoomLiveSummary,
  type ZoomMeeting,
  type ZoomPage,
  type ZoomScope,
} from '../utils/zoom';

/**
 * Jonli holatni serverdan qayta so'rash oralig'i (v2 `ZOOM_LIVE_REFRESH_MS`). Qizil nuqtani
 * server webhook/poll'i to'g'rilaydi — bu faqat uni ekranga yetkazadi.
 * Mobil `apiClient` global filial qo'shmaydi — v2 dagi `organization_branch_id: null` kerak emas.
 */
export const ZOOM_REFRESH_MS = 15_000;
export const ZOOM_PAGE_SIZE = 20;

export const zoomKeys = {
  all: ['zoom'] as const,
  config: () => [...zoomKeys.all, 'config'] as const,
  list: (p: object) => [...zoomKeys.all, 'list', p] as const,
  live: () => [...zoomKeys.all, 'live'] as const,
  availability: (startAt: string | null, minutes: number) =>
    [...zoomKeys.all, 'availability', startAt, minutes] as const,
};

export function zoomConfigQuery() {
  return queryOptions({
    queryKey: zoomKeys.config(),
    queryFn: () => apiClient.get<ZoomConfig>(ZOOM_CONFIG).then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

/**
 * Ro'yxatda `host_key` ham keladi (faqat `can_manage` ga) — u keshda saqlanmaydi:
 * kod faqat «Hostlik kodi» mutatsiyasi bilan, so'ralgan paytda ko'rsatiladi.
 */
function stripSecrets(m: ZoomMeeting & { host_key?: unknown; host_key_at?: unknown }): ZoomMeeting {
  const { host_key: _k, host_key_at: _a, ...rest } = m;
  return rest;
}

/** v2 `useZoomMeetings`: kompaniya bo'yicha umumiy jadval; faol tab o'zini 15 s da yangilaydi (jonli nuqta). */
export function zoomMeetingsQuery(f: { scope: ZoomScope; status: string; search: string; page: number }) {
  const params: Record<string, string | number> = { scope: f.scope, page: f.page, size: ZOOM_PAGE_SIZE };
  if (f.status) params.status = f.status;
  const term = f.search.trim();
  if (term) params.search = term;
  return queryOptions({
    queryKey: zoomKeys.list(params),
    queryFn: () =>
      apiClient.get<ZoomPage>(ZOOM_MEETINGS, { params }).then((r): ZoomPage => ({
        items: (r.data?.items ?? []).map(stripSecrets),
        total: r.data?.total ?? 0,
        page: r.data?.page ?? f.page,
        size: r.data?.size ?? ZOOM_PAGE_SIZE,
      })),
    placeholderData: keepPreviousData,
    // Arxiv foydalanuvchi ostida o'zgarmaydi — faqat faol tab yangilanadi.
    refetchInterval: f.scope === 'active' ? ZOOM_REFRESH_MS : false,
  });
}

/** Hozir litsenziyada nima jonli — sarlavha chipi. Faqat `can_request` bo'lsa (server aks holda 403). */
export function zoomLiveQuery(enabled: boolean) {
  return queryOptions({
    queryKey: zoomKeys.live(),
    queryFn: () => apiClient.get<ZoomLiveSummary>(ZOOM_LIVE).then((r) => r.data),
    enabled,
    refetchInterval: ZOOM_REFRESH_MS,
    staleTime: 5_000,
    retry: false,
  });
}

/**
 * Tanlangan oraliq bo'shmi — forma to'ldirilayotganda (debounce qilingan qiymatlar bilan).
 * Eskirgan javob javobsizdan yomon: `staleTime: 0`. Rad etilgan so'rov formani to'smaydi:
 * `retry: false`, yakuniy hakam baribir yaratish so'rovi.
 */
export function zoomAvailabilityQuery(startAt: string | null, minutes: number, enabled = true) {
  return queryOptions({
    queryKey: zoomKeys.availability(startAt, minutes),
    queryFn: () =>
      apiClient
        .get<ZoomAvailability>(ZOOM_AVAILABILITY, { params: { start_at: startAt, duration_minutes: minutes } })
        .then((r) => r.data),
    enabled: enabled && canProbe(startAt, minutes),
    staleTime: 0,
    retry: false,
  });
}
