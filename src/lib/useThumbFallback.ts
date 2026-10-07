// Ro'yxat avatarlari uchun: avval backendning 160×160 nusxasi (`photo_thumb_path`, ~1.6 KB),
// u yo'q yoki yuklanmasa (eski yozuv, 404) — to'liq surat (~27 KB). O'lchov 2026-10-06.
//
// 2026-10-07 (foydalanuvchi: «xodim tanlashda rasmlar chiqmayapti»): nusxa ochilmaganda manba
// O'SHA <Image> ichida almashtirilardi — yangi so'rov bekor bo'lib (ERR_ABORTED) bo'sh kulrang
// doira qolardi. Endi `uri` kalit (key) sifatida ishlatiladi: zaxira surat yangi komponentda
// yuklanadi. Ikkalasi ham ochilmasa `failed` — chaqiruvchi bosh harfni ko'rsatadi.
import { useState } from 'react';

export function useThumbFallback(thumb?: string | null, full?: string | null) {
  // Xato bergan manzillar saqlanadi — qator boshqa xodimga qayta ishlatilsa (FlatList) o'z-o'zidan tiklanadi.
  const [failed, setFailed] = useState<readonly string[]>([]);
  const candidates = [thumb, full].filter((u): u is string => !!u && !failed.includes(u));
  const uri = candidates[0] ?? null;
  return {
    uri,
    /** `<Image key={uri}>` — manba almashganda komponent yangidan yaratiladi. */
    key: uri ?? 'none',
    onError: uri ? () => setFailed((f) => (f.includes(uri) ? f : [...f, uri])) : undefined,
    /** Rasm bor edi, lekin hech biri ochilmadi — bosh harf ko'rsatilsin. */
    failed: !uri && !!(thumb || full),
  };
}
