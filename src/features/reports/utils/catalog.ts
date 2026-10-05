// Hisobotlar katalogi — guruhlash va qidiruv (web v2 `ReportCatalog`). Ro'yxatni server
// hal qiladi (`reports/catalog` faqat ishga tushira oladiganlaringizni beradi) — mijoz
// rol bo'yicha hech narsa filtrlamaydi.
import type { IconName } from '@/components/Icon';
import type { ReportCatalogItem, ReportCategory } from './types';

export const CATALOG_GROUPS: { key: ReportCategory; labelKey: string; icon: IconName }[] = [
  { key: 'attendance', labelKey: 'reports.groupAttendance', icon: 'calendar' },
  { key: 'hr', labelKey: 'reports.groupHr', icon: 'users' },
  { key: 'kpi', labelKey: 'reports.groupKpi', icon: 'chart' },
];

/** v2: nom, izoh yoki kod bo'yicha (kichik harf). */
export function catalogMatch(item: ReportCatalogItem, term: string, title: string, desc: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return title.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || item.code.includes(q);
}

/** Toifalar tartibi: davomat → kadrlar → KPI; bo'sh guruh chiqmaydi; `hidden` (faqat drill) — yo'q. */
export function groupCatalog(
  items: ReportCatalogItem[],
  keep: (item: ReportCatalogItem) => boolean = () => true,
): { key: ReportCategory; items: ReportCatalogItem[] }[] {
  return CATALOG_GROUPS.map((g) => ({
    key: g.key,
    items: items.filter((i) => i.category === g.key && !i.hidden && keep(i)),
  })).filter((g) => g.items.length > 0);
}
