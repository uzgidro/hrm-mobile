import {
  activeRequestFilters,
  barRatio,
  bucketPeriods,
  chartData,
  DEFAULT_SORT,
  kpiRange,
  lastKpi,
  nextSort,
  periodLabel,
  requestStatsParams,
  requestSummary,
  sortRows,
  topDistribution,
  type RequestStatRow,
} from '../stats';
import { catalogMatch, groupCatalog } from '../catalog';
import type { ReportCatalogItem } from '../types';

const rows: RequestStatRow[] = [
  {
    date: '2026-09-02',
    service_type: 'work_certificate',
    service_label: 'Ma',
    status: 'issued',
    status_label: 'B',
    count: 3,
  },
  {
    date: '2026-09-01',
    service_type: 'reference_letter',
    service_label: 'Ta',
    status: 'in_review',
    status_label: 'K',
    count: 2,
  },
  {
    date: '2026-09-02',
    service_type: 'reference_letter',
    service_label: 'Ta',
    status: 'rejected',
    status_label: 'R',
    count: 1,
  },
  {
    date: '2026-09-03',
    service_type: 'work_certificate',
    service_label: 'Ma',
    status: 'cancelled',
    status_label: 'C',
    count: 4,
  },
];
const labels = { service: (c: string) => `S:${c}`, status: (c: string) => `T:${c}` };

describe('murojaatlar statistikasi', () => {
  it("parametrlar: bo'sh yuborilmaydi", () => {
    expect(requestStatsParams({ from: '2026-09-01', to: '', type: 'x', status: '' })).toEqual({
      date_from: '2026-09-01',
      service_type: 'x',
    });
    expect(activeRequestFilters({ from: '2026-09-01', to: '', type: 'x', status: '' })).toBe(2);
  });
  it("yig'ma: jami, ishlovda, berilgan, rad/bekor", () => {
    expect(requestSummary(rows)).toEqual({ total: 10, open: 2, done: 3, rejected: 5 });
  });
  it("diagramma: sana — o'sish; tur/holat — kamayish; yorliq tarjimadan", () => {
    expect(chartData(rows, 'date', labels)).toEqual([
      { name: '2026-09-01', value: 2 },
      { name: '2026-09-02', value: 4 },
      { name: '2026-09-03', value: 4 },
    ]);
    expect(chartData(rows, 'service', labels)).toEqual([
      { name: 'S:work_certificate', value: 7 },
      { name: 'S:reference_letter', value: 3 },
    ]);
    expect(chartData(rows, 'status', labels)[0]).toEqual({ name: 'T:cancelled', value: 4 });
  });
  it('saralash: v2 nextSort va sortRows', () => {
    expect(nextSort(DEFAULT_SORT, 'date')).toEqual({ key: 'date', dir: 'asc' });
    expect(nextSort(DEFAULT_SORT, 'count')).toEqual({ key: 'count', dir: 'asc' });
    expect(sortRows(rows, DEFAULT_SORT, labels).map((r) => r.date)).toEqual([
      '2026-09-03',
      '2026-09-02',
      '2026-09-02',
      '2026-09-01',
    ]);
    expect(sortRows(rows, { key: 'count', dir: 'desc' }, labels).map((r) => r.count)).toEqual([4, 3, 2, 1]);
  });
});

describe('kadrlar tarkibi', () => {
  it('topDistribution — 8 ta eng katta', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ name: `d${i}`, value: i }));
    expect(topDistribution(data).map((d) => d.value)).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
  });
  it('barRatio', () => {
    expect(barRatio(5, 10)).toBe(0.5);
    expect(barRatio(5, 0)).toBe(0);
    expect(barRatio(20, 10)).toBe(1);
  });
  it('lastKpi — oxirgi oy, butun', () => {
    expect(
      lastKpi([
        { month: '2026-08', kpi_percentage: 70 },
        { month: '2026-09', kpi_percentage: '81.6' },
      ]),
    ).toBe(82);
    expect(lastKpi([])).toBe(0);
    expect(lastKpi(undefined)).toBe(0);
  });
  it("kpiRange — o'tgan oyning shu kuni → bugun (oy oxiri qisqaradi)", () => {
    expect(kpiRange(new Date(2026, 2, 31))).toEqual({ date_from: '2026-02-28', date_to: '2026-03-31' });
    expect(kpiRange(new Date(2026, 0, 15))).toEqual({ date_from: '2025-12-15', date_to: '2026-01-15' });
  });
});

describe('katalog', () => {
  const item = (code: string, category: ReportCatalogItem['category'], hidden = false) =>
    ({
      code,
      category,
      hidden,
      title_key: `r.${code}`,
      params: [],
      prefs: [],
      formats: [],
      supports_templates: false,
      drills: [],
    }) as ReportCatalogItem;
  it("toifa tartibi davomat → kadrlar → KPI, bo'sh guruh va hidden yo'q", () => {
    const g = groupCatalog([
      item('kpi_report', 'kpi'),
      item('staffing', 'hr'),
      item('timesheet', 'attendance'),
      item('x_detail', 'hr', true),
    ]);
    expect(g.map((x) => [x.key, x.items.map((i) => i.code)])).toEqual([
      ['attendance', ['timesheet']],
      ['hr', ['staffing']],
      ['kpi', ['kpi_report']],
    ]);
    expect(groupCatalog([item('kpi_report', 'kpi')], () => false)).toEqual([]);
  });
  it('qidiruv: nom, izoh, kod', () => {
    const it0 = item('lateness_report', 'attendance');
    expect(catalogMatch(it0, 'KECHIK', 'Kechikishlar hisoboti', '')).toBe(true);
    expect(catalogMatch(it0, 'turniket', 'X', "turniket ma'lumoti")).toBe(true);
    expect(catalogMatch(it0, 'lateness', 'X', '')).toBe(true);
    expect(catalogMatch(it0, 'zzz', 'X', '')).toBe(false);
    expect(catalogMatch(it0, '  ', 'X', '')).toBe(true);
  });
});

describe('davr diagrammasi chegarasi', () => {
  const days = (n: number, start = '2026-01-01') => {
    const d0 = Date.parse(`${start}T00:00:00Z`);
    return Array.from({ length: n }, (_, i) => ({
      name: new Date(d0 + i * 86_400_000).toISOString().slice(0, 10),
      value: 1,
    }));
  };
  it("31 tagacha kun — o'zgarishsiz", () => {
    const d = days(31);
    expect(bucketPeriods(d)).toBe(d);
  });
  it("31 dan ko'p kun — oylar bo'yicha yig'indi, tartib saqlanadi", () => {
    expect(bucketPeriods(days(40))).toEqual([
      { name: '2026-01', value: 31 },
      { name: '2026-02', value: 9 },
    ]);
  });
  it("31 dan ko'p oy — yillar bo'yicha", () => {
    const d = days(1200, '2024-01-01');
    const out = bucketPeriods(d);
    expect(out.map((x) => x.name)).toEqual(['2024', '2025', '2026', '2027']);
    expect(out.reduce((n, x) => n + x.value, 0)).toBe(1200);
  });
  it('periodLabel — kun, oy, yil', () => {
    expect(periodLabel('2026-09-02')).toBe('02.09.2026');
    expect(periodLabel('2026-09')).toBe('09.2026');
    expect(periodLabel('2026')).toBe('2026');
  });
});
