import type { NavbatchilikShift, WorkScheduleDay } from '@/types';
import type { ThemeColors } from '@/theme/palettes';

// ─────────────────────────────────────────────────────────────────────────────
// "Мои дежурства" (navbatchilik) — pure helpers for the duty screen.
//
// The shift NAME codes (dept mode 'K'/'T'/'D', group mode custom names) are
// backend contract values and are NOT translated. Duty days are editable: a
// group member may assign/clear their group's days by tapping a grid cell
// (see api/mutations.ts + nextDutyCellState below), mirroring the web
// NavbatchilikGrid — the backend authorizes writes per group membership.
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

// ── "Дежурства других" — whole-group schedule (member × day) ──────────────────

/** A group's duty days keyed `${employee_id}_${schedule_date}`, dedup by highest
 *  id per (employee, date) — mirrors the web NavbatchilikGrid's scheduleMap. */
export function scheduleDayMap(days: WorkScheduleDay[]): Record<string, WorkScheduleDay> {
  const map: Record<string, WorkScheduleDay> = {};
  for (const d of days) {
    const key = `${d.employee_id}_${d.schedule_date}`;
    const prev = map[key];
    if (!prev || d.id > prev.id) map[key] = d;
  }
  return map;
}

/** One employee's duty days out of a group's flat list, deduped + date-sorted. */
export function daysForEmployee(days: WorkScheduleDay[], employeeId: number): WorkScheduleDay[] {
  return sortScheduleDays(days.filter((d) => d.employee_id === employeeId));
}

// ── Shift-cycle cell interaction ────────────────────────────────────────────────

export interface DutyCellAction {
  kind: 'assign' | 'clear' | 'noop';
  shiftName?: string | null;
  isDayOff?: boolean;
  start?: string | null;
  end?: string | null;
}

// The tap cycle for a duty-grid cell, mirroring the web handleGroupCellClick:
// empty → shift[0] → … → shift[N-1] → (Dam, when groupHasDam) → clear. The web
// includes the Dam (day-off) step unconditionally for any group with shifts, so
// the caller passes groupHasDam = shifts.length >= 1. `current.is_day_off` is
// the Dam state (index === shifts.length).
export function nextDutyCellState(
  current: WorkScheduleDay | undefined,
  shifts: NavbatchilikShift[] | null | undefined,
  groupHasDam: boolean,
): DutyCellAction {
  if (!shifts || shifts.length === 0) return { kind: 'noop' };
  const damState = shifts.length; // index reserved for Dam
  const curState = current
    ? current.is_day_off
      ? damState
      : shiftIndexIn(shifts, current.schedule_type)
    : -1;
  const lastState = groupHasDam ? damState : shifts.length - 1;
  const next = curState + 1;
  if (next > lastState) return { kind: 'clear' };
  if (groupHasDam && next === damState) {
    return { kind: 'assign', shiftName: null, isDayOff: true, start: null, end: null };
  }
  const sh = shifts[next];
  return { kind: 'assign', shiftName: sh.name ?? 'navbat', isDayOff: false, start: sh.start ?? null, end: sh.end ?? null };
}

// ── Bo'lim rejimi (department.has_navbatchilik — guruhsiz K/T/D jadval) ───────
//
// The second navbatchilik mode. Mirrors the web NavbatchilikGrid's CELL_TYPES +
// handleDeptCellClick 1:1. `code` values are the backend contract stored in
// schedule_type; `label` is the web's display letter — a shared CONSTANT, never
// translated (same rule as shift names).
//
// The times matter beyond display: attendance is computed against
// working_hours_*, so a dept cell written from mobile MUST carry the same
// 09:00–21:00 / 21:00–09:00 the web writes, or the same duty would count as
// lateness differently depending on which client set it.
export interface DeptCellType {
  code: 'day' | 'night' | 'dam' | null;
  label: string;
  isDayOff: boolean;
  /** 'HH:MM' — the caller appends seconds, as it does for group shifts. */
  start: string | null;
  end: string | null;
}

export const DEPT_CELL_TYPES: DeptCellType[] = [
  { code: null, label: '', isDayOff: false, start: null, end: null },
  { code: 'day', label: 'K', isDayOff: false, start: '09:00', end: '21:00' },
  { code: 'night', label: 'T', isDayOff: false, start: '21:00', end: '09:00' },
  { code: 'dam', label: 'D', isDayOff: true, start: null, end: null },
];

/** Which dept cell type a stored row represents (web `entryToCode`). */
export function deptCellCode(d: WorkScheduleDay | undefined): DeptCellType['code'] {
  if (!d) return null;
  if (d.is_day_off) return 'dam';
  return (d.schedule_type as DeptCellType['code']) || null;
}

/** The letter shown in a dept-mode cell. A row whose schedule_type is not a
 *  known dept code (hand-written / left over from group mode) keeps its own
 *  value rather than being blanked out. */
export function deptCellLabel(d: WorkScheduleDay): string {
  const code = deptCellCode(d);
  const known = DEPT_CELL_TYPES.find((t) => t.code === code && t.code !== null);
  if (known) return known.label;
  return d.schedule_type || '•';
}

export function deptCellColorKey(d: WorkScheduleDay): DutyColorKey {
  switch (deptCellCode(d)) {
    case 'day': return 'warning';
    case 'night': return 'primaryLight';
    case 'dam': return 'textMuted';
    default: return 'success';
  }
}

// The dept tap cycle (web `nextType`): empty → K → T → D → empty. An unknown
// stored code has no index, so it falls to position 0 (clear) — same as the web,
// which lets one tap wipe a stale value instead of getting stuck on it.
export function nextDeptCellState(current: WorkScheduleDay | undefined): DutyCellAction {
  const idx = DEPT_CELL_TYPES.findIndex((t) => t.code === deptCellCode(current));
  const next = DEPT_CELL_TYPES[(idx + 1) % DEPT_CELL_TYPES.length];
  if (next.code === null) return { kind: 'clear' };
  return {
    kind: 'assign',
    shiftName: next.isDayOff ? null : next.code,
    isDayOff: next.isDayOff,
    start: next.start,
    end: next.end,
  };
}
