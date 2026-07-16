// KPI feature strings — the employee's personal Verifix-style scorecard.
// uz-Latn is the source of truth; the other three locales must expose the exact
// same key set (parity test). Codes (direction M/L, entry statuses N/I/D +
// locked/draft, task statuses) are backend contract identifiers and are NOT
// translated — only display labels below (web parity with EmployeeKpiScreen).
export default {
  // ── Screens ────────────────────────────────────────────────────────────────
  title: 'KPI',
  entryTitle: "KPI ko'rsatkichi",
  loadError: "KPI ma'lumotlarini yuklashda xatolik",

  // ── Profile info rows ─────────────────────────────────────────────────────
  department: "Bo'lim",
  period: 'Davr',
  supervisor: 'Rahbar',
  schedule: 'Ish jadvali',
  periodPicker: 'Baholash davri',

  // ── Gauge bands (Verifix, 100-scale) ──────────────────────────────────────
  bandBad: 'YOMON',
  bandUnsatisfactory: 'QONIQARSIZ',
  bandSatisfactory: 'QONIQARLI',
  bandGood: 'YAXSHI',
  bandExcellent: "A'LO",

  // ── Entries table ─────────────────────────────────────────────────────────
  entriesTitle: "KPI ko'rsatkichlari",
  emptyPeriod: "Bu davrda KPI ko'rsatkichi yo'q",
  penalty: 'JARIMA',
  plan: 'Reja',
  fact: 'Fakt',
  result: 'Natija',
  statusFinal: 'Yakuniy',
  statusInProgress: 'Jarayonda',
  statusDraft: 'Qoralama',
  planSum: 'Reja summasi',
  factSum: 'Faklar',
  penaltySum: 'Jarima (ayiriladi)',
  totalNet: 'Jami',

  // ── Entry detail ──────────────────────────────────────────────────────────
  indicator: "Ko'rsatkich turi",
  owner: 'Egasi',
  computedFact: 'Hisoblangan fakt',
  confirmedSum: "Tasdiqlangan yig'indi",
  lockedNote: "Davr yakunlangan — o'zgartirib bo'lmaydi",
  noTasksIndicator: "Bu ko'rsatkich uchun vazifa kiritilmaydi",

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasksTitle: 'Vazifalar',
  emptyTasks: "Vazifa yo'q",
  addTaskPlaceholder: 'Bajargan ishingizni yozing...',
  taskDraft: 'Qoralama',
  taskSubmitted: 'Topshirilgan',
  taskConfirmed: 'Tasdiqlangan',
  taskRejected: 'Rad etilgan',
  rejectNote: 'Rad etish sababi',

  // ── Confirm dialogs ───────────────────────────────────────────────────────
  submitConfirmTitle: 'Vazifani topshirish',
  submitConfirmMessage: 'Vazifa rahbarga baholash uchun yuboriladi.',
  submitAction: 'Topshirish',
  deleteConfirmTitle: "Vazifani o'chirish",
  deleteConfirmMessage: "Ushbu vazifani o'chirmoqchimisiz?",
  deleteAction: "O'chirish",

  // ── Wave 2: supervisor review / team / bonuses ─────────────────────────────
  teamTitle: 'Xodimlarim samaradorligi',
  teamEntries: "Ko'rsatkichlar",
  teamPending: 'Tasdiq kutmoqda',
  teamAllDone: 'Yakunlangan',
  teamEmpty: "Sizga biriktirilgan xodimlar yo'q",
  bonusesTitle: 'Bonuslar',
  reviewConfirm: 'Tasdiq',
  reviewReject: 'Rad',
  reviewScoreLabel: 'Baho (%)',
  reviewNoteLabel: 'Rad etish sababi',
  reviewConfirmAction: 'Tasdiqlash',
  reviewRejectAction: 'Rad etish',
} as const;
