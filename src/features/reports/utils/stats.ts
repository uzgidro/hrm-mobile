// Hisobotlar sahifasining tayyor statistika tablari (web v2 `ReportsPage`):
//   «Murojaatlar statistikasi» — `service-requests/statistics` yig'masi (sana × tur × holat → soni);
//   jadval, diagramma va yig'ma plitkalar BITTA to'plamdan (filtr hammasiga birdek qo'llanadi);
//   «Kadrlar tarkibi» — dashboard yig'malari (jami, KPI, vazifalar, bo'lim/lavozim taqsimoti).
import dayjs from 'dayjs';
import { localISO } from './params';

export interface RequestStatRow {
  date: string;
  service_type: string;
  service_label: string;
  status: string;
  status_label: string;
  count: number;
}

export interface RequestStats {
  rows: RequestStatRow[];
  service_types: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
}

export interface RequestFilters {
  from: string;
  to: string;
  type: string;
  status: string;
}

export const EMPTY_REQUEST_FILTERS: RequestFilters = { from: '', to: '', type: '', status: '' };

/** v2 `useRequestStats` so'rov parametrlari: bo'sh qiymat yuborilmaydi. */
export function requestStatsParams(f: RequestFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.from) out.date_from = f.from;
  if (f.to) out.date_to = f.to;
  if (f.type) out.service_type = f.type;
  if (f.status) out.status = f.status;
  return out;
}

export const activeRequestFilters = (f: RequestFilters): number =>
  [f.from, f.to, f.type, f.status].filter(Boolean).length;

// v2 yig'ma plitkalari: ishlovda / berilgan / rad etilgan-bekor.
export const OPEN_STATUSES = ['accepted', 'in_review', 'in_progress', 'ready'];
export const DONE_STATUSES = ['issued'];
export const REJECTED_STATUSES = ['rejected', 'cancelled'];

export function requestSummary(rows: RequestStatRow[]) {
  const sum = (codes?: string[]) =>
    rows.filter((r) => !codes || codes.includes(r.status)).reduce((n, r) => n + r.count, 0);
  return { total: sum(), open: sum(OPEN_STATUSES), done: sum(DONE_STATUSES), rejected: sum(REJECTED_STATUSES) };
}

export type GroupBy = 'date' | 'service' | 'status';
export interface RowLabels {
  service: (code: string, fallback: string) => string;
  status: (code: string, fallback: string) => string;
}

/** Diagramma JADVAL ma'lumotidan: guruh kaliti bo'yicha yig'indi; sana — o'sish, qolgani — kamayish. */
export function chartData(
  rows: RequestStatRow[],
  groupBy: GroupBy,
  labels: RowLabels,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key =
      groupBy === 'date'
        ? r.date
        : groupBy === 'service'
          ? labels.service(r.service_type, r.service_label)
          : labels.status(r.status, r.status_label);
    map.set(key, (map.get(key) ?? 0) + r.count);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (groupBy === 'date' ? a.name.localeCompare(b.name) : b.value - a.value));
}

/** Davr diagrammasida ko'pi bilan shuncha ustun: undan ko'p kun — oylar, undan ko'p oy — yillar. */
export const MAX_PERIOD_BARS = 31;

/**
 * Butun davr (filtrsiz — yillar) kunma-kun chizilsa yuzlab ustun bo'lardi: kunlar
 * `MAX_PERIOD_BARS` dan ko'p bo'lsa oy (`YYYY-MM`), oylar ham ko'p bo'lsa yil (`YYYY`)
 * bo'yicha yig'iladi. Kirish o'sish tartibida (`chartData` 'date'), tartib saqlanadi.
 */
export function bucketPeriods(
  data: { name: string; value: number }[],
  max = MAX_PERIOD_BARS,
): { name: string; value: number }[] {
  let out = data;
  for (const len of [7, 4]) {
    if (out.length <= max) return out;
    const map = new Map<string, number>();
    for (const d of out) map.set(d.name.slice(0, len), (map.get(d.name.slice(0, len)) ?? 0) + d.value);
    out = [...map.entries()].map(([name, value]) => ({ name, value }));
  }
  return out;
}

/** Davr yorlig'i: `YYYY-MM-DD` → `DD.MM.YYYY`, `YYYY-MM` → `MM.YYYY`, yil — o'zi. */
export function periodLabel(name: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(name);
  if (!m) return name;
  if (m[3]) return `${m[3]}.${m[2]}.${m[1]}`;
  if (m[2]) return `${m[2]}.${m[1]}`;
  return m[1]!;
}

export type SortKey = 'date' | 'service' | 'status' | 'count';
export type Sort = { key: SortKey; dir: 'asc' | 'desc' };
export const DEFAULT_SORT: Sort = { key: 'date', dir: 'desc' };

/** v2: shu ustun — yo'nalish almashadi; boshqa ustun — o'sish bo'yicha. */
export const nextSort = (s: Sort, key: SortKey): Sort =>
  s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };

export function sortRows(rows: RequestStatRow[], sort: Sort, labels: RowLabels): RequestStatRow[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const value = (r: RequestStatRow): string | number =>
    sort.key === 'date'
      ? r.date
      : sort.key === 'service'
        ? labels.service(r.service_type, r.service_label)
        : sort.key === 'status'
          ? labels.status(r.status, r.status_label)
          : r.count;
  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

/** Taqsimot kartasi: eng kattasidan 8 tasi (v2 `DistributionCard`). */
export function topDistribution(data: { name: string; value: number }[], n = 8) {
  return [...data].sort((a, b) => b.value - a.value).slice(0, n);
}

/** Ustun uzunligi ulushi (0..1); eng kattasi — 1. */
export const barRatio = (value: number, max: number): number => (max > 0 ? Math.max(0, Math.min(1, value / max)) : 0);

/** v2 «O'rtacha KPI»: oylik o'rtachalar ro'yxatining OXIRGISI, butun songa. */
export function lastKpi(trend: { month: string; kpi_percentage: number | string }[] | undefined): number {
  const list = trend ?? [];
  if (!list.length) return 0;
  return Math.round(Number(list[list.length - 1]?.kpi_percentage) || 0);
}

/** v2 `defaultKpiRange`: o'tgan oyning shu kunidan bugungacha (qurilmaning mahalliy sanasi). */
export function kpiRange(today: Date = new Date()): { date_from: string; date_to: string } {
  return { date_from: dayjs(today).subtract(1, 'month').format('YYYY-MM-DD'), date_to: localISO(today) };
}

export interface DeptCount {
  department_id: number;
  department_name: string;
  total_count: number;
}
export interface PosStat {
  job_position_name: string;
  count: number;
}
/**
 * `dashboard/main` — bugungi ko'rsatkichlar toifalar bilan BITTA manbadan (server
 * `partition_counts`, bosh sahifa ham shu): «Jami xodimlar» bilan bir xil asosda.
 */
export interface MainStats {
  total_employees_count?: number;
  absent_employees_count?: number;
  late_employees_count?: number;
}
export interface CardsSummary {
  completed_tasks_count?: number;
}
export interface TaskExecutionStats {
  absent_employee_count?: number;
  late_employee_count?: number;
  kpi_below_50_employee_count?: number;
}
