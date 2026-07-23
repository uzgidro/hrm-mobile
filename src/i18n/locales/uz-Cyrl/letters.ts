// Cyrillic transliteration of the uz-Latn letters namespace. Keep the key set
// identical to uz-Latn/letters.ts (a parity test enforces this).
export default {
  // ── Screen / header titles ──────────────────────────────────────────────────
  listTitle: 'Хатлар',
  detailTitle: 'Хат',
  createTitle: 'Янги хат',
  documentTitle: 'Ҳужжат',

  // ── List screen ─────────────────────────────────────────────────────────────
  tabAction: 'Менда',
  tabMine: 'Менинг',
  emptyAction: 'Имзолаш кутилаётган хатлар йўқ',
  empty: 'Хатлар йўқ',
  actionPending: 'Сизнинг имзойингиз кутилмоқда',

  // ── Detail screen ───────────────────────────────────────────────────────────
  openDocument: 'Ҳужжатни очиш',
  sectionContent: 'Мазмуни',
  sectionInfo: 'Маълумот',
  fieldAuthor: 'Муаллиф',
  fieldDate: 'Сана',
  fieldDeparture: 'Кетиш',
  fieldReturn: 'Қайтиш',
  sectionSigners: 'Имзоловчилар',
  // Business-trip movements (kelish/ketish) + return confirmation
  sectionMovements: 'Келиш / кетиш белгилари',
  movementArrived: 'Келди',
  movementDeparted: 'Кетди',
  movementEmpty: 'Ҳаракатлар мавжуд эмас',
  movementFaceId: 'Face ID',
  movementNote: 'Изоҳ (ихтиёрий)',
  confirmReturn: 'Келганини тасдиқлаш',
  confirmReturnDateLabel: 'Ходим ўз филиалига келган сана',
  returnConfirmedBadge: 'Қайтиш тасдиқланган: {{date}}',
  rejectionReason: 'Рад этиш сабаби',

  // ── Action bar ──────────────────────────────────────────────────────────────
  sign: 'Имзолаш',
  reject: 'Рад этиш',

  // ── Document (OnlyOffice) screen ────────────────────────────────────────────
  documentLoading: 'Ҳужжат юкланмоқда...',
  documentLoadError: 'Ҳужжатни юклаб бўлмади',
  documentOpenError: 'Ҳужжатни очишда хатолик',

  // ── Create form: field labels ───────────────────────────────────────────────
  fieldType: 'Ҳужжат тури',
  fieldLetterDate: 'Санаси',
  fieldShortSummary: 'Қисқа мазмуни',
  fieldText: 'Матн',
  fieldMainSigner: 'Раҳбарият (имзоловчи)',
  fieldCoordinators: 'Келишувчилар',
  fieldDepartureDate: 'Бориш санаси',
  fieldArrivalDate: 'Келиш санаси',
  fieldRegions: 'Вилоят(лар)',
  fieldDestinations: 'Бориш филиали(лар)',
  fieldTripPurpose: 'Боришдан мақсад',
  fieldWorkPlan: 'Хизмат сафари иш режаси',
  fieldLeadership: 'Раҳбарият (Министр / Deputy)',
  fieldSubmitter: 'Юборувчи шахс',
  fieldAttachment: 'Илова ёки асос',

  // ── Create form: placeholders ───────────────────────────────────────────────
  placeholderSelect: 'Танланг...',
  placeholderSelectDate: 'Санани танланг',
  placeholderDate: 'Сана',
  placeholderRegions: 'Вилоятларни танланг...',
  placeholderDestinations: 'Филиалларни танланг...',
  placeholderTripPurpose: 'Боришдан мақсад...',
  placeholderWorkPlan: 'Иш режаси...',
  placeholderLeadership: 'Раҳбариятни танланг...',
  placeholderSubmitter: 'Юборувчини танланг...',
  placeholderShortSummary: 'Қисқа мазмун...',
  placeholderText: 'Ҳужжат матни...',
  placeholderCoordinators: 'Келишувчиларни танланг...',

  // ── Create form: type option labels ─────────────────────────────────────────
  typeNotification: 'Билдирги',
  typeApplication: 'Ариза',
  typeBusinessTrip: 'Хизмат сафари',

  // ── Create form: type hints ─────────────────────────────────────────────────
  hintApplication: 'Ариза: барча келишувчилар ва раҳбар имзолаши шарт. Бирор киши рад этса — ҳужжат бекор.',
  hintBusinessTrip: 'Хизмат сафари: раҳбар тасдиқлагач, хат бориш филиали HR аккаунтида кўринади.',
  hintNotification: 'Билдирги: фақат раҳбар имзоси мажбурий. Келишувчилар ихтиёрий.',

  // ── Picker modal titles ─────────────────────────────────────────────────────
  pickerType: 'Ҳужжат тури',
  pickerMainSigner: 'Раҳбарият (имзоловчи)',
  pickerCoordinators: 'Келишувчилар',
  pickerLeadership: 'Раҳбарият',
  pickerSubmitter: 'Юборувчи шахс',
  pickerRegions: 'Вилоятлар',
  pickerDestinations: 'Бориш филиаллари',

  // ── Selected-count summaries (i18next plurals) ──────────────────────────────
  regionsSelected_one: '{{count}} та вилоят',
  regionsSelected_other: '{{count}} та вилоят',
  destinationsSelected_one: '{{count}} та филиал',
  destinationsSelected_other: '{{count}} та филиал',
  leadershipSelected_one: '{{count}} та танланди',
  leadershipSelected_other: '{{count}} та танланди',
  coordinatorsSelected_one: '{{count}} та келишувчи',
  coordinatorsSelected_other: '{{count}} та келишувчи',

  // ── Validation alerts ───────────────────────────────────────────────────────
  validationTitle: 'Хато',
  typeRequired: 'Ҳужжат тури танланиши шарт',
  branchNotFound: 'Филиал аниқланмади',
  mainSignerRequired: 'Раҳбарият (имзоловчи) танланиши шарт',
  destinationRequired: 'Камида битта бориш филиали танланиши шарт',
  submitterRequired: 'Юборувчи шахс танланиши шарт',
  leadershipRequired: 'Камида битта раҳбарият танланиши шарт',
  attachmentNoticeTitle: 'Эслатма',
  attachmentFailed: 'Хат сақланди, лекин илова юкланмади',

  // ── Sign / reject workflow ──────────────────────────────────────────────────
  actionDoneTitle: 'Бажарилди',
  signed: 'Имзоланди',
  rejected: 'Рад этилди',
  rejectConfirmTitle: 'Рад этиш',
  rejectConfirmMessage: 'Хатни рад этишни тасдиқлайсизми?',

  // ── Error fallbacks ─────────────────────────────────────────────────────────
  createError: 'Хатолик юз берди',
  actionError: 'Хатолик',

  sectionReport: 'Ҳисобот',
  reportTitle: 'Ҳисобот юбориш',
  reportEditTitle: 'Ҳисоботни таҳрирлаш',
  reportSubmit: 'Ҳисобот юбориш',
  reportEdit: 'Ҳисоботни таҳрирлаш',
  reportSend: 'Юбориш',
  reportReset: 'Ўчириш',
  reportNumber: 'Ҳисобот рақами',
  reportDate: 'Сана',
  reportSummary: 'Хулоса',
  reportSummaryPlaceholder: 'Қисқача хулоса...',
  reportTask: 'Топшириқ',
  reportTaskPlaceholder: 'Сафари мақсади / топшириқ...',
  reportContent: 'Ҳисобот матни',
  reportContentPlaceholder: 'Ҳисобот матнини киритинг...',
  reportContentRequired: 'Ҳисобот матни киритилмаган',
  reportAttachment: 'Илова (ихтиёрий)',
  reportReturnedReason: 'Қайтариш сабаби',
  reportFileFailed: 'Ҳисобот юборилди, лекин илова юкланмади',
  reportSubmitError: 'Ҳисоботни юборишда хато',
  reportResetConfirmTitle: 'Ҳисоботни ўчириш',
  reportResetConfirmMessage: 'Ҳисобот ўчирилади ва қайта таҳрирлаш мумкин бўлади. Давом этилсинми?',
} as const;
