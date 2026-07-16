// Orders (Buyruqlar) feature — order-act decree create/list/detail/document
// flows. uz-Latn is the source of truth: strings are verbatim the previously
// hardcoded Uzbek. Shared button/state words (create/send/cancel/confirm/…)
// are NOT duplicated here — screens reuse common.*; API-error fallbacks reuse
// errors.*. Order STATUS labels live in the `status` namespace (via the
// orderStatus util) and are not repeated here.
export default {
  // ── List screen (OrdersListScreen) ──────────────────────────────────────────
  title: 'Buyruqlar',
  tabAction: 'Menda',
  tabMine: 'Mening',
  emptyAction: "Sizdan amal kutilayotgan buyruqlar yo'q",
  emptyAll: "Buyruqlar yo'q",
  actionExpected: 'Sizdan amal kutilmoqda',

  // ── Create screen (CreateOrderScreen) ───────────────────────────────────────
  createTitle: 'Yangi buyruq',
  hrSubtitle: "Kadr buyrug'i",
  employeeSubtitle: "Xodim buyrug'i",
  categoryLabel: 'Buyruq turlari',
  selectPlaceholder: 'Tanlang...',
  summaryLabel: 'Qisqacha mazmuni',
  summaryPlaceholder: 'Buyruqning qisqacha mazmuni...',
  descriptionLabel: 'Buyruq matni',
  descriptionPlaceholder: "Buyruq to'liq matni...",
  leadershipLabel: 'Rahbariyat',
  leadershipPlaceholder: 'Rahbarni tanlang...',
  submitterLabel: 'Kirituvchi shaxs',
  familiarizersLabel: 'Buyruq bilan tanishuvchilar',
  familiarizersPlaceholder: "Bo'limlarni tanlang...",
  deptsSelected_one: '{{count}} ta bo\'lim tanlandi',
  deptsSelected_other: '{{count}} ta bo\'lim tanlandi',

  // ── Approvers editor (ApproversEditor) ──────────────────────────────────────
  approversLabel: 'Kelishuvchilar',
  approversEmpty: "Kelishuvchilar qo'shilmagan",
  approverPlaceholder: 'FIO yoki lavozim',
  canEditDocLabel: 'Buyruqni tahrirlash huquqi',

  // ── Pickers (OrderPickers) ──────────────────────────────────────────────────
  pickCategory: 'Buyruq turlari',
  pickLeadership: 'Rahbariyat',
  pickSubmitter: 'Kirituvchi shaxs',
  pickFamiliarizerDepts: "Tanishuvchi bo'limlar",
  pickApprover: 'Kelishuvchi',

  // ── Create validation / result alerts ───────────────────────────────────────
  validationTitle: 'Xato',
  categoryRequired: 'Buyruq turi tanlanishi shart',
  descriptionRequired: 'Buyruq matni kiritilishi shart',
  approverRequired: 'Kamida bitta kelishuvchi tanlanishi shart',
  leadershipRequired: 'Rahbariyatdan biri tanlanishi shart',
  branchNotFound: 'Filial aniqlanmadi',
  filesPartialTitle: 'Eslatma',
  filesPartialMessage: "Buyruq saqlandi, lekin ba'zi fayllar yuklanmadi",

  // ── Detail screen (OrderDetailScreen) ───────────────────────────────────────
  detailTitle: 'Buyruq',
  fallbackTitle: 'Buyruq',
  dateLabel: 'Sana',
  openDocument: 'Hujjatni ochish',
  sectionDescription: 'Mazmuni',
  sectionSummary: 'Qisqacha',
  sectionPlans: 'Rejalar',
  sectionInfo: "Ma'lumot",
  kvEmployee: 'Xodim',
  kvSubmitter: 'Yuboruvchi',
  kvCreatedBy: 'Yaratdi',
  kvArrival: 'Borish',
  kvDeparture: 'Qaytish',
  changeReasonTitle: "O'zgartirish sababi",

  // ── Detail sections (DetailSections) ────────────────────────────────────────
  sectionSigners: 'Imzolovchilar',
  sectionFamiliarizers: 'Tanishuvchilar',
  sectionHistory: 'Tarix',
  signerFallback: 'Xodim',
  signerLeadership: 'Rahbariyat',
  signerApprover: 'Kelishuvchi',
  signed: 'Imzolandi',
  waiting: 'Kutilmoqda',
  acknowledged: 'Tanishdi',

  // ── Action bar (DecreeActionBar) ────────────────────────────────────────────
  actionRequestChange: "O'zgartirish",
  actionApprove: 'Tasdiqlash',
  actionResubmit: 'Qayta yuborish',
  actionForward: 'Rahbariyatga yuborish',
  actionRegister: "Ro'yxatga olish",
  actionAcknowledge: 'Tanishdim',

  // ── Reject / register modals (DetailModals) ─────────────────────────────────
  rejectTitle: "O'zgartirish so'rash",
  rejectPlaceholder: 'Sababni yozing...',
  registerTitle: "Ro'yxatga olish",
  registerHint: 'Buyruq raqamini kiriting (ixtiyoriy)',
  registerPlaceholder: 'Buyruq raqami',

  // ── Decree action results (useDecreeActions) ────────────────────────────────
  actionDoneTitle: 'Bajarildi',
  reasonRequired: 'Sababni kiriting',
  approveSuccess: 'Buyruq tasdiqlandi',
  rejectSuccess: "O'zgartirish so'raldi",
  resubmitSuccess: 'Qayta yuborildi',
  forwardSuccess: 'Rahbariyatga yuborildi',
  acknowledgeSuccess: 'Tanishildi',
  registerSuccess: "Ro'yxatga olindi",
  actionError: 'Amalni bajarishda xatolik',

  // ── Document screen (OrderDocumentScreen) ───────────────────────────────────
  documentTitle: 'Hujjat',
  documentLoading: 'Hujjat yuklanmoqda...',
  documentLoadError: "Hujjatni yuklab bo'lmadi",
  documentOpenError: 'Hujjatni ochishda xatolik',
} as const;
