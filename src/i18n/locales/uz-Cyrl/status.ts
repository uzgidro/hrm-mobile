// Cyrillic transliteration of the uz-Latn status namespace. Keep the key set
// identical to uz-Latn/status.ts (a parity test enforces this).
export default {
  // ── Order-act (decree) statuses ─────────────────────────────────────────────
  orderDraft: 'Қоралама',
  orderPendingApproval: 'Келишиш кутилмоқда',
  orderPendingLeadership: 'Раҳбарият имзоси кутилмоқда',
  orderPendingChancellery: 'Канселярия кутилмоқда',
  orderApproved: 'Келишилди',
  orderConfirmed: 'Рўйхатга олинган',
  orderApplied: 'Қўлланилди',
  orderChangesRequested: 'Ўзгартириш сўралди',
  orderRejected: 'Рад этилди',
  orderPending: 'Кутилмоқда',
  orderSigned: 'Имзоланди',

  // ── Letter type labels ──────────────────────────────────────────────────────
  letterTypeNotification: 'Билдирги',
  letterTypeApplication: 'Ариза',
  letterTypeBusinessTrip: 'Хизмат сафари',
  letterTypeDefault: 'Хат',

  // ── Letter statuses ─────────────────────────────────────────────────────────
  letterRejected: 'Рад этилди',
  letterRegistered: 'Рўйхатга олинган',
  letterSignedStatus: 'Имзоланган',
  letterInChancellery: 'Девонхонада',
  letterInLeadership: 'Раҳбариятда',
  letterPending: 'Кутилмоқда',
  letterTripArrived: 'Ҳисобот кутилмоқда',
  letterTripLeadershipPending: 'Раҳбар тасдиғи кутилмоқда',
  letterTripGuvohnomaReview: 'Гувоҳнома тасдиғида',
  letterReportSubmitted: 'Ҳисобот юборилди',
  letterReportReturned: 'Ҳисобот қайтарилди',
  letterReportReview: 'Ҳисобот раҳбариятда',
  letterReportApproved: 'Ҳисобот тасдиқланди',

  // ── Signing-timeline status texts ───────────────────────────────────────────
  timelineApproved: 'Тасдиқлади',
  timelineSigned: 'Имзолади',
  timelineAgreed: 'Розиман',
  timelineRejected: 'Рад этди',
  timelinePending: 'Кутилмоқда',

  // ── Timeline role fallbacks ─────────────────────────────────────────────────
  roleLeadership: 'Раҳбарият',
  roleChief: 'Бошлиғи',
  roleCoordinator: 'Келишувчи',
  roleSigner: 'Имзоловчи',

  // ── Order category translations ─────────────────────────────────────────────
  categoryLeave: 'Меҳнат таътили',
  categoryBusinessTrip: 'Хизмат сафари',
  categorySickLeave: 'Касаллик варақаси',
  categoryDefault: 'Буйруқ',

  // ── Shared fallbacks ────────────────────────────────────────────────────────
  unknown: 'Номаълум',
  noPosition: 'Лавозим киритилмаган',
} as const;
