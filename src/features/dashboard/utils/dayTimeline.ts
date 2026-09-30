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
  /** off — dam olish kuni (shanba/yakshanba) va kelinmagan; kechikish dam olish kunida hisoblanmaydi. */
  status: 'present' | 'late' | 'none' | 'off';
};

/** Oxirgi `days` kun (bugundan orqaga). `workStart` (HH:mm) bo'lsa kechikish belgilanadi. */
export function weekSummary(events: Ev[], today: string, workStart: string | null | undefined, days = 7): DaySummary[] {
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
    const late = !weekend && !!(t.firstIn && workStart && t.firstIn > workStart.slice(0, 5));
    return {
      date,
      firstIn: t.firstIn,
      lastOut: t.lastOut,
      status: !t.firstIn ? (weekend ? 'off' : 'none') : late ? 'late' : 'present',
    };
  });
}
