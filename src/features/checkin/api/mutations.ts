import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MOBILE_CHECKINS, MOBILE_CHECKIN_CANCEL } from '@/api/urls';
import type { CheckinCreateBody, MobileCheckin } from '../types';
import { checkinKeys } from './queries';

export const createCheckin = (body: CheckinCreateBody) =>
  apiClient.post<MobileCheckin>(MOBILE_CHECKINS, body).then((r) => r.data);

/** Kadr: davomatdagi hodisa o'chadi, belgi «bekor qilingan» bo'lib qoladi. Sabab 3..1000 belgi. */
export const cancelCheckin = (id: number, reason: string) =>
  apiClient.post<MobileCheckin>(MOBILE_CHECKIN_CANCEL(id), { reason: reason.trim() }).then((r) => r.data);

/** Belgidan keyin davomat ham o'zgaradi — bosh sahifa va davomat keshlari ham yangilanadi. */
export function useInvalidateCheckins() {
  const qc = useQueryClient();
  // Barqaror (useCallback) — navbat hook'ining effekt bog'liqligida; har renderda yangi funksiya
  // effektni qayta ishga tushirib cheksiz render beradi.
  return useCallback(
    () =>
      Promise.all(
        [checkinKeys.all, ['attendance'], ['dashboard']].map((queryKey) =>
          qc.invalidateQueries({ queryKey: [...queryKey] }),
        ),
      ),
    [qc],
  );
}

export function useCancelCheckin() {
  const onSuccess = useInvalidateCheckins();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelCheckin(id, reason),
    onSuccess,
  });
}
