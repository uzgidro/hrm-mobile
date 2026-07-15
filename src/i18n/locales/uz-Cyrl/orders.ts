// Orders (Buyruqlar) feature — uz-Cyrl transliteration of uz-Latn/orders.ts.
// See uz-Latn/orders.ts for the meaning of each key.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  title: 'Буйруқлар',
  tabAction: 'Менда',
  tabMine: 'Менинг',
  emptyAction: 'Сиздан амал кутилаётган буйруқлар йўқ',
  emptyAll: 'Буйруқлар йўқ',
  actionExpected: 'Сиздан амал кутилмоқда',

  // ── Create screen ───────────────────────────────────────────────────────────
  createTitle: 'Янги буйруқ',
  hrSubtitle: 'Кадр буйруғи',
  employeeSubtitle: 'Ходим буйруғи',
  categoryLabel: 'Буйруқ турлари',
  selectPlaceholder: 'Танланг...',
  summaryLabel: 'Қисқача мазмуни',
  summaryPlaceholder: 'Буйруқнинг қисқача мазмуни...',
  descriptionLabel: 'Буйруқ матни',
  descriptionPlaceholder: 'Буйруқ тўлиқ матни...',
  leadershipLabel: 'Раҳбарият',
  leadershipPlaceholder: 'Раҳбарни танланг...',
  submitterLabel: 'Киритувчи шахс',
  familiarizersLabel: 'Буйруқ билан танишувчилар',
  familiarizersPlaceholder: 'Бўлимларни танланг...',
  deptsSelected_one: '{{count}} та бўлим танланди',
  deptsSelected_other: '{{count}} та бўлим танланди',

  // ── Approvers editor ────────────────────────────────────────────────────────
  approversLabel: 'Келишувчилар',
  approversEmpty: 'Келишувчилар қўшилмаган',
  approverPlaceholder: 'ФИО ёки лавозим',
  canEditDocLabel: 'Буйруқни таҳрирлаш ҳуқуқи',

  // ── Pickers ─────────────────────────────────────────────────────────────────
  pickCategory: 'Буйруқ турлари',
  pickLeadership: 'Раҳбарият',
  pickSubmitter: 'Киритувчи шахс',
  pickFamiliarizerDepts: 'Танишувчи бўлимлар',
  pickApprover: 'Келишувчи',

  // ── Create validation / result alerts ───────────────────────────────────────
  validationTitle: 'Хато',
  categoryRequired: 'Буйруқ тури танланиши шарт',
  descriptionRequired: 'Буйруқ матни киритилиши шарт',
  leadershipRequired: 'Раҳбариятдан бири танланиши шарт',
  branchNotFound: 'Филиал аниқланмади',
  filesPartialTitle: 'Эслатма',
  filesPartialMessage: 'Буйруқ сақланди, лекин баъзи файллар юкланмади',

  // ── Detail screen ───────────────────────────────────────────────────────────
  detailTitle: 'Буйруқ',
  fallbackTitle: 'Буйруқ',
  dateLabel: 'Сана',
  openDocument: 'Ҳужжатни очиш',
  sectionDescription: 'Мазмуни',
  sectionSummary: 'Қисқача',
  sectionPlans: 'Режалар',
  sectionInfo: 'Маълумот',
  kvEmployee: 'Ходим',
  kvSubmitter: 'Юборувчи',
  kvCreatedBy: 'Яратди',
  kvArrival: 'Бориш',
  kvDeparture: 'Қайтиш',
  changeReasonTitle: 'Ўзгартириш сабаби',

  // ── Detail sections ─────────────────────────────────────────────────────────
  sectionSigners: 'Имзоловчилар',
  sectionFamiliarizers: 'Танишувчилар',
  sectionHistory: 'Тарих',
  signerFallback: 'Ходим',
  signerLeadership: 'Раҳбарият',
  signerApprover: 'Келишувчи',
  signed: 'Имзоланди',
  waiting: 'Кутилмоқда',
  acknowledged: 'Танишди',

  // ── Action bar ──────────────────────────────────────────────────────────────
  actionRequestChange: 'Ўзгартириш',
  actionApprove: 'Тасдиқлаш',
  actionResubmit: 'Қайта юбориш',
  actionForward: 'Раҳбариятга юбориш',
  actionRegister: 'Рўйхатга олиш',
  actionAcknowledge: 'Танишдим',

  // ── Reject / register modals ────────────────────────────────────────────────
  rejectTitle: 'Ўзгартириш сўраш',
  rejectPlaceholder: 'Сабабни ёзинг...',
  registerTitle: 'Рўйхатга олиш',
  registerHint: 'Буйруқ рақамини киритинг (ихтиёрий)',
  registerPlaceholder: 'Буйруқ рақами',

  // ── Decree action results ───────────────────────────────────────────────────
  actionDoneTitle: 'Бажарилди',
  reasonRequired: 'Сабабни киритинг',
  approveSuccess: 'Буйруқ тасдиқланди',
  rejectSuccess: 'Ўзгартириш сўралди',
  resubmitSuccess: 'Қайта юборилди',
  forwardSuccess: 'Раҳбариятга юборилди',
  acknowledgeSuccess: 'Танишилди',
  registerSuccess: 'Рўйхатга олинди',
  actionError: 'Амални бажаришда хатолик',

  // ── Document screen ─────────────────────────────────────────────────────────
  documentTitle: 'Ҳужжат',
  documentLoading: 'Ҳужжат юкланмоқда...',
  documentLoadError: 'Ҳужжатни юклаб бўлмади',
  documentOpenError: 'Ҳужжатни очишда хатолик',
} as const;
