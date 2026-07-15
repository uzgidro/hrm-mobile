import type { KpiEntry, KpiTask } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Pure presentation/permission logic for the KPI feature. Mirrors the web
// byte-for-byte: KpiGauge.jsx (bands), EmployeeKpiScreen.jsx (statuses, totals,
// penalty display, result colors), EntryTasksPage.jsx (owner task rules).
// Status/direction CODES are backend contract identifiers (web parity) — only
// display labels localize, via the i18n keys referenced here.
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

export type TaskStatusKey = 'draft' | 'submitted' | 'confirmed' | 'rejected';

export function taskStatusKey(status: string | null | undefined): TaskStatusKey {
  if (status === 'submitted' || status === 'confirmed' || status === 'rejected') return status;
  return 'draft';
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

// ── Owner task rules (web EntryTasksPage) ────────────────────────────────────
// The owner adds tasks only on a has_tasks entry that is not finalized. Score
// entry is supervisor-only (on confirm) — the owner never inputs a score.
export function canAddTask(entry: KpiEntry, isOwner: boolean): boolean {
  return isOwner && !!entry.indicator?.has_tasks && !isEntryLocked(entry);
}

// Edit/submit/delete are owner actions on DRAFT tasks only, while unlocked.
// Strict equality (not taskStatusKey) mirrors the web's `t.status === 'draft'`
// gate: an unknown/new backend status must NOT expose actions the server would
// reject — taskStatusKey's draft fallback is for display labels only.
export function canActOnTask(
  task: KpiTask,
  { isOwner, entryLocked }: { isOwner: boolean; entryLocked: boolean }
): boolean {
  return isOwner && !entryLocked && task.status === 'draft';
}

// "Tasdiqlangan yig'indi" — confirmed task scores sum (backend mirrors this
// into entry.fact_value, capped at indicator.max_percent).
export function confirmedTaskSum(tasks: KpiTask[] | undefined): number {
  return (tasks ?? [])
    .filter((t) => t.status === 'confirmed')
    .reduce((s, t) => s + Number(t.score || 0), 0);
}
