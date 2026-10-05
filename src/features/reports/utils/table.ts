// Hisobot jadvali (`ReportTableJson`) — sof joylashuv va format (web v2 `ReportTableView` /
// `reportStyles` porti). Ekran faqat shu hisob-kitob natijasini chizadi: ustun kengligi,
// sarlavha katakchalarining (cs/rs) koordinatalari, qator katakchalari, matn, ton, tekislash.
import type { ThemeColors } from '@/theme/palettes';
import type { CellJson, CellStyle, DrillLevel, RowJson, SheetJson } from './types';

export const ROW_H = 34;
export const HEADER_ROW_H = 40;

/** v2: server kengligi (belgilarda, xlsx kabi) → px: `max(36, w·7.2 + 16)`; yo'q ustun — 12 belgi. */
export function columnWidths(sheet: Pick<SheetJson, 'ncols' | 'widths'>): number[] {
  return Array.from({ length: sheet.ncols }, (_, i) => Math.max(36, Math.round((sheet.widths[i] ?? 12) * 7.2 + 16)));
}

/** Ustun boshlanish koordinatalari: `prefix[i]` — i-ustun chap qirrasi, `prefix[n]` — umumiy kenglik. */
export function prefixSums(widths: number[]): number[] {
  const out = [0];
  for (const w of widths) out.push(out[out.length - 1]! + w);
  return out;
}

const spanWidth = (prefix: number[], col: number, cs: number) => {
  const last = prefix.length - 1;
  const a = Math.min(col, last);
  const b = Math.min(col + cs, last);
  return prefix[b]! - prefix[a]!;
};

export interface PlacedCell {
  cell: CellJson;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ko'p qatorli sarlavha: yuqoridagi katak bir necha qatorga cho'zilgan (rs) bo'lsa, keyingi
 * qatordagi katak to'g'ri ustunga tushadi — server xlsx yozganda qilgan hisob (v2 `layoutHeader`).
 */
export function layoutHeader(
  rows: CellJson[][],
  widths: number[],
  rowH = HEADER_ROW_H,
): { cells: PlacedCell[]; height: number } {
  const prefix = prefixSums(widths);
  const occupied = new Set<string>();
  const cells: PlacedCell[] = [];
  rows.forEach((row, ri) => {
    let col = 0;
    for (const c of row) {
      while (occupied.has(`${ri}:${col}`)) col++;
      const cs = c.cs ?? 1;
      const rs = c.rs ?? 1;
      for (let r = ri; r < ri + rs; r++) for (let cc = col; cc < col + cs; cc++) occupied.add(`${r}:${cc}`);
      cells.push({
        cell: c,
        row: ri,
        col,
        x: prefix[Math.min(col, prefix.length - 1)]!,
        y: ri * rowH,
        w: spanWidth(prefix, col, cs),
        h: rs * rowH,
      });
      col += cs;
    }
  });
  return { cells, height: rows.length * rowH };
}

/** Tana/jami qatori katakchalari: ketma-ket, faqat `cs` (tanada `rs` ishlatilmaydi — server ham yozmaydi). */
export function rowLayout(row: RowJson, prefix: number[]): { cell: CellJson; col: number; x: number; w: number }[] {
  let col = 0;
  return row.c.map((cell) => {
    const cs = cell.cs ?? 1;
    const out = { cell, col, x: prefix[Math.min(col, prefix.length - 1)]!, w: spanWidth(prefix, col, cs) };
    col += cs;
    return out;
  });
}

/** Har ustunning eng pastki sarlavha yorlig'i (drill breadcrumb: «Ayollar · 23»). */
export function leafLabels(cells: PlacedCell[], ncols: number, labelOf: (c: CellJson) => string): string[] {
  const out: string[] = Array.from({ length: ncols }, () => '');
  for (const { cell, col } of cells) {
    const label = labelOf(cell);
    for (let c = col; c < col + (cell.cs ?? 1) && c < ncols; c++) out[c] = label;
  }
  return out;
}

/** Raqamli drill katagi «<ustun> · <qiymat>», nom katagi — nomning o'zi (v2 `crumb`). */
export function crumbLabel(head: string | undefined, text: string): string {
  return /^[\d.,\s%+-]*$/.test(text) && head ? `${head} · ${text}` : text;
}

/**
 * v2 `toLocaleString('ru-RU', { maximumFractionDigits: 2 })` — qurilma Intl'iga bog'lanmasdan:
 * minglar uzilmas bo'shliq bilan, kasr vergul bilan, ko'pi bilan 2 xona, ortiqcha nol yo'q.
 */
export function fmtNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const neg = n < 0;
  const [int, frac] = Math.abs(n).toFixed(2).split('.') as [string, string];
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const f = frac.replace(/0+$/, '');
  const body = f ? `${grouped},${f}` : grouped;
  return neg && body !== '0' ? `-${body}` : body;
}

