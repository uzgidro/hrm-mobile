// Ro'yxat avatarlari uchun: avval backendning 160×160 nusxasi (`photo_thumb_path`, ~1.6 KB),
// u yo'q yoki yuklanmasa (eski yozuv, 404) — to'liq surat (~27 KB). O'lchov 2026-10-06.
import { useState } from 'react';

export function useThumbFallback(thumb?: string | null, full?: string | null) {
  // Xato bergan nusxaning URL'i saqlanadi — qator boshqa xodimga qayta ishlatilsa (FlatList) o'z-o'zidan tiklanadi.
  const [failedThumb, setFailedThumb] = useState<string | null>(null);
  const useThumb = !!thumb && failedThumb !== thumb;
  return {
    uri: (useThumb ? thumb : full) || null,
    onError: useThumb ? () => setFailedThumb(thumb) : undefined,
  };
}
