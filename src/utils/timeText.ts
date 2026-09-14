// Clock-time display helpers. The backend stores schedule times as 'HH:MM:SS';
// screens show 'HH:MM' (a "09:00:00 – 18:00:00" schedule read like a log line
// — screenshot review 2026-09-14).

/** 'HH:MM:SS' | 'HH:MM' -> 'HH:MM'; '' when unset. */
export function trimTime(t?: string | null): string {
  if (!t) return '';
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/** 'HH:MM – HH:MM' range for a shift or a schedule day; '' when both unset. */
export function timeRange(start?: string | null, end?: string | null): string {
  const a = trimTime(start);
  const b = trimTime(end);
  if (!a && !b) return '';
  return `${a || '—'} – ${b || '—'}`;
}
