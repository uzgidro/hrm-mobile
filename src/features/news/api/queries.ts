// Yangiliklar — kompaniya sayti uzgidro.uz dan (backend `services/uzgidro_news`, web v2 NewsPage
// bilan BITTA manba). 2026-10-06: mobil hali ichki «news-posts» dan o'qirdi — web 09-24 da saytga
// o'tgach u jadval bo'sh qoldi va mobilda yangilik chiqmay qoldi.
import { pagedListOptions } from '@/lib/pagedList';
import { COMPANY_NEWS_PAGE } from '@/api/urls';
import { Env } from '@/config/env';

export interface CompanyNews {
  id: number;
  title: string;
  excerpt?: string | null;
  views?: number | null;
  /** `YYYY-MM-DD HH:mm:ss` (sayt vaqti). */
  date?: string | null;
  /** O'zimizdagi kichik rasm (`/dashboard/company-news/{id}/image`, ochiq) yoki to'liq URL. */
  image?: string | null;
  /** Saytdagi asl rasm — bizniki ochilmasa. */
  image_source?: string | null;
  /** Maqola saytda. */
  url: string;
}

export type NewsLang = 'uz' | 'ru' | 'en';

export const newsKeys = {
  all: ['news'] as const,
  list: (lang: NewsLang) => [...newsKeys.all, 'company', lang] as const,
};

/** Ilova tili → sayt tili (sayt uz/ru/en beradi; kirill o'zbekchasi — uz). */
export function newsLang(appLang?: string): NewsLang {
  if (appLang?.startsWith('ru')) return 'ru';
  if (appLang?.startsWith('en')) return 'en';
  return 'uz';
}

// Sayt sahifalashi buzuq — backend mavjud maqola id'lari indeksini sahifalaydi (20 tadan).
export function newsListQuery(lang: NewsLang) {
  return pagedListOptions<CompanyNews>({
    queryKey: newsKeys.list(lang),
    url: COMPANY_NEWS_PAGE,
    params: { lang },
    size: 20,
    staleTime: 10 * 60 * 1000,
  });
}

/** `/dashboard/...` → API bilan to'liq manzil; tayyor URL o'zgarmaydi. */
export function newsImageUrl(n: Pick<CompanyNews, 'image' | 'image_source'>): string | null {
  const src = n.image || n.image_source || null;
  if (!src) return null;
  return src.startsWith('/') ? `${Env.apiUrl.replace(/\/$/, '')}${src}` : src;
}
