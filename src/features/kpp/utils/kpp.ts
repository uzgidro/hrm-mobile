// KPP posti (web v2 KppPage porti): mehmonlarni oxirgi tashrif kuni bo'yicha
// guruhlash va o'tishlarni sanash — sof funksiyalar.
import dayjs from 'dayjs';
import type { Visitor } from '@/types';

export const NO_VISIT = 'none';

export type VisitorGroup = { key: string; items: Visitor[] };

/** Oxirgi tashrif (yo'q bo'lsa yaratilgan) kuni bo'yicha; yangi kun birinchi, tashrifsizlar oxirida. */
export function groupVisitorsByDay(visitors: Visitor[]): VisitorGroup[] {
  const map = new Map<string, Visitor[]>();
  for (const g of visitors) {
    const d = g.last_visit_time || (g as Visitor & { created_at?: string }).created_at;
    const key = d ? dayjs(d).format('YYYY-MM-DD') : NO_VISIT;
    map.set(key, [...(map.get(key) ?? []), g]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_VISIT ? 1 : b === NO_VISIT ? -1 : b.localeCompare(a)))
    .map(([key, items]) => ({ key, items }));
}

export function countPasses(events: { direction_type?: string | null }[]): { entered: number; exited: number } {
  let entered = 0;
  let exited = 0;
  for (const e of events) {
    if (e.direction_type === 'entrance') entered++;
    else if (e.direction_type === 'exit') exited++;
  }
  return { entered, exited };
}
