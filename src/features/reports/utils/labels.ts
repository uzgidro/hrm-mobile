// Server `title_key` / `label_key` → matn (web v2 `reportLabel`). Kalitlar serverda nomlangan:
// `r.<kod>` (hisobot), `p.<param>`, `pref.<nom>`; qolgani — ustun/info yorlig'i `reports.h.*`.
// Lug'atda yo'q kalit hech qachon bo'sh yoki xom yo'l bo'lib chiqmaydi: serverning o'z matni,
// u ham bo'lmasa kalitning oxirgi bo'lagi.
import i18n from '@/i18n';

export function reportLabelKey(key: string): string {
  return /^(r|p|pref)\./.test(key) ? `reports.${key}` : `reports.h.${key}`;
}

export function reportLabel(key: string | undefined | null, fallback?: unknown): string {
  const fb = fallback == null || fallback === '' ? null : String(fallback);
  if (!key) return fb ?? '';
  const full = reportLabelKey(key);
  if (i18n.exists(full)) return i18n.t(full);
  return fb ?? key.split('.').pop() ?? key;
}

/** Katalog izohi (`reports.desc.<kod>`); yo'q bo'lsa — bo'sh. */
export function reportDesc(code: string): string {
  const key = `reports.desc.${code}`;
  return i18n.exists(key) ? i18n.t(key) : '';
}
