import {
  HEADER_ROW_H,
  ROW_H,
  bodyCount,
  cellAlign,
  cellText,
  cellTone,
  columnWidths,
  crumbLabel,
  fmtCell,
  fmtNumber,
  fmtStamp,
  freezeLayout,
  hasDrillCells,
  sheetContentHeight,
  layoutHeader,
  leafLabels,
  popTo,
  prefixSums,
  pushLevel,
  rowLayout,
  splitSpan,
  startStack,
  styleTone,
} from '../table';
import type { CellJson, DrillLevel, ReportTableJson } from '../types';

describe('ustun kengligi', () => {
  it("v2 formulasi: max(36, w·7.2+16); yo'q ustun — 12 belgi", () => {
    expect(columnWidths({ ncols: 3, widths: [4, 30] })).toEqual([45, 232, 102]);
    expect(columnWidths({ ncols: 1, widths: [1] })).toEqual([36]);
  });
  it('prefixSums', () => {
    expect(prefixSums([10, 20, 30])).toEqual([0, 10, 30, 60]);
  });
});

describe('layoutHeader — cs/rs joylashuvi', () => {
  // | № (rs2) | Reja (cs2)      | Jami (rs2) |
  // |         | Kirish | Chiqish |            |
  const rows: CellJson[][] = [
    [
      { v: '№', rs: 2 },
      { v: 'Reja', cs: 2 },
      { v: 'Jami', rs: 2 },
    ],
    [{ v: 'Kirish' }, { v: 'Chiqish' }],
  ];
  const widths = [40, 100, 100, 60];
  it("ikkinchi qator katakchalari rs band qilgan ustunni o'tkazib yuboradi", () => {
    const { cells, height } = layoutHeader(rows, widths);
    expect(height).toBe(2 * HEADER_ROW_H);
    expect(cells.map((c) => [c.cell.v, c.col, c.x, c.y, c.w, c.h])).toEqual([
      ['№', 0, 0, 0, 40, 2 * HEADER_ROW_H],
      ['Reja', 1, 40, 0, 200, HEADER_ROW_H],
      ['Jami', 3, 240, 0, 60, 2 * HEADER_ROW_H],
      ['Kirish', 1, 40, HEADER_ROW_H, 100, HEADER_ROW_H],
      ['Chiqish', 2, 140, HEADER_ROW_H, 100, HEADER_ROW_H],
    ]);
  });
  it('leafLabels — eng pastki sarlavha', () => {
    const { cells } = layoutHeader(rows, widths);
    expect(leafLabels(cells, 4, (c) => String(c.v))).toEqual(['№', 'Kirish', 'Chiqish', 'Jami']);
  });
  it('ustunlardan oshgan span kenglikni chegaradan tashqariga chiqarmaydi', () => {
    const { cells } = layoutHeader([[{ v: 'A', cs: 9 }]], [10, 20]);
    expect(cells[0]!.w).toBe(30);
  });
});

describe('rowLayout', () => {
  it('cs bilan ketma-ket', () => {
    const prefix = prefixSums([40, 100, 100, 60]);
    const out = rowLayout({ kind: 'footer', c: [{ v: 'Jami', cs: 2 }, { v: 5 }, { v: 7 }] }, prefix);
    expect(out.map((x) => [x.col, x.x, x.w])).toEqual([
      [0, 0, 140],
      [2, 140, 100],
      [3, 240, 60],
    ]);
  });
});

