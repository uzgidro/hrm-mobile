import { useEffect } from 'react';
import { apiClient } from '@/api/client';
import { UI_SETTING } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { isTextSizeId, useTextSizeStore, type TextSizeId } from '@/store/textSizeStore';

/** Shared with web v2 (`a11y/textSizeSync.ts`). */
export const TEXT_SIZE_KEY = 'ui:text_size';
export const TEXT_SIZE_SAVE_MS = 800;

export const saveTextSize = (font: TextSizeId) => apiClient.put(UI_SETTING(TEXT_SIZE_KEY), { value: { font } });

/** The account's copy; `null` — nothing saved or not a step we know. */
export async function fetchTextSize(): Promise<TextSizeId | null> {
  const r = await apiClient.get<{ value?: { font?: unknown } | null }>(UI_SETTING(TEXT_SIZE_KEY));
  const font = r.data?.value?.font;
  return isTextSizeId(font) ? font : null;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Applied at once, kept on the device, copied to the account (one request for several taps). */
export function pickTextSize(id: TextSizeId): void {
  useTextSizeStore.getState().set(id, true);
  clearTimeout(timer);
  const uid = useAuthStore.getState().user?.id;
  if (uid == null) return;
  timer = setTimeout(() => {
    // A sign-out in between: the choice must not land on the next person's account.
    if (useAuthStore.getState().user?.id !== uid) return;
    saveTextSize(id).catch(() => {});
  }, TEXT_SIZE_SAVE_MS);
}

const asked = new Set<number | string>();

/** On a device where nobody chose a size, take the account's. Asked once per app start. */
export function useTextSizeSync(): void {
  const uid = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    const { picked } = useTextSizeStore.getState();
    if (uid == null || picked || asked.has(uid)) return;
    asked.add(uid);
    fetchTextSize()
      .then((id) => {
        const s = useTextSizeStore.getState();
        if (s.picked || useAuthStore.getState().user?.id !== uid) return;
        // Nothing saved by THIS account: a size left by the previous one goes away.
        if ((id ?? 'normal') !== s.id) s.set(id ?? 'normal', false);
      })
      .catch(() => {});
  }, [uid]);
}
