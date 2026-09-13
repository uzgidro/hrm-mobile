// Typed-date helpers for forms that take a date as TEXT (no picker inside a
// modal). Strict: "DD.MM.YYYY" only, real calendar dates only.
import dayjs from 'dayjs';

/** "31.12.2026" → "2026-12-31"; anything else → null. */
export function parseDdMmYyyy(text: string): string | null {
  const m = /^\s*(\d{2})\.(\d{2})\.(\d{4})\s*$/.exec(text);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = dayjs(iso);
  return d.isValid() && d.format('YYYY-MM-DD') === iso ? iso : null;
}

/** ISO date/datetime → "DD.MM.YYYY" for a text field. */
export function formatDdMmYyyy(iso?: string | null): string {
  return iso ? dayjs(iso).format('DD.MM.YYYY') : '';
}
