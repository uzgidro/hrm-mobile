import type { KpiEntry, KpiTask, KpiEntryAccess } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Pure presentation/permission logic for the KPI feature. Mirrors the web
// byte-for-byte: KpiGauge.jsx (bands), EmployeeKpiScreen.jsx (statuses, totals,
// penalty display, result colors), EntryTasksPage.jsx (task permissions read
// from entry.my_access). Status/direction CODES are backend contract
// identifiers (web parity) — only display labels localize, via the i18n keys.
// ─────────────────────────────────────────────────────────────────────────────

// ── Gauge bands (Verifix 5-band, 100-scale) ──────────────────────────────────
export interface KpiBand {
  from: number;
  to: number;
  color: string;
  labelKey: string;
}

export const KPI_BANDS: KpiBand[] = [
  { from: 0, to: 20, color: '#F0506F', labelKey: 'kpi.bandBad' },
  { from: 20, to: 40, color: '#F6846B', labelKey: 'kpi.bandUnsatisfactory' },
  { from: 40, to: 60, color: '#FCD166', labelKey: 'kpi.bandSatisfactory' },
  { from: 60, to: 80, color: '#71D487', labelKey: 'kpi.bandGood' },
  { from: 80, to: 100, color: '#11D59D', labelKey: 'kpi.bandExcellent' },
];

// Band on the 100-scale: ≥100 saturates to the top band; the gauge center still
// shows the real value (up to ~170%) — only the band/needle are clamped.
export function bandFor(value: number | null | undefined): KpiBand {
  const v = value == null ? 0 : Number(value);
  if (v >= 100) return KPI_BANDS[KPI_BANDS.length - 1];
  for (const b of KPI_BANDS) {
    if (v >= b.from && v < b.to) return b;
  }
  return KPI_BANDS[0];
}

// ── Entry / task statuses ────────────────────────────────────────────────────
// Entry status duality: legacy 'locked' ≡ new 'D' (final), legacy 'draft' ≡ 'N'.
export type EntryStatusKey = 'final' | 'inProgress' | 'draft';

export function entryStatusKey(status: string | null | undefined): EntryStatusKey {
  if (status === 'locked' || status === 'D') return 'final';
  if (status === 'I') return 'inProgress';
  return 'draft';
}

// A finalized period — tasks/bonuses are immutable.
export function isEntryLocked(entry: KpiEntry): boolean {
  return entry.status === 'locked' || entry.status === 'D';
}

// ── Penalty rows + table totals (web EmployeeKpiScreen) ──────────────────────
/** direction 'L' = penalty (subtracted); a missing direction means 'M'. */
export function isPenaltyEntry(entry: KpiEntry): boolean {
  return (entry.indicator?.direction || 'M') === 'L';
}

export interface ScorecardTotals {
  plan: number;
  addFact: number;
  subFact: number;
  net: number;
}

// Verifix aggregation: M rows add plan+fact; L (penalty) rows contribute only
// their fact to the subtraction. Plan sum comes from M rows ONLY.
export function scorecardTotals(entries: KpiEntry[] | undefined): ScorecardTotals {
  let plan = 0;
  let addFact = 0;
  let subFact = 0;
  for (const e of entries ?? []) {
    if (isPenaltyEntry(e)) {
      subFact += Number(e.fact_value || 0);
    } else {
      plan += Number(e.plan_value || 0);
      addFact += Number(e.fact_value || 0);
    }
  }
  return { plan, addFact, subFact, net: addFact - subFact };
}

// The "Natija %" cell: penalty rows show −fact (a subtracted amount, NOT a
// percent); normal rows show the rounded result_percent.
export function entryResultDisplay(entry: KpiEntry): string {
  if (isPenaltyEntry(entry)) {
    const fact = Number(entry.fact_value || 0);
    return fact > 0 ? `−${fact}` : '0';
  }
  if (entry.result_percent == null) return '—';
  return `${Number(entry.result_percent).toFixed(0)}%`;
}

// Verifix result color thresholds: ≥75 green, ≥50 yellow, <50 red.
export type ResultColorKey = 'good' | 'mid' | 'bad' | 'muted';

export function resultColorKey(value: number | null | undefined): ResultColorKey {
  if (value == null) return 'muted';
  if (value >= 75) return 'good';
  if (value >= 50) return 'mid';
  return 'bad';
}

// ── Verifix task permissions (from entry.my_access) ──────────────────────────
// The backend fills entry.my_access on the detail endpoint (KpiEntryAccess).
// manage_access (HR/master/kpi_admin) grants every action; the helpers below
// OR it in so a manager is never blocked. Mirrors the web EntryTasksPage, which
// reads the same flags off entry.my_access instead of re-deriving from roles.

// Add/rename/delete a task.
export function canEditTask(access: KpiEntryAccess | null | undefined): boolean {
  return !!access && (access.edit_access || access.manage_access);
}

// Set a task score (set-grade). Owners grade their own on create (edit_access);
// approvers grade on review (task_approve_access).
export function canGradeTask(access: KpiEntryAccess | null | undefined): boolean {
  return !!access && (access.task_approve_access || access.edit_access || access.manage_access);
}

// Move a task through the status catalog (set-status).
export function canSetStatus(access: KpiEntryAccess | null | undefined): boolean {
  return !!access && (access.task_approve_access || access.status_change_access || access.manage_access);
}

// Add a new task: needs edit rights AND a has_tasks indicator AND an open entry.
export function canAddTaskV2(access: KpiEntryAccess | null | undefined, entry: KpiEntry): boolean {
  return canEditTask(access) && !!entry.indicator?.has_tasks && !isEntryLocked(entry);
}

// Parse a grade input for display/validation. Empty = 0 (score is optional and
// defaults to 0); a comma decimal separator is accepted (RU/UZ numeric keyboards
// emit it); garbage or negatives → null so the caller BLOCKS the save — a NaN
// would silently write score 0. Backend rejects score < 0 and > 100000.
export function parseScore(input: string): number | null {
  const raw = input.trim();
  if (!raw) return 0;
  const n = Number(raw.replace(',', '.'));
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

// "Hisobga olingan yig'indi" — the entry fact is the sum of scores of tasks
// whose status counts_for_fact (backend _compute_entry_fact). Mirrors the
// backend so the screen can show the running total before its refetch lands.
export function factSum(tasks: KpiTask[] | undefined): number {
  return (tasks ?? [])
    .filter((t) => t.task_status?.counts_for_fact)
    .reduce((s, t) => s + Number(t.score || 0), 0);
}
