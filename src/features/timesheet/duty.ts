import type { NavbatchilikShift, WorkScheduleDay } from '@/types';
import type { ThemeColors } from '@/theme/palettes';

// ─────────────────────────────────────────────────────────────────────────────
// "Мои дежурства" (navbatchilik, read-only) — pure helpers for the duty screen.
//
// The shift NAME codes (dept mode 'K'/'T'/'D', group mode custom names) are
// backend contract values and are NOT translated. On the web the employee page
// passes readOnly={false} and relies on the backend to reject writes — mobile
// deliberately ships NO mutations at all (see the module plan note).
// ─────────────────────────────────────────────────────────────────────────────

export type DutyColorKey = 'primaryLight' | 'warning' | 'success' | 'error' | 'textMuted';

// Stable color per shift position (mirrors the web grid coloring shifts 1..N
// by index). Cycles when a group has more shifts than slots.
const SHIFT_COLOR_CYCLE: DutyColorKey[] = ['primaryLight', 'warning', 'success', 'error'];
export function shiftColorKey(index: number): DutyColorKey {
  if (index < 0) return 'textMuted';
  return SHIFT_COLOR_CYCLE[index % SHIFT_COLOR_CYCLE.length];
}
export function shiftColor(index: number, c: ThemeColors): string {
  return c[shiftColorKey(index)];
}

// 'HH:MM:SS' | 'HH:MM' -> 'HH:MM' (the backend stores times with seconds).
export function trimTime(t?: string | null): string {
  if (!t) return '';
  return t.length >= 5 ? t.slice(0, 5) : t;
}

// 'HH:MM – HH:MM' range for a shift or a schedule day; '' when unset.
export function timeRange(start?: string | null, end?: string | null): string {
  const a = trimTime(start);
  const b = trimTime(end);
  if (!a && !b) return '';
  return `${a || '—'} – ${b || '—'}`;
}

export interface DutyDayMeta {
  /** shift name to display ('K'/'T'/custom); null for a day off */
  label: string | null;
  isDayOff: boolean;
  /** 'HH:MM – HH:MM' or '' */
  time: string;
}

export function dutyDayMeta(d: WorkScheduleDay): DutyDayMeta {
  if (d.is_day_off) return { label: null, isDayOff: true, time: '' };
  return {
    label: d.schedule_type || null,
    isDayOff: false,
    time: timeRange(d.working_hours_start, d.working_hours_end),
  };
}

// Sort by date ascending; when the backend holds duplicate rows for a date
// (edited assignments), the highest id (latest write) wins.
export function sortScheduleDays(days: WorkScheduleDay[]): WorkScheduleDay[] {
  const byDate = new Map<string, WorkScheduleDay>();
  for (const d of days) {
    const prev = byDate.get(d.schedule_date);
    if (!prev || d.id > prev.id) byDate.set(d.schedule_date, d);
  }
  return [...byDate.values()].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
}

// Backend weekdays are Monday=0..Sunday=6; dayjs weekday names index Sunday=0.
// Convert for weekdayNameShort().
export function backendWeekdayToDayjs(w: number): number {
  return (w + 1) % 7;
}

// The shift's index within its group (for stable coloring of day rows whose
// schedule_type matches a group shift). -1 when not found.
export function shiftIndexIn(shifts: NavbatchilikShift[] | null | undefined, name?: string | null): number {
  if (!shifts || !name) return -1;
  return shifts.findIndex((s) => s.name === name);
}
