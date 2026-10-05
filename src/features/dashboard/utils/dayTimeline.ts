// Xodim panelining «Bugungi yo'lim» chizig'i va «Mening davomatim» haftaligi —
// o'z turniket voqealaridan (sof funksiyalar).
import dayjs from 'dayjs';
import { isExitEvent } from './attendanceBoard';

type Ev = { happen_time: string; direction_type?: string | null; check_in_out_type?: number | null };

export type DayTimeline = {
  /** start/end — [fromHour, toHour] oynasiga nisbatan 0..1. */
  segments: { start: number; end: number }[];
  firstIn: string | null;
  lastOut: string | null;
  workedMinutes: number;
  inside: boolean;
};

export function dayTimeline(events: Ev[], fromHour = 7, toHour = 23, now: Date = new Date()): DayTimeline {
  const sorted = [...events].sort((a, b) => dayjs(a.happen_time).valueOf() - dayjs(b.happen_time).valueOf());
  const spans: { from: dayjs.Dayjs; to: dayjs.Dayjs }[] = [];
  let openAt: dayjs.Dayjs | null = null;
  let firstIn: dayjs.Dayjs | null = null;
  let lastOut: dayjs.Dayjs | null = null;
  for (const e of sorted) {
    const at = dayjs(e.happen_time);
    if (isExitEvent(e)) {
      lastOut = at;
      if (openAt) {
        spans.push({ from: openAt, to: at });
        openAt = null;
      }
    } else {
      if (!firstIn) firstIn = at;
      if (!openAt) openAt = at;
    }
  }
  const inside = !!openAt;
  if (openAt) spans.push({ from: openAt, to: dayjs(now) });

  const winFrom = fromHour * 60;
  const winLen = (toHour - fromHour) * 60;
  const frac = (d: dayjs.Dayjs) => Math.min(1, Math.max(0, (d.hour() * 60 + d.minute() - winFrom) / winLen));
  return {
    segments: spans.map((s) => ({ start: frac(s.from), end: frac(s.to) })),
    firstIn: firstIn ? firstIn.format('HH:mm') : null,
    lastOut: lastOut ? lastOut.format('HH:mm') : null,
    workedMinutes: spans.reduce((a, s) => a + Math.max(0, s.to.diff(s.from, 'minute')), 0),
    inside,
  };
}


export type DaySummary = {
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  /**
   * off — dam olish kuni; leave — tabelda sababli yo'qlik (ruxsat, ta'til, safar, kasallik…,
   * aniq kodi `code` da). Tabel kodi bo'lsa holat SHUNDAN (v2 useEmployeeBoard:
   * `mapCalStatus(calendar[iso])`), bo'lmasa turniket voqealaridan.
   */
  status: 'present' | 'late' | 'none' | 'off' | 'leave';
  /** Tabel kodi (`work_leave`, `sick_leave` …) — status 'leave' bo'lganda yorliq uchun. */
  code?: string;
};

const DAY_OFF = new Set(['day_off', 'dam_olish', 'holiday', 'off', 'otgul']);
const ABSENT = new Set(['absent', 'progul', 'noaniq_sabab', 'kelmadi']);

/** Server tabel kodi → kun holati (web v2 `mapCalStatus` guruhlari). */
export function dayStatusFromCode(code: string): Pick<DaySummary, 'status' | 'code'> {
  const k = code.toLowerCase();
  if (k === 'present' || k === 'early_leave') return { status: 'present' };
  if (k === 'late') return { status: 'late' };
  if (ABSENT.has(k)) return { status: 'none' };
  if (DAY_OFF.has(k)) return { status: 'off' };
  return { status: 'leave', code: k };
}

/**
 * Oxirgi `days` kun (bugundan orqaga). `calendar` — xodimning normalized tabeli
 * (`{ 'YYYY-MM-DD': kod }`): kod bo'lsa holat undan (QA 2026-10-05: tasdiqlangan ruxsat
 * kuni Davomatda «Ruxsat», bosh sahifada «Kelmagan» edi). Kod bo'lmasa — voqealardan;
 * `workStart` (HH:mm) bo'lsa kechikish belgilanadi.
 */
export function weekSummary(
  events: Ev[],
  today: string,
  workStart: string | null | undefined,
  days = 7,
  calendar?: Record<string, string | null | undefined> | null,
): DaySummary[] {
  const byDay = new Map<string, Ev[]>();
  for (const e of events) {
    const k = dayjs(e.happen_time).format('YYYY-MM-DD');
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = dayjs(today).subtract(i, 'day');
    const date = d.format('YYYY-MM-DD');
    const weekend = d.day() === 0 || d.day() === 6;
    const t = dayTimeline(byDay.get(date) ?? []);
    const code = calendar?.[date];
    if (code) return { date, firstIn: t.firstIn, lastOut: t.lastOut, ...dayStatusFromCode(code) };
    const late = !weekend && !!(t.firstIn && workStart && t.firstIn > workStart.slice(0, 5));
    return {
      date,
      firstIn: t.firstIn,
      lastOut: t.lastOut,
      status: !t.firstIn ? (weekend ? 'off' : 'none') : late ? 'late' : 'present',
    };
  });
}
