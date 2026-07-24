import type { KpiEntry, KpiTask, KpiEntryAccess } from '@/types';
import {
  bandFor,
  KPI_BANDS,
  entryStatusKey,
  isPenaltyEntry,
  scorecardTotals,
  entryResultDisplay,
  resultColorKey,
  canEditTask,
  canGradeTask,
  canSetStatus,
  canAddTaskV2,
  isEntryLocked,
  factSum,
  parseScore,
} from '../utils';

const entry = (o: Partial<KpiEntry>): KpiEntry => ({ id: 1, ...o });
const task = (o: Partial<KpiTask>): KpiTask => ({ id: 1, ...o });
const access = (o: Partial<KpiEntryAccess> = {}): KpiEntryAccess => ({
  is_owner: false,
  edit_access: false,
  fact_insert_access: false,
  status_change_access: false,
  task_approve_access: false,
  manage_access: false,
  ...o,
});

// ─────────────────────────────────────────────────────────────────────────────
// bandFor — web KpiGauge.jsx parity: [0,20) [20,40) [40,60) [60,80) [80,100),
// value ≥ 100 → the top band; null → treated as 0 (bottom band).
// ─────────────────────────────────────────────────────────────────────────────
describe('bandFor', () => {
  it('maps each range to its band (half-open [from, to))', () => {
    expect(bandFor(0).labelKey).toBe('kpi.bandBad');
    expect(bandFor(19.9).labelKey).toBe('kpi.bandBad');
    expect(bandFor(20).labelKey).toBe('kpi.bandUnsatisfactory');
    expect(bandFor(40).labelKey).toBe('kpi.bandSatisfactory');
    expect(bandFor(60).labelKey).toBe('kpi.bandGood');
    expect(bandFor(80).labelKey).toBe('kpi.bandExcellent');
    expect(bandFor(99.9).labelKey).toBe('kpi.bandExcellent');
  });

  it('100 and above saturate to the top band (center still shows the real value)', () => {
    expect(bandFor(100)).toBe(KPI_BANDS[KPI_BANDS.length - 1]);
    expect(bandFor(150)).toBe(KPI_BANDS[KPI_BANDS.length - 1]);
  });

  it('null/undefined fall to the bottom band (web: bandFor(v ?? 0))', () => {
    expect(bandFor(null)).toBe(KPI_BANDS[0]);
    expect(bandFor(undefined)).toBe(KPI_BANDS[0]);
  });

  it('has exactly the 5 Verifix bands with the web colors', () => {
    expect(KPI_BANDS).toHaveLength(5);
    expect(KPI_BANDS.map((b) => b.color)).toEqual([
      '#F0506F', '#F6846B', '#FCD166', '#71D487', '#11D59D',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// entry / task status — legacy+new duality: locked ≡ D, draft ≡ N
// ─────────────────────────────────────────────────────────────────────────────
describe('entryStatusKey', () => {
  it("maps 'locked' and 'D' to final", () => {
    expect(entryStatusKey('locked')).toBe('final');
    expect(entryStatusKey('D')).toBe('final');
  });
  it("maps 'I' to inProgress", () => {
    expect(entryStatusKey('I')).toBe('inProgress');
  });
  it('everything else (draft, N, null) is draft', () => {
    expect(entryStatusKey('draft')).toBe('draft');
    expect(entryStatusKey('N')).toBe('draft');
    expect(entryStatusKey(null)).toBe('draft');
    expect(entryStatusKey(undefined)).toBe('draft');
  });
});

describe('isEntryLocked', () => {
  it('locked for status locked/D only', () => {
    expect(isEntryLocked(entry({ status: 'locked' }))).toBe(true);
    expect(isEntryLocked(entry({ status: 'D' }))).toBe(true);
    expect(isEntryLocked(entry({ status: 'I' }))).toBe(false);
    expect(isEntryLocked(entry({ status: 'draft' }))).toBe(false);
    expect(isEntryLocked(entry({}))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Penalty rows + totals — web EmployeeKpiScreen.jsx parity
// ─────────────────────────────────────────────────────────────────────────────
describe('isPenaltyEntry', () => {
  it("true only when indicator.direction is 'L' (missing → 'M')", () => {
    expect(isPenaltyEntry(entry({ indicator: { id: 1, direction: 'L' } }))).toBe(true);
    expect(isPenaltyEntry(entry({ indicator: { id: 1, direction: 'M' } }))).toBe(false);
    expect(isPenaltyEntry(entry({ indicator: { id: 1 } }))).toBe(false);
    expect(isPenaltyEntry(entry({}))).toBe(false);
  });
});

describe('scorecardTotals', () => {
  it('sums plan/fact from M rows, penalty facts separately, net = add − sub', () => {
    const entries = [
      entry({ id: 1, plan_value: 100, fact_value: 80, indicator: { id: 1, direction: 'M' } }),
      entry({ id: 2, plan_value: 50, fact_value: 30, indicator: { id: 2, direction: 'M' } }),
      entry({ id: 3, plan_value: 0, fact_value: 10, indicator: { id: 3, direction: 'L' } }),
    ];
    expect(scorecardTotals(entries)).toEqual({ plan: 150, addFact: 110, subFact: 10, net: 100 });
  });

  it('penalty plan does NOT join the plan sum (web parity)', () => {
    const entries = [
      entry({ id: 1, plan_value: 100, fact_value: 0, indicator: { id: 1, direction: 'L' } }),
    ];
    expect(scorecardTotals(entries)).toEqual({ plan: 0, addFact: 0, subFact: 0, net: 0 });
  });

  it('handles empty/undefined values', () => {
    expect(scorecardTotals([])).toEqual({ plan: 0, addFact: 0, subFact: 0, net: 0 });
    expect(scorecardTotals(undefined)).toEqual({ plan: 0, addFact: 0, subFact: 0, net: 0 });
    expect(scorecardTotals([entry({})])).toEqual({ plan: 0, addFact: 0, subFact: 0, net: 0 });
  });
});

describe('entryResultDisplay', () => {
  it('penalty rows show −fact (not a percent); zero fact shows "0"', () => {
    expect(entryResultDisplay(entry({ fact_value: 10, indicator: { id: 1, direction: 'L' } }))).toBe('−10');
    expect(entryResultDisplay(entry({ fact_value: 0, indicator: { id: 1, direction: 'L' } }))).toBe('0');
  });
  it('normal rows show rounded result_percent with %; null → dash', () => {
    expect(entryResultDisplay(entry({ result_percent: 87.6 }))).toBe('88%');
    expect(entryResultDisplay(entry({ result_percent: null }))).toBe('—');
    expect(entryResultDisplay(entry({}))).toBe('—');
  });
});

describe('resultColorKey', () => {
  it('≥75 good, ≥50 mid, <50 bad, null muted (web thresholds)', () => {
    expect(resultColorKey(75)).toBe('good');
    expect(resultColorKey(90)).toBe('good');
    expect(resultColorKey(50)).toBe('mid');
    expect(resultColorKey(74.9)).toBe('mid');
    expect(resultColorKey(49.9)).toBe('bad');
    expect(resultColorKey(0)).toBe('bad');
    expect(resultColorKey(null)).toBe('muted');
    expect(resultColorKey(undefined)).toBe('muted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Verifix task permissions — derived from entry.my_access (backend
// KpiEntryAccess). manage_access (HR/master/kpi_admin) grants everything;
// owner => edit_access; supervisor => task_approve_access; stakeholder per grant.
// ─────────────────────────────────────────────────────────────────────────────
describe('canEditTask', () => {
  it('true with edit_access or manage_access', () => {
    expect(canEditTask(access({ edit_access: true }))).toBe(true);
    expect(canEditTask(access({ manage_access: true }))).toBe(true);
  });
  it('false without either, and for null access', () => {
    expect(canEditTask(access())).toBe(false);
    expect(canEditTask(null)).toBe(false);
    expect(canEditTask(undefined)).toBe(false);
  });
});

describe('canGradeTask', () => {
  it('true for task_approve_access, edit_access (owner grades own), or manage_access', () => {
    expect(canGradeTask(access({ task_approve_access: true }))).toBe(true);
    expect(canGradeTask(access({ edit_access: true }))).toBe(true);
    expect(canGradeTask(access({ manage_access: true }))).toBe(true);
  });
  it('false without any grade right and for null access', () => {
    expect(canGradeTask(access())).toBe(false);
    expect(canGradeTask(null)).toBe(false);
  });
});

describe('canSetStatus', () => {
  it('true for task_approve_access, status_change_access, or manage_access', () => {
    expect(canSetStatus(access({ task_approve_access: true }))).toBe(true);
    expect(canSetStatus(access({ status_change_access: true }))).toBe(true);
    expect(canSetStatus(access({ manage_access: true }))).toBe(true);
  });
  it('false otherwise and for null access', () => {
    expect(canSetStatus(access())).toBe(false);
    expect(canSetStatus(null)).toBe(false);
  });
});

describe('canAddTaskV2', () => {
  const hasTasks = { id: 1, has_tasks: true } as const;
  it('needs edit_access AND a has_tasks indicator AND an unlocked entry', () => {
    expect(canAddTaskV2(access({ edit_access: true }), entry({ status: 'I', indicator: hasTasks }))).toBe(true);
    expect(canAddTaskV2(access({ manage_access: true }), entry({ status: 'N', indicator: hasTasks }))).toBe(true);
  });
  it('blocked when locked, no edit right, or the indicator has no tasks', () => {
    expect(canAddTaskV2(access({ edit_access: true }), entry({ status: 'D', indicator: hasTasks }))).toBe(false);
    expect(canAddTaskV2(access({ edit_access: true }), entry({ status: 'locked', indicator: hasTasks }))).toBe(false);
    expect(canAddTaskV2(access(), entry({ status: 'I', indicator: hasTasks }))).toBe(false);
    expect(canAddTaskV2(access({ edit_access: true }), entry({ status: 'I', indicator: { id: 1, has_tasks: false } }))).toBe(false);
    expect(canAddTaskV2(access({ edit_access: true }), entry({ status: 'I' }))).toBe(false);
    expect(canAddTaskV2(null, entry({ status: 'I', indicator: hasTasks }))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseScore — the confirm-score input guard. Empty = 0 (web/backend parity:
// score is optional and defaults to 0); comma decimals accepted (RU/UZ numeric
// keyboards); garbage → null so the UI can block the submit instead of silently
// confirming an unre-reviewable task with score 0.
// ─────────────────────────────────────────────────────────────────────────────
describe('parseScore', () => {
  it('parses plain and decimal numbers', () => {
    expect(parseScore('80')).toBe(80);
    expect(parseScore('80.5')).toBe(80.5);
    expect(parseScore(' 12 ')).toBe(12);
  });
  it('accepts a comma decimal separator (RU/UZ keyboards)', () => {
    expect(parseScore('80,5')).toBe(80.5);
  });
  it('empty input means 0 (deliberate web/backend parity)', () => {
    expect(parseScore('')).toBe(0);
    expect(parseScore('   ')).toBe(0);
  });
  it('garbage and negatives are invalid (null) — backend rejects score < 0', () => {
    expect(parseScore('abc')).toBeNull();
    expect(parseScore('8o')).toBeNull();
    expect(parseScore('-5')).toBeNull();
  });
});

// factSum: the entry fact is the sum of scores of tasks whose task_status
// counts_for_fact (backend _compute_entry_fact). Mirrors the backend server-side.
describe('factSum', () => {
  it('sums scores of tasks whose task_status.counts_for_fact is true', () => {
    const tasks = [
      task({ id: 1, score: 30, task_status: { counts_for_fact: true } }),
      task({ id: 2, score: 20.5, task_status: { counts_for_fact: true } }),
      task({ id: 3, score: 99, task_status: { counts_for_fact: false } }),
      task({ id: 4, score: null, task_status: { counts_for_fact: true } }),
      task({ id: 5, score: 10, task_status: null }),
    ];
    expect(factSum(tasks)).toBe(50.5);
  });
  it('empty/undefined → 0', () => {
    expect(factSum([])).toBe(0);
    expect(factSum(undefined)).toBe(0);
  });
});
