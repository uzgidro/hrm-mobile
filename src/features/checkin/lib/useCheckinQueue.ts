// Navbat holati bosh sahifa kartasi va «Keldim» ekrani o'rtasida umumiy (zustand). Navbat
// ilova oldinga chiqqanda va karta ko'ringanda yuboriladi; yuborilgach davomat keshi yangilanadi.
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/api/errors';
import { useInvalidateCheckins } from '../api/mutations';
import { flushQueue, readQueue, type QueuedCheckin } from './queue';

type QueueState = { pending: QueuedCheckin[]; setPending: (p: QueuedCheckin[]) => void };

const sameQueue = (a: QueuedCheckin[], b: QueuedCheckin[]) =>
  a.length === b.length && a.every((x, i) => x.body.client_uuid === b[i]?.body.client_uuid);

export const useQueueStore = create<QueueState>((set, get) => ({
  pending: [],
  // O'zgarmagan navbat — yangi massiv bilan qayta render qilinmasin.
  setPending: (pending) => {
    if (!sameQueue(get().pending, pending)) set({ pending });
  },
}));

export async function reloadPending(): Promise<void> {
  useQueueStore.getState().setPending(await readQueue());
}

/** `active` — faqat xodim kartasi bor va safar holati yuklangan joyda yoqiladi. */
export function useCheckinQueue(active: boolean) {
  const { t } = useTranslation();
  const pending = useQueueStore((s) => s.pending);
  const invalidate = useInvalidateCheckins();

  const flush = useCallback(async () => {
    const q = await readQueue();
    useQueueStore.getState().setPending(q);
    if (!q.length) return;
    const res = await flushQueue();
    await reloadPending();
    if (res.sent.length) {
      toast.success(t('checkin.queueSent', { count: res.sent.length }));
      void invalidate();
    }
    for (const f of res.failed) {
      const msg = f.error instanceof Error && f.error.message === 'too_old'
        ? t('checkin.queueTooOld')
        : getApiErrorMessage(f.error, t('checkin.sendFailed'));
      toast.error(msg);
    }
  }, [invalidate, t]);

  useEffect(() => {
    if (!active) return;
    void flush();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void flush();
    });
    return () => sub.remove();
  }, [active, flush]);

  return { pending, flush };
}