/** v2 `fmtCell`. `date` — ISO satrdan kesib (TZ'ga bog'liq emas). */
export function fmtCell(c: CellJson): string {
  const v = c.v;
  if (v == null || v === '') return '';
  switch (c.f) {
    case 'date': {
      if (typeof v !== 'string') return String(v);
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
    }
    case 'num':
      return typeof v === 'number' ? fmtNumber(v) : String(v);
    case 'pct':
      return typeof v === 'number' ? `${fmtNumber(v)}%` : String(v);
    case 'hhmm':
      // Server soat ko'rinishini («8.30») o'zi beradi; daqiqa son bo'lib kelsa — shu yerda.
      return typeof v === 'number' ? `${Math.floor(v / 60)}.${String(v % 60).padStart(2, '0')}` : String(v);
    default:
      return String(v);
  }
}

/**
 * Server vaqt belgisi → «DD.MM.YYYY HH:mm» Toshkent vaqtida (UTC+5, yozgi vaqt yo'q).
 * Zonasiz isoformat (`generated_at` — server soati) satrdan kesiladi; zonali (`signature.at`)
 * Toshkentga o'tkaziladi (v2 `inTashkent`). Qurilma zonasi hech qachon aralashmaydi.
 */
export function fmtStamp(iso: string | null | undefined): string {
  const s = iso ?? '';
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(s) && !Number.isNaN(Date.parse(s))) {
    const d = new Date(Date.parse(s) + 5 * 3600_000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

export type Align = 'left' | 'center' | 'right';

/** v2 `align`: aniq `a`, aks holda raqam/sana/vaqt formatlari markazda. */
export function cellAlign(c: CellJson): Align {
  if (c.a === 'right' || c.a === 'left' || c.a === 'center') return c.a;
  if (c.s === 'body_centralized') return 'center';
  return ['int', 'num', 'hhmm', 'pct', 'date', 'time'].includes(c.f ?? '') ? 'center' : 'left';
}

type ColorKey = keyof ThemeColors;
export interface CellTone {
  bg?: ColorKey;
  fg?: ColorKey;
  bold?: boolean;
}

/** Ramziy uslub → tema tokenlari (v2 `CELL_STYLE`; xlsx ham shu ranglarni beradi). */
export function styleTone(s: CellStyle | null | undefined): CellTone {
  switch (s) {
    case 'root':
    case 'bold':
      return { bold: true };
    case 'header_danger':
      return { fg: 'danger' };
    case 'danger':
      return { bg: 'dangerSoft', fg: 'danger' };
    case 'warning':
      return { bg: 'warningSoft', fg: 'warning' };
    case 'success':
      return { bg: 'successSoft', fg: 'success' };
    case 'rest':
      return { bg: 'bg', fg: 'fgSubtle' };
    case 'dismissed':
      return { bg: 'border', fg: 'fgSubtle' };
    case 'footer':
      return { bg: 'bg', bold: true };
    case 'muted':
      return { bg: 'infoSoft', fg: 'info' };
    case 'section':
      return { bg: 'brandSoft', fg: 'brandStrong', bold: true };
    default:
      return {};
  }
}

/** Katak toni: katakning o'z uslubi, bo'lmasa qatorniki; jami qatori — `footer`. */
export function cellTone(cell: CellJson, row: RowJson, footer: boolean): CellTone {
  if (cell.s) return styleTone(cell.s);
  return styleTone(footer ? 'footer' : row.s);
}

/** Jami qatori yoki bo'sh katak yorliq kalitini (`k`) ko'rsatadi; aks holda formatlangan qiymat. */
export function cellText(c: CellJson, footer: boolean, label: (key: string, fallback: unknown) => string): string {
  return c.k && (footer || c.v === '' || c.v == null) ? label(c.k, c.v) : fmtCell(c);
}

export const bodyCount = (sheet: Pick<SheetJson, 'rows'>): number => sheet.rows.filter((r) => r.kind === 'body').length;

/** Drill stack (v2 `useReportRun`): yangi hisobot — 0-daraja, drill — yangi daraja. */
export const startStack = (level: DrillLevel): DrillLevel[] => [level];
export const pushLevel = (stack: DrillLevel[], level: DrillLevel): DrillLevel[] => [...stack, level];
/** Breadcrumb: shu darajaga QAYTISH — saqlangan jadval, qayta so'rov yo'q. */
export const popTo = (stack: DrillLevel[], index: number): DrillLevel[] => stack.slice(0, index + 1);
