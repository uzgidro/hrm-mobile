import dayjs from 'dayjs';
import type { DutyDay, Holiday } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// "Праздники / дежурные дни" (Wave 3, read-only) — pure helpers.
// ─────────────────────────────────────────────────────────────────────────────

// 'D MMM YYYY' for a single day, 'D MMM – D MMM YYYY' for a range (localized
// month names come from the active dayjs locale).
export function dateRangeLabel(from?: string | null, to?: string | null): string {
  if (!from) return '';
  const a = dayjs(from);
  if (!to || from === to) return a.format('D MMM YYYY');
  const b = dayjs(to);
  if (a.year() === b.year()) return `${a.format('D MMM')} – ${b.format('D MMM YYYY')}`;
  return `${a.format('D MMM YYYY')} – ${b.format('D MMM YYYY')}`;
}

// Ascending by start date; id tiebreak keeps the order stable.
export function sortByDateFrom<T extends { date_from: string; id: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date_from.localeCompare(b.date_from) || a.id - b.id,
  );
}

// Whether the range covers today (inclusive) — used to badge ongoing holidays.
// A repeatable (yearly) holiday matches by month-day regardless of the stored
// year, including ranges that wrap the new year (Dec 31 – Jan 2).
export function isOngoing(row: Holiday | DutyDay, today: string): boolean {
  if ((row as Holiday).is_repeatable) {
    const md = (d: string) => d.slice(5); // 'MM-DD'
    const from = md(row.date_from);
    const to = md(row.date_to);
    const t = md(today);
    return from <= to ? from <= t && t <= to : t >= from || t <= to;
  }
  return row.date_from <= today && today <= row.date_to;
}
