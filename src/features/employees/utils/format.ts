// Xodim kartasidagi qiymatlarni ko'rsatish — sof funksiyalar.

/** Server vaqti `HH:mm:ss` — kartada `HH:mm` (soniya ma'nosiz). Tanilmagan qiymat — o'zicha. */
export function hhmm(value?: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : v;
}

/** `08:00 – 20:00`; biri yo'q bo'lsa — `null`. */
export function timeRange(start?: string | null, end?: string | null): string | null {
  const a = hhmm(start);
  const b = hhmm(end);
  return a && b ? `${a} – ${b}` : null;
}

export type DictionaryOption = { code: string; name: string };

/**
 * Millat kodi → o'qiladigan nom (web v2 `useNationalityLabel` 1:1). `Employee.nationality` da eski
 * qisqartma ("uzb", "toj"), ma'lumotnoma esa to'liq kod ("uzbek", "tojik") bilan: avval aniq kod,
 * keyin YAGONA mos keladigan prefiks; noaniq ("tur" → turk / turkman) bo'lsa — yozilganicha.
 */
export function nationalityLabel(raw?: string | null, options?: DictionaryOption[] | null): string | null {
  const original = (raw ?? '').trim();
  if (!original) return null;
  const v = original.toLowerCase();
  const byCode = new Map((options ?? []).map((o) => [String(o.code).toLowerCase(), o.name]));
  const exact = byCode.get(v);
  if (exact) return exact;
  const hits = [...byCode.entries()].filter(([code]) => code.startsWith(v));
  return hits.length === 1 ? hits[0]![1] : original;
}
