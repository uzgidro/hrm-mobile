import {
  branchDeps,
  buildRunBody,
  canGenerate,
  defaultParams,
  divisionTree,
  initialParams,
  isRangeInvalid,
  isRangeTooLong,
  isTimeValid,
  isWebOnlyReport,
  localISO,
  paramErrors,
  reportHomeBranchId,
  reportLang,
  requiredMissing,
  selectionSummary,
  toggleMany,
  toggleOne,
  visibleParams,
} from '../params';
import type { ParamDef } from '../types';

const def = (p: Partial<ParamDef> & Pick<ParamDef, 'name' | 'kind'>): ParamDef => ({
  label_key: `p.${p.name}`,
  required: false,
  default: null,
  options_source: null,
  depends_on: [],
  multiple: false,
  choices: [],
  ...p,
});

// Mahalliy konstruktor + mahalliy getterlar — TZ'dan mustaqil.
const TODAY = new Date(2026, 0, 15);

describe('defaultParams (v2 paramsUrl / server resolve_default)', () => {
  it('current_month: oraliq — oyning birinchi va oxirgi kuni; oy — YYYY-MM', () => {
    const out = defaultParams(
      [
        def({ name: 'period', kind: 'date_range', default: 'current_month' }),
        def({ name: 'month', kind: 'month', default: 'current_month' }),
      ],
      TODAY,
    );
    expect(out).toEqual({ period: { from: '2026-01-01', to: '2026-01-31' }, month: '2026-01' });
  });

  it("today, previous_month (yil o'tishi), twelve_months_ago, literal; null — kalit yo'q", () => {
    const out = defaultParams(
      [
        def({ name: 'date', kind: 'date', default: 'today' }),
        def({ name: 'prev', kind: 'month', default: 'previous_month' }),
        def({ name: 'from', kind: 'month', default: 'twelve_months_ago' }),
        def({ name: 'ranges', kind: 'text', default: '15,30,60' }),
        def({ name: 'kind', kind: 'enum', default: 'age' }),
        def({ name: 'branch_ids', kind: 'branch_multi' }),
      ],
      TODAY,
    );
    expect(out).toEqual({ date: '2026-01-15', prev: '2025-12', from: '2025-02', ranges: '15,30,60', kind: 'age' });
    expect('branch_ids' in out).toBe(false);
  });

  it('fevral kabisa yili', () => {
    expect(
      defaultParams([def({ name: 'p', kind: 'date_range', default: 'current_month' })], new Date(2028, 1, 3)),
    ).toEqual({
      p: { from: '2028-02-01', to: '2028-02-29' },
    });
  });

  it('localISO — mahalliy sana', () => {
    expect(localISO(new Date(2026, 8, 1, 0, 5))).toBe('2026-09-01');
  });
});

describe("initialParams — sarlavha filiali o'rnini bosuvchi qoida (v2 ReportRunPage)", () => {
  it("branch_id (KPI) — o'z filiali", () => {
    const defs = [def({ name: 'branch_id', kind: 'int', options_source: 'branches' })];
    expect(initialParams(defs, 7, TODAY)).toEqual({ branch_id: 7 });
    expect(initialParams(defs, undefined, TODAY)).toEqual({});
  });
  it("branch_ids (tabel) — v2 kabi sarlavha filiali [o'z filiali], butun tashkilot emas (8 MB); filial yo'q — bo'sh", () => {
    const multi = [def({ name: 'branch_ids', kind: 'branch_multi', options_source: 'branches' })];
    expect(initialParams(multi, 7, TODAY)).toEqual({ branch_ids: [7] });
    expect(initialParams(multi, undefined, TODAY)).toEqual({});
  });
});

describe("reportHomeBranchId — v2 sarlavha filialining boshlang'ich qiymati (useBranchInit)", () => {
  it("xodim — o'z filiali; filialli admin — o'sha filial; sayt bosh admini — bosh filial (1)", () => {
    expect(reportHomeBranchId({ type: 'employee', employee: { primary_organization_branch_id: 30 } } as never)).toBe(30);
    expect(reportHomeBranchId({ type: 'admin', admin: { organization_branch_id: 4 } } as never)).toBe(4);
    expect(reportHomeBranchId({ type: 'master-admin' } as never)).toBe(1);
  });
  it("filialsiz admin / mehmon / foydalanuvchi yo'q — undefined (server doirasi)", () => {
    expect(reportHomeBranchId({ type: 'admin', admin: { organization_branch_id: null } } as never)).toBeUndefined();
    expect(reportHomeBranchId({ type: 'guest' } as never)).toBeUndefined();
    expect(reportHomeBranchId(null)).toBeUndefined();
  });
});

