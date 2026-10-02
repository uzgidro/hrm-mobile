import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { VIDEO_GUIDES } from '@/api/urls';

/** v2 `useVideoGuides.ts` `VideoGuide` — rol va filial bo'yicha serverda filtrlangan. */
export interface VideoGuide {
  id: number;
  title: string;
  description?: string | null;
  page_key?: string;
  duration_seconds?: number | null;
  view_count: number;
  video_url?: string | null;
}

export const videoGuideKeys = { all: ['video-guides'] as const };

export function videoGuidesQuery() {
  return queryOptions({
    queryKey: videoGuideKeys.all,
    queryFn: () => apiClient.get(VIDEO_GUIDES).then((r) => unwrapList<VideoGuide>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

/** Ko'rish hisoblagichi: xato foydalanuvchiga ko'rsatilmaydi — video baribir ochiladi. */
export function trackVideoView(id: number): Promise<void> {
  return apiClient
    .post(`${VIDEO_GUIDES}/${id}/view`, {})
    .then(() => undefined)
    .catch(() => undefined);
}