describe('format', () => {
  it("fmtNumber — ru-RU kabi: uzilmas bo'shliq, vergul, ≤2 xona", () => {
    expect(fmtNumber(1234)).toBe('1 234');
    expect(fmtNumber(12345.678)).toBe('12 345,68');
    expect(fmtNumber(-1234567.5)).toBe('-1 234 567,5');
    expect(fmtNumber(0.1 + 0.2)).toBe('0,3');
    expect(fmtNumber(5)).toBe('5');
    expect(fmtNumber(-0.001)).toBe('0');
  });
  it("fmtCell: date, num, pct, hhmm, int, bo'sh", () => {
    expect(fmtCell({ v: '2026-09-01', f: 'date' })).toBe('01.09.2026');
    expect(fmtCell({ v: '2026-09-01T23:30:00+05:00', f: 'date' })).toBe('01.09.2026');
    expect(fmtCell({ v: 1500.5, f: 'num' })).toBe('1 500,5');
    expect(fmtCell({ v: 87.456, f: 'pct' })).toBe('87,46%');
    expect(fmtCell({ v: 'x', f: 'pct' })).toBe('x');
    expect(fmtCell({ v: 90, f: 'hhmm' })).toBe('1.30');
    expect(fmtCell({ v: '8.30', f: 'hhmm' })).toBe('8.30');
    expect(fmtCell({ v: 12, f: 'int' })).toBe('12');
    expect(fmtCell({ v: null })).toBe('');
    expect(fmtCell({ v: '' })).toBe('');
  });
  it('fmtStamp — satrdan, zonasiz', () => {
    expect(fmtStamp('2026-10-05T14:07:31.123456')).toBe('05.10.2026 14:07');
    expect(fmtStamp('2026-10-05')).toBe('05.10.2026');
    expect(fmtStamp(null)).toBe('');
    // Zonali belgi — Toshkent vaqtiga (UTC+5).
    expect(fmtStamp('2026-10-05T21:30:00+00:00')).toBe('06.10.2026 02:30');
    expect(fmtStamp('2026-10-05T09:07:00Z')).toBe('05.10.2026 14:07');
  });
  it('cellAlign', () => {
    expect(cellAlign({ v: 1, f: 'int' })).toBe('center');
    expect(cellAlign({ v: 'a' })).toBe('left');
    expect(cellAlign({ v: 1, f: 'num', a: 'right' })).toBe('right');
    expect(cellAlign({ v: 'a', s: 'body_centralized' })).toBe('center');
  });
  it("cellText: jami qatori va bo'sh katak yorliq kalitini oladi", () => {
    const label = (k: string) => `L:${k}`;
    expect(cellText({ v: 'Jami', k: 'total' }, true, label)).toBe('L:total');
    expect(cellText({ v: '', k: 'total' }, false, label)).toBe('L:total');
    expect(cellText({ v: 5, k: 'total', f: 'int' }, false, label)).toBe('5');
  });
  it('crumbLabel', () => {
    expect(crumbLabel('Ayollar', '23')).toBe('Ayollar · 23');
    expect(crumbLabel('F.I.Sh.', 'Aliyev Vali')).toBe('Aliyev Vali');
    expect(crumbLabel('', '23')).toBe('23');
  });
});

describe('uslub → ton', () => {
  it('v2 CELL_STYLE xaritasi', () => {
    expect(styleTone('danger')).toEqual({ bg: 'dangerSoft', fg: 'danger' });
    expect(styleTone('warning')).toEqual({ bg: 'warningSoft', fg: 'warning' });
    expect(styleTone('success')).toEqual({ bg: 'successSoft', fg: 'success' });
    expect(styleTone('muted')).toEqual({ bg: 'infoSoft', fg: 'info' });
    expect(styleTone('section')).toEqual({ bg: 'brandSoft', fg: 'brandStrong', bold: true });
    expect(styleTone('footer')).toEqual({ bg: 'bg', bold: true });
    expect(styleTone('header_danger')).toEqual({ fg: 'danger' });
    expect(styleTone('bold')).toEqual({ bold: true });
    expect(styleTone(undefined)).toEqual({});
  });
  it('katak uslubi qatorinikidan ustun; jami qatori — footer', () => {
    expect(cellTone({ v: 1, s: 'danger' }, { kind: 'body', s: 'dismissed', c: [] }, false)).toEqual(
      styleTone('danger'),
    );
    expect(cellTone({ v: 1 }, { kind: 'body', s: 'dismissed', c: [] }, false)).toEqual(styleTone('dismissed'));
    expect(cellTone({ v: 1 }, { kind: 'footer', c: [] }, true)).toEqual(styleTone('footer'));
  });
});

describe('drill stack', () => {
  const table = (title: string) => ({ title }) as unknown as ReportTableJson;
  const lvl = (label: string): DrillLevel => ({
    drill: label === 'root' ? null : { report: label, params: {} },
    label,
    table: table(label),
  });
  it('push / popTo — saqlangan jadval qaytadi', () => {
    let s = startStack(lvl('root'));
    s = pushLevel(s, lvl('a'));
    s = pushLevel(s, lvl('b'));
    expect(s.map((x) => x.label)).toEqual(['root', 'a', 'b']);
    const back = popTo(s, 0);
    expect(back).toHaveLength(1);
    expect(back[0]!.table).toBe(s[0]!.table);
  });
  it('bodyCount — faqat body qatorlar', () => {
    expect(
      bodyCount({
        rows: [
          { kind: 'section', c: [] },
          { kind: 'body', c: [] },
          { kind: 'body', c: [] },
        ],
      }),
    ).toBe(2);
  });
});

