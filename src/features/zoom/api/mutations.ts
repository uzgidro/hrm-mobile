import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ZOOM_MEETING,
  ZOOM_MEETING_APPROVE,
  ZOOM_MEETING_HOST_KEY,
  ZOOM_MEETING_REJECT,
  ZOOM_MEETING_START,
  ZOOM_MEETING_START_URL,
  ZOOM_MEETINGS,
} from '@/api/urls';
import type { ZoomMeeting, ZoomStartResult, buildCreateBody } from '../utils/zoom';
import { stripSecrets, zoomKeys } from './queries';

export type ZoomCreateBody = ReturnType<typeof buildCreateBody>;

export const createZoomMeeting = (body: ZoomCreateBody) =>
  apiClient.post<ZoomMeeting>(ZOOM_MEETINGS, body).then((r) => stripSecrets(r.data));

/** v2 `update` (PATCH). v2 sahifasi tahrir formasini ko'rsatmaydi — mobil ham (paritet). */
export const updateZoomMeeting = ({ id, body }: { id: number; body: Partial<ZoomCreateBody> }) =>
  apiClient.patch<ZoomMeeting>(ZOOM_MEETING(id), body).then((r) => stripSecrets(r.data));

export const approveZoomMeeting = (id: number) =>
  apiClient.post<ZoomMeeting>(ZOOM_MEETING_APPROVE(id), {}).then((r) => stripSecrets(r.data));

export const rejectZoomMeeting = ({ id, reason }: { id: number; reason: string }) =>
  apiClient.post<ZoomMeeting>(ZOOM_MEETING_REJECT(id), { reason: reason.trim() }).then((r) => stripSecrets(r.data));

/** Boshlanmagan — Zoom'dan o'chiriladi (cancelled); boshlangan — yakunlanadi (ended). Seriyada faqat shu kun. */
export const cancelZoomMeeting = (id: number) =>
  apiClient.delete<ZoomMeeting>(ZOOM_MEETING(id)).then((r) => stripSecrets(r.data));

/** Takroriy seriyaning qolgan barcha kunlari; Zoom'dagi yig'ilish (havola) o'chiriladi. */
export const cancelZoomSeries = (id: number) =>
  apiClient.delete<ZoomMeeting>(ZOOM_MEETING(id), { params: { scope: 'series' } }).then((r) => stripSecrets(r.data));

/**
 * «Boshlash»: server JONLI litsenziya sonini tekshiradi, so'ralgan yozuvni yoqadi (yagona
 * payt) va yangi host havolasini beradi. Havola parolsiz host qiladi — shuning uchun query
 * emas, mutatsiya: hech qachon keshlanmaydi (`gcTime: 0` — mutatsiya keshida ham qolmaydi).
 */
export const startZoomMeeting = (id: number) =>
  apiClient.post<ZoomStartResult>(ZOOM_MEETING_START(id), {}).then((r) => r.data);

/** Faqat host havolasi (v2 `startUrl`) — xuddi shu maxfiylik qoidasi. */
export const fetchZoomStartUrl = (id: number) =>
  apiClient.get<{ start_url: string }>(ZOOM_MEETING_START_URL(id)).then((r) => r.data);

/** Yig'ilish ichida «Claim Host» kodi. Akkaunt bo'yicha bitta: yangisi avvalgisini bekor qiladi. */
export const issueZoomHostKey = (id: number) =>
  apiClient.post<{ host_key: string; hint?: string }>(ZOOM_MEETING_HOST_KEY(id), {}).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: zoomKeys.all });
}

const meta = { skipErrorToast: true };
// Javobdagi yig'ilish `host_key` siz (stripSecrets) va mutatsiya keshida ham qolmaydi.
const noCache = { meta, gcTime: 0 };

export function useCreateZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: createZoomMeeting, onSuccess });
}
export function useUpdateZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: updateZoomMeeting, onSuccess });
}
export function useApproveZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: approveZoomMeeting, onSuccess });
}
export function useRejectZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: rejectZoomMeeting, onSuccess });
}
export function useCancelZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: cancelZoomMeeting, onSuccess });
}
export function useCancelZoomSeries() {
  const onSuccess = useInvalidate();
  return useMutation({ ...noCache, mutationFn: cancelZoomSeries, onSuccess });
}
export function useStartZoomMeeting() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, gcTime: 0, mutationFn: startZoomMeeting, onSuccess });
}
export function useZoomStartUrl() {
  return useMutation({ meta, gcTime: 0, mutationFn: fetchZoomStartUrl });
}
export function useZoomHostKey() {
  return useMutation({ meta, gcTime: 0, mutationFn: issueZoomHostKey });
}
