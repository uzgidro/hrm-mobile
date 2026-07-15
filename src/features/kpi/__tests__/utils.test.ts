import type { KpiEntry, KpiTask } from '@/types';
import {
  bandFor,
  KPI_BANDS,
  entryStatusKey,
  taskStatusKey,
  isPenaltyEntry,
  scorecardTotals,
  entryResultDisplay,
  resultColorKey,
  canAddTask,
  canActOnTask,
  isEntryLocked,
  confirmedTaskSum,
} from '../utils';

const entry = (o: Partial<KpiEntry>): KpiEntry => ({ id: 1, ...o });
const task = (o: Partial<KpiTask>): KpiTask => ({ id: 1, ...o });

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

describe('taskStatusKey', () => {
  it('passes known statuses through and falls back to draft', () => {
    expect(taskStatusKey('submitted')).toBe('submitted');
    expect(taskStatusKey('confirmed')).toBe('confirmed');
    expect(taskStatusKey('rejected')).toBe('rejected');
    expect(taskStatusKey('draft')).toBe('draft');
    expect(taskStatusKey('weird')).toBe('draft');
    expect(taskStatusKey(null)).toBe('draft');
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
// Owner task actions — web EntryTasksPage.jsx rules
// ─────────────────────────────────────────────────────────────────────────────
describe('canAddTask', () => {
  const hasTasks = { id: 1, has_tasks: true } as const;
  it('owner may add only on a has_tasks entry that is not locked', () => {
    expect(canAddTask(entry({ status: 'I', indicator: hasTasks }), true)).toBe(true);
    expect(canAddTask(entry({ status: 'N', indicator: hasTasks }), true)).toBe(true);
  });
  it('blocked when locked, not owner, or indicator has no tasks', () => {
    expect(canAddTask(entry({ status: 'locked', indicator: hasTasks }), true)).toBe(false);
    expect(canAddTask(entry({ status: 'D', indicator: hasTasks }), true)).toBe(false);
    expect(canAddTask(entry({ status: 'I', indicator: hasTasks }), false)).toBe(false);
    expect(canAddTask(entry({ status: 'I', indicator: { id: 1, has_tasks: false } }), true)).toBe(false);
    expect(canAddTask(entry({ status: 'I' }), true)).toBe(false);
  });
});

describe('canActOnTask', () => {
  it('owner may edit/submit/delete only DRAFT tasks on an unlocked entry', () => {
    expect(canActOnTask(task({ status: 'draft' }), { isOwner: true, entryLocked: false })).toBe(true);
  });
  it('blocked for submitted/confirmed/rejected, locked entry, or non-owner', () => {
    expect(canActOnTask(task({ status: 'submitted' }), { isOwner: true, entryLocked: false })).toBe(false);
    expect(canActOnTask(task({ status: 'confirmed' }), { isOwner: true, entryLocked: false })).toBe(false);
    expect(canActOnTask(task({ status: 'rejected' }), { isOwner: true, entryLocked: false })).toBe(false);
    expect(canActOnTask(task({ status: 'draft' }), { isOwner: true, entryLocked: true })).toBe(false);
    expect(canActOnTask(task({ status: 'draft' }), { isOwner: false, entryLocked: false })).toBe(false);
  });

  it('an unknown/new status is NOT actionable (strict === draft, web parity)', () => {
    expect(canActOnTask(task({ status: 'weird' }), { isOwner: true, entryLocked: false })).toBe(false);
    expect(canActOnTask(task({ status: null }), { isOwner: true, entryLocked: false })).toBe(false);
  });
});

describe('confirmedTaskSum', () => {
  it('sums scores of confirmed tasks only', () => {
    const tasks = [
      task({ id: 1, status: 'confirmed', score: 30 }),
      task({ id: 2, status: 'confirmed', score: 20.5 }),
      task({ id: 3, status: 'submitted', score: 99 }),
      task({ id: 4, status: 'confirmed', score: null }),
    ];
    expect(confirmedTaskSum(tasks)).toBe(50.5);
  });
  it('empty/undefined → 0', () => {
    expect(confirmedTaskSum([])).toBe(0);
    expect(confirmedTaskSum(undefined)).toBe(0);
  });
});