describe('muzlatilgan ustunlar (freeze_cols)', () => {
  it("freeze yo'q yoki kenglik noma'lum — muzlatilmaydi", () => {
    expect(freezeLayout(0, [50, 200, 40], 360)).toEqual({ count: 0, widths: [50, 200, 40] });
    expect(freezeLayout(2, [50, 200, 40], 0)).toEqual({ count: 0, widths: [50, 200, 40] });
  });
  it("sig'sa — barchasi, kengliklar o'zgarmaydi", () => {
    expect(freezeLayout(2, [50, 100, 40, 40], 1000)).toEqual({ count: 2, widths: [50, 100, 40, 40] });
  });
  it('tabel telefonda: nom ustuni qolgan joyga toraytiriladi (ekranning 55%)', () => {
    // 360 * 0.55 = 198 → № 52 + nom 146.
    expect(freezeLayout(2, [52, 261, 36, 36], 360)).toEqual({ count: 2, widths: [52, 146, 36, 36] });
  });
  it('qolgan joy juda tor — keyingi ustun muzlatilmaydi', () => {
    // 300 * 0.55 = 165 → 120 + 45 (< 80) — faqat birinchisi.
    expect(freezeLayout(3, [120, 200, 30, 30], 300)).toEqual({ count: 1, widths: [120, 200, 30, 30] });
  });
  it('kamida bitta ustun aylanib turadi', () => {
    expect(freezeLayout(3, [40, 40, 40], 1000).count).toBe(2);
  });
  it("splitSpan — chegarani kesib o'tgan katak ikkiga bo'linadi, yorliq muzlatilgan qismda", () => {
    const prefix = prefixSums([50, 100, 40, 40]);
    expect(splitSpan(0, 1, 2, prefix)).toEqual([{ col: 0, x: 0, w: 50, frozen: true, label: true, edge: false }]);
    expect(splitSpan(1, 1, 2, prefix)).toEqual([{ col: 1, x: 50, w: 100, frozen: true, label: true, edge: true }]);
    expect(splitSpan(2, 2, 2, prefix)).toEqual([{ col: 2, x: 150, w: 80, frozen: false, label: true, edge: false }]);
    expect(splitSpan(1, 3, 2, prefix)).toEqual([
      { col: 1, x: 50, w: 100, frozen: true, label: true, edge: true },
      { col: 2, x: 150, w: 80, frozen: false, label: false, edge: false },
    ]);
    // Muzlatish yo'q — bitta bo'lak.
    expect(splitSpan(0, 4, 0, prefix)).toEqual([{ col: 0, x: 0, w: 230, frozen: false, label: true, edge: false }]);
  });
});

describe('drill izohi va jadval balandligi', () => {
  const sheet = (rows: unknown[], footer: unknown[] = [], header: unknown[][] = [[{ v: 'A' }]]) =>
    ({ name: 's', ncols: 1, widths: [10], header, rows, footer, freeze_rows: 0, freeze_cols: 0, legend: [] }) as never;
  it("hasDrillCells — faqat `p` li katak bo'lsa (tana yoki jami)", () => {
    const table = (sheets: unknown[]) => ({ sheets }) as never;
    expect(hasDrillCells(table([sheet([{ kind: 'body', c: [{ v: 1 }] }])]))).toBe(false);
    expect(
      hasDrillCells(table([sheet([]), sheet([{ kind: 'body', c: [{ v: 1, p: { report: 'x', params: {} } }] }])])),
    ).toBe(true);
  });
  it('sheetContentHeight — sarlavha + qatorlar + jami (+ chegara)', () => {
    expect(
      sheetContentHeight(
        sheet(
          [
            { kind: 'body', c: [] },
            { kind: 'body', c: [] },
          ],
          [{ kind: 'footer', c: [] }],
        ),
      ),
    ).toBe(HEADER_ROW_H + 3 * ROW_H + 2);
  });
});