describe('requiredMissing / paramErrors / canGenerate', () => {
  const defs = [
    def({ name: 'period', kind: 'date_range', required: true }),
    def({ name: 'reason', kind: 'enum', required: true }),
    def({ name: 'ids', kind: 'job_multi' }),
  ];
  it("oraliq ikkala chegarasi bilan; enum bo'sh — yetishmaydi", () => {
    expect(requiredMissing(defs, { period: { from: '2026-01-01' }, reason: 'x' })).toBe(true);
    expect(requiredMissing(defs, { period: { from: '2026-01-01', to: '2026-01-31' }, reason: '' })).toBe(true);
    expect(requiredMissing(defs, { period: { from: '2026-01-01', to: '2026-01-31' }, reason: 'x' })).toBe(false);
  });
  it("majburiy ro'yxat bo'sh massiv — yetishmaydi", () => {
    expect(requiredMissing([def({ name: 'e', kind: 'employee_multi', required: true })], { e: [] })).toBe(true);
  });
  it("teskari oraliq, noto'g'ri soat, butun bo'lmagan son — xato", () => {
    const d2 = [
      def({ name: 'period', kind: 'date_range' }),
      def({ name: 'tr', kind: 'time_range' }),
      def({ name: 'min_age', kind: 'int' }),
    ];
    expect(
      paramErrors(d2, { period: { from: '2026-02-01', to: '2026-01-01' }, tr: { from: '25:00' }, min_age: 1.5 }),
    ).toEqual({ period: 'range', tr: 'time', min_age: 'int' });
    expect(
      paramErrors(d2, { period: { from: '2026-01-01', to: '2026-01-01' }, tr: { from: '8:30', to: '' }, min_age: 3 }),
    ).toEqual({});
    expect(canGenerate(d2, { tr: { from: 'x' } })).toBe(false);
    expect(canGenerate(d2, {})).toBe(true);
  });
  it("oraliq 366 kundan uzun — server rad etadi, mobil oldindan to'xtatadi", () => {
    expect(isRangeTooLong({ from: '2025-01-01', to: '2026-01-02' })).toBe(false); // 366 kun
    expect(isRangeTooLong({ from: '2025-01-01', to: '2026-01-03' })).toBe(true);
    expect(
      paramErrors([def({ name: 'p', kind: 'date_range' })], { p: { from: '2024-01-01', to: '2026-01-01' } }),
    ).toEqual({
      p: 'long',
    });
  });
  it('isRangeInvalid / isTimeValid', () => {
    expect(isRangeInvalid({ from: '2026-01-02', to: '2026-01-01' })).toBe(true);
    expect(isRangeInvalid({ from: '2026-01-02' })).toBe(false);
    expect(isTimeValid('23:59')).toBe(true);
    expect(isTimeValid('24:00')).toBe(false);
    expect(isTimeValid('12:60')).toBe(false);
    expect(isTimeValid('')).toBe(true);
  });
});

describe("qo'llab-quvvatlanmagan tur", () => {
  it("majburiy parametr noma'lum turda — hisobot web'da; ixtiyoriysi shunchaki yashiriladi", () => {
    const weird = def({ name: 'geo', kind: 'map_area' as never, required: true });
    expect(isWebOnlyReport({ params: [weird] })).toBe(true);
    expect(isWebOnlyReport({ params: [{ ...weird, required: false }] })).toBe(false);
    expect(visibleParams([{ ...weird, required: false }, def({ name: 'd', kind: 'date' })]).map((d) => d.name)).toEqual(
      ['d'],
    );
  });
});

describe('branchDeps / reportLang / buildRunBody', () => {
  it("depends_on — ro'yxat yoki skalyar", () => {
    const d = def({ name: 'division_ids', kind: 'division_tree', depends_on: ['branch_ids', 'branch_id'] });
    expect(branchDeps(d, { branch_ids: [1, 2], branch_id: 3 })).toEqual([1, 2, 3]);
    expect(branchDeps(d, { branch_ids: [], branch_id: null })).toEqual([]);
  });
  it('til: ru — ru; uz-Latn, uz-Cyrl, en — uz (v2 currentLang)', () => {
    expect(reportLang('ru')).toBe('ru');
    expect(reportLang('uz-Latn')).toBe('uz');
    expect(reportLang('uz-Cyrl')).toBe('uz');
    expect(reportLang('en')).toBe('uz');
  });
  it('tana: format json, prefs null (server saqlanganini oladi), undefined tashlanadi', () => {
    expect(buildRunBody({ a: 1, b: undefined, c: null }, 'ru')).toEqual({
      params: { a: 1, c: null },
      prefs: null,
      format: 'json',
      drill: null,
      lang: 'ru',
    });
    const drill = { report: 'x', params: { id: 1 } };
    expect(buildRunBody({}, 'uz', drill).drill).toBe(drill);
  });
});

describe('tanlov yordamchilari', () => {
  it('selectionSummary', () => {
    expect(selectionSummary([], {})).toBe('');
    expect(selectionSummary([1], { '1': 'A' })).toBe('A');
    expect(selectionSummary([1, 2, 3, 4], { '1': 'A', '2': 'B' })).toBe('A, B +2');
    expect(selectionSummary([9], {})).toBe('#9');
  });
  it('toggleOne / toggleMany — satr va son bir xil kalit', () => {
    expect(toggleOne([1, 2], 2)).toEqual([1]);
    expect(toggleOne([1], '3')).toEqual([1, '3']);
    expect(toggleMany([1], [1, 2, 3], true)).toEqual([1, 2, 3]);
    expect(toggleMany([1, 2, 5], [1, 2, 3], false)).toEqual([5]);
  });
  it("divisionTree: filial → bo'limlar, qidiruv", () => {
    const opts = [
      { value: 'b1', label: 'Chorvoq', is_branch: true },
      { value: 'b2', label: 'Farhod', is_branch: true },
      { value: 10, label: 'Kadrlar', parent: 'b1' },
      { value: 11, label: 'Buxgalteriya', parent: 'b1' },
      { value: 20, label: 'Kadrlar', parent: 'b2' },
    ];
    expect(divisionTree(opts, '').map((n) => [n.branch.value, n.depts.map((d) => d.value)])).toEqual([
      ['b1', [10, 11]],
      ['b2', [20]],
    ]);
    expect(divisionTree(opts, 'buxg').map((n) => [n.branch.value, n.depts.map((d) => d.value)])).toEqual([
      ['b1', [11]],
    ]);
    // Filial nomi mos — filial qoladi (bo'limlari qidiruvga mos kelmasa ham bo'sh).
    expect(divisionTree(opts, 'farhod').map((n) => [n.branch.value, n.depts.length])).toEqual([['b2', 0]]);
  });
});
