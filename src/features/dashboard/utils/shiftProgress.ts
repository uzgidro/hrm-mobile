// Bugungi smena progressi (dizayn I, «Bugungi smena» kartasi): kelishdan beri
// (ketgan bo'lsa — ketguncha) ishlangan vaqt va uning smena uzunligiga ulushi.
import dayjs from 'dayjs';

export type ShiftProgress = { workedMin: number; pct: number };

function minutesOf(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * `null` when there is no entry yet or the schedule is unknown/degenerate.
 * Night shifts (end before start) wrap past midnight. `pct` is 0..100.
 */
export function shiftProgress(
  entryIso: string | undefined,
  exitIso: string | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date(),
): ShiftProgress | null {
  if (!entryIso) return null;
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s == null || e == null || s === e) return null;
  const shiftLen = e > s ? e - s : e + 24 * 60 - s;
  const until = exitIso ? dayjs(exitIso) : dayjs(now);
  const workedMin = Math.max(0, until.diff(dayjs(entryIso), 'minute'));
  const pct = Math.min(100, Math.round((workedMin / shiftLen) * 100));
  return { workedMin, pct };
}

/** Uzbek naming is «Surname Given Patronymic» — the greeting uses the given name. */
export function givenName(legalName?: string | null): string {
  const parts = (legalName ?? '').trim().split(/\s+/).filter(Boolean);
  return parts[1] ?? parts[0] ?? '';
}
