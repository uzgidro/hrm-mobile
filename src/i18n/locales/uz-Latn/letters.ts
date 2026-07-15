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
  placeholderSubmitter: 'Yuboruvchini tanlang...',
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
  submitterRequired: 'Yuboruvchi shaxs tanlanishi shart',
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
} as const;
