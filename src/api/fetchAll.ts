// Ma'lumotnoma ro'yxatini (bo'limlar, lavozimlar…) TO'LIQ olish — web v2
// `api/fetchAll.ts` porti. Server bitta sahifani 500 bilan cheklaydi (`size=1000`
// → 422), katta filialda esa ~913 lavozim bor: shuning uchun 1-sahifa → `total`
// → qolgan sahifalar 6 tadan parallel. Birinchi sahifa bilan cheklangan
// tanlagich qolgan bo'limlarni umuman taklif qilmasdi.
import { apiClient } from './client';
import { unwrapList } from './response';

const MAX_PAGE_SIZE = 500;
/** Nazoratdan chiqqan ro'yxat 40 ta so'rovga aylanmasin. */
const MAX_PAGES = 12;
const BATCH = 6;

export async function fetchAllPages<T>(
  url: string,
  params: Record<string, unknown> = {},
  size = MAX_PAGE_SIZE,
  maxPages = MAX_PAGES,
): Promise<T[]> {
  const get = (page: number) => apiClient.get(url, { params: { ...params, page, size } }).then((r) => r.data);
  const first = await get(1);
  const items = unwrapList<T>(first);
  const total = (first as { total?: number } | null)?.total;
  // Yalang massiv (konvertsiz) — endpoint borini berdi.
  if (Array.isArray(first) || total == null || items.length >= total) return items;

  const pages = Math.min(Math.ceil(total / size), maxPages);
  const rest: T[][] = [];
  for (let p = 2; p <= pages; p += BATCH) {
    const nos = Array.from({ length: Math.min(BATCH, pages - p + 1) }, (_, i) => p + i);
    const batch = await Promise.all(nos.map((n) => get(n)));
    rest.push(...batch.map((d) => unwrapList<T>(d)));
  }
  return [...items, ...rest.flat()];
}
