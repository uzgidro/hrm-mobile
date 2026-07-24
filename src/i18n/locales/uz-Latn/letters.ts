// Letters (Xatlar) feature — display strings. Source of truth (verbatim Uzbek).
// Keep the key set identical across all four locales (a parity test enforces
// this). Only display text lives here — letter status/type/timeline LABELS are
// resolved from the `status` namespace via src/utils/letterStatus.ts.
//
// Web-parity: letter-type CODES, status codes and signer-role tokens are NOT
// translated (they live as literal keys in the util files) — only what the user
// reads is localized.
export default {
  // ── Screen / header titles ──────────────────────────────────────────────────
  listTitle: 'Xatlar',
  detailTitle: 'Xat',
  createTitle: 'Yangi xat',
  documentTitle: 'Hujjat',

  // ── List screen ─────────────────────────────────────────────────────────────
  tabAction: 'Menda',
  tabMine: 'Mening',
  emptyAction: "Imzolash kutilayotgan xatlar yo'q",
  empty: "Xatlar yo'q",
  actionPending: 'Sizning imzoyingiz kutilmoqda',

  // ── Detail screen ───────────────────────────────────────────────────────────
  openDocument: 'Hujjatni ochish',
  sectionContent: 'Mazmuni',
  sectionInfo: "Ma'lumot",
  fieldAuthor: 'Muallif',
  fieldDate: 'Sana',
  fieldDeparture: 'Ketish',
  fieldReturn: 'Qaytish',
  sectionSigners: 'Imzolovchilar',
  // Business-trip movements (kelish/ketish) + return confirmation
  sectionMovements: 'Kelish / ketish belgilari',
  movementArrived: 'Keldi',
  movementDeparted: 'Ketdi',
  movementEmpty: 'Harakatlar mavjud emas',
  movementFaceId: 'Face ID',
  movementNote: 'Izoh (ixtiyoriy)',
  confirmReturn: 'Kelganini tasdiqlash',
  confirmReturnDateLabel: 'Xodim o\'z filialiga kelgan sana',
  returnConfirmedBadge: 'Qaytish tasdiqlangan: {{date}}',
  rejectionReason: 'Rad etish sababi',

  // ── Action bar ──────────────────────────────────────────────────────────────
  sign: 'Imzolash',
  reject: 'Rad etish',

  // ── Document (OnlyOffice) screen ────────────────────────────────────────────
  documentLoading: 'Hujjat yuklanmoqda...',
  documentLoadError: "Hujjatni yuklab bo'lmadi",
  documentOpenError: 'Hujjatni ochishda xatolik',

  // ── Create form: field labels ───────────────────────────────────────────────
  fieldType: 'Hujjat turi',
  fieldLetterDate: 'Sanasi',
  fieldShortSummary: 'Qisqa mazmuni',
  fieldText: 'Matn',
  fieldMainSigner: 'Rahbariyat (imzolovchi)',
  fieldCoordinators: 'Kelishuvchilar',
  fieldDepartureDate: 'Borish sanasi',
  fieldArrivalDate: 'Kelish sanasi',
  fieldRegions: 'Viloyat(lar)',
  fieldDestinations: 'Borish filiali(lar)',
  fieldTripPurpose: 'Borishdan maqsad',
  fieldWorkPlan: 'Xizmat safari ish rejasi',
  fieldLeadership: 'Rahbariyat (Ministr / Deputy)',
  fieldSubmitter: 'Yuboruvchi shaxs',
  fieldAttachment: 'Ilova yoki asos',

  // ── Create form: placeholders ───────────────────────────────────────────────
  placeholderSelect: 'Tanlang...',
  placeholderSelectDate: 'Sanani tanlang',
  placeholderDate: 'Sana',
  placeholderRegions: 'Viloyatlarni tanlang...',
  placeholderDestinations: 'Filiallarni tanlang...',
  placeholderTripPurpose: 'Borishdan maqsad...',
  placeholderWorkPlan: 'Ish rejasi...',
  placeholderLeadership: 'Rahbariyatni tanlang...',
  placeholderSubmitterOptional: 'Bo\'sh qoldirilsa — o\'zingiz imzolaysiz',
  placeholderShortSummary: 'Qisqa mazmun...',
  placeholderText: 'Hujjat matni...',
  placeholderCoordinators: 'Kelishuvchilarni tanlang...',

  // ── Create form: type option labels ─────────────────────────────────────────
  typeNotification: 'Bildirgi',
  typeApplication: 'Ariza',
  typeBusinessTrip: 'Xizmat safari',

  // ── Create form: type hints ─────────────────────────────────────────────────
  hintApplication: 'Ariza: barcha kelishuvchilar va rahbar imzolashi shart. Biror kishi rad etsa — hujjat bekor.',
  hintBusinessTrip: "Xizmat safari: rahbar tasdiqlagach, xat borish filiali HR akkountida ko'rinadi.",
  hintNotification: 'Bildirgi: faqat rahbar imzosi majburiy. Kelishuvchilar ixtiyoriy.',

  // ── Picker modal titles ─────────────────────────────────────────────────────
  pickerType: 'Hujjat turi',
  pickerMainSigner: 'Rahbariyat (imzolovchi)',
  pickerCoordinators: 'Kelishuvchilar',
  pickerLeadership: 'Rahbariyat',
  pickerSubmitter: 'Yuboruvchi shaxs',
  pickerRegions: 'Viloyatlar',
  pickerDestinations: 'Borish filiallari',

  // ── Selected-count summaries (i18next plurals) ──────────────────────────────
  regionsSelected_one: '{{count}} ta viloyat',
  regionsSelected_other: '{{count}} ta viloyat',
  destinationsSelected_one: '{{count}} ta filial',
  destinationsSelected_other: '{{count}} ta filial',
  leadershipSelected_one: '{{count}} ta tanlandi',
  leadershipSelected_other: '{{count}} ta tanlandi',
  coordinatorsSelected_one: '{{count}} ta kelishuvchi',
  coordinatorsSelected_other: '{{count}} ta kelishuvchi',

  // ── Validation alerts ───────────────────────────────────────────────────────
  validationTitle: 'Xato',
  typeRequired: 'Hujjat turi tanlanishi shart',
  branchNotFound: 'Filial aniqlanmadi',
  mainSignerRequired: 'Rahbariyat (imzolovchi) tanlanishi shart',
  destinationRequired: 'Kamida bitta borish filiali tanlanishi shart',
  leadershipRequired: 'Kamida bitta rahbariyat tanlanishi shart',
  attachmentNoticeTitle: 'Eslatma',
  attachmentFailed: 'Xat saqlandi, lekin ilova yuklanmadi',

  // ── Sign / reject workflow ──────────────────────────────────────────────────
  actionDoneTitle: 'Bajarildi',
  signed: 'Imzolandi',
  rejected: 'Rad etildi',
  rejectConfirmTitle: 'Rad etish',
  rejectConfirmMessage: 'Xatni rad etishni tasdiqlaysizmi?',

  // ── Error fallbacks ─────────────────────────────────────────────────────────
  createError: 'Xatolik yuz berdi',
  actionError: 'Xatolik',

  // ── Trip submit (xizmat safari: draft → pending) ──
  tripSubmit: 'Yuborish',
  tripSubmitConfirmTitle: 'Safarni yuborish',
  tripSubmitConfirmMessage: 'Xizmat safari imzolash uchun yuboriladi.',

  // ── Trip leadership approvals (button + per-kind confirm/done copy) ──
  tripApprove: 'Tasdiqlash',
  approve_trip_confirmTitle: 'Safarni tasdiqlash',
  approve_trip_confirmMessage: 'Xizmat safari tasdiqlanadi.',
  approve_trip_done: 'Safar tasdiqlandi',
  approve_report_confirmTitle: 'Hisobotni tasdiqlash',
  approve_report_confirmMessage: 'Safar hisoboti tasdiqlanadi.',
  approve_report_done: 'Hisobot tasdiqlandi',
  approve_guvohnoma_confirmTitle: 'Guvohnomani tasdiqlash',
  approve_guvohnoma_confirmMessage: 'Guvohnoma tasdiqlanadi.',
  approve_guvohnoma_done: 'Guvohnoma tasdiqlandi',

  // ── Trip report (xizmat safari, OLD flow) ──
  sectionReport: 'Hisobot',
  reportTitle: 'Hisobot yuborish',
  reportEditTitle: 'Hisobotni tahrirlash',
  reportSubmit: 'Hisobot yuborish',
  reportEdit: 'Hisobotni tahrirlash',
  reportSend: 'Yuborish',
  reportReset: "O'chirish",
  reportNumber: 'Hisobot raqami',
  reportDate: 'Sana',
  reportSummary: 'Xulosa',
  reportSummaryPlaceholder: 'Qisqacha xulosa...',
  reportTask: 'Topshiriq',
  reportTaskPlaceholder: 'Safari maqsadi / topshiriq...',
  reportContent: 'Hisobot matni',
  reportContentPlaceholder: 'Hisobot matnini kiriting...',
  reportContentRequired: 'Hisobot matni kiritilmagan',
  reportAttachment: 'Ilova (ixtiyoriy)',
  reportReturnedReason: 'Qaytarish sababi',
  reportFileFailed: "Hisobot yuborildi, lekin ilova yuklanmadi",
  reportSubmitError: 'Hisobotni yuborishda xato',
  reportResetConfirmTitle: "Hisobotni o'chirish",
  reportResetConfirmMessage: "Hisobot o'chiriladi va qayta tahrirlash mumkin bo'ladi. Davom etilsinmi?",
} as const;
