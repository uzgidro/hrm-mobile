// English translation of the KPI feature strings.
// See uz-Latn/kpi.ts for the meaning of each key.
export default {
  title: 'KPI',
  entryTitle: 'KPI indicator',
  loadError: 'Failed to load KPI data',

  department: 'Department',
  period: 'Period',
  supervisor: 'Supervisor',
  schedule: 'Work schedule',
  periodPicker: 'Evaluation period',

  bandBad: 'BAD',
  bandUnsatisfactory: 'UNSATISFACTORY',
  bandSatisfactory: 'SATISFACTORY',
  bandGood: 'GOOD',
  bandExcellent: 'EXCELLENT',

  entriesTitle: 'KPI indicators',
  emptyPeriod: 'No KPI indicators for this period',
  penalty: 'PENALTY',
  plan: 'Plan',
  fact: 'Fact',
  result: 'Result',
  statusFinal: 'Final',
  statusInProgress: 'In progress',
  statusDraft: 'Draft',
  planSum: 'Plan total',
  factSum: 'Facts',
  penaltySum: 'Penalty (subtracted)',
  totalNet: 'Total',

  indicator: 'Indicator type',
  owner: 'Owner',
  computedFact: 'Computed fact',
  lockedNote: 'The period is finalized — no changes allowed',
  noTasksIndicator: 'This indicator does not take tasks',

  tasksTitle: 'Tasks',
  emptyTasks: 'No tasks',
  addTaskPlaceholder: 'Describe the work you did...',
  scorePlaceholder: 'Score',
  scoreLabel: 'Score (%)',
  setScore: 'Set score',
  statusNone: 'No status',
  pickStatusTitle: 'Pick a status',

  deleteConfirmTitle: 'Delete task',
  deleteConfirmMessage: 'Delete this task?',
  deleteAction: 'Delete',

  teamTitle: 'My team performance',
  teamEntries: 'Indicators',
  teamPending: 'Awaiting review',
  teamAllDone: 'Finalized',
  teamEmpty: 'No employees report to you',
  bonusesTitle: 'Bonuses',
} as const;
