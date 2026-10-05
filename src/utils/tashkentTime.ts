// Server vaqtini Toshkent «devor soati» sifatida ko'rsatish — qurilma mintaqasidan mustaqil.
// Toshkent = UTC+5, yozgi vaqt yo'q. Server ikki xil yuboradi: `timestamptz` ustunlari
// ofset bilan (`2026-10-05T07:30:00+00:00`), ba'zi joylar mintaqasiz Toshkent satri —
// mintaqasizi Toshkent deb olinadi (server `assume_tashkent`). v2 `formatDateTime` shu.

const TASHKENT_OFFSET_MS = 5 * 3600_000;
const HAS_ZONE = /([zZ]|[+-]\d{2}:?\d{2})$/;

/** ISO vaqt → Toshkent devor soati `YYYY-MM-DDTHH:mm:ss` (yaroqsiz bo'lsa `null`). */
export function tashkentWall(iso?: string | null): string | null {
  if (!iso) return null;
  let s = iso
    .trim()
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1');
  if (!/T\d{2}:\d{2}/.test(s)) return null;
  if (!HAS_ZONE.test(s)) s += '+05:00';
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + TASHKENT_OFFSET_MS).toISOString().slice(0, 19);
}

/** `DD.MM.YYYY HH:mm` Toshkent vaqtida; bo'sh/yaroqsiz — «—». */
export function formatTashkentDateTime(iso?: string | null): string {
  const w = tashkentWall(iso);
  if (!w) return '—';
  return `${w.slice(8, 10)}.${w.slice(5, 7)}.${w.slice(0, 4)} ${w.slice(11, 16)}`;
}
