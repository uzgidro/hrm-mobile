// uz-Cyrl transliteration of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Сўров юбориш',
  detailTitle: 'Сўров тафсилоти',
  teamTitle: 'Жамоа сўровлари',
  incomingTitle: 'Кирувчи сўровлар',
  myTitle: 'Сўровлар',

  typeLabel: 'Сўров тури *',
  startLabel: 'Бошланиш *',
  endLabel: 'Тугаш *',
  supervisorLabel: 'Раҳбар (Тасдиқловчи)',
  commentLabel: 'Изоҳ (ихтиёрий)',
  commentPlaceholder: 'Сабабни қисқача ёзинг...',
  noSupervisor: 'Раҳбар бириктирилмаган',
  supervisorHint: 'Сўров HR бўлимига тўғридан-тўғри юборилади',
  pickSupervisor: 'Раҳбарни танланг',
  pickSupervisorTitle: 'Раҳбарни танлаш',
  supervisorRequired: 'Илтимос, тасдиқловчи раҳбарни танланг',
  endBeforeStart: 'Тугаш вақти бошланишдан кейин бўлиши керак',

  startPickerTitle: 'Бошланиш вақти',
  endPickerTitle: 'Тугаш вақти',

  durationDays_one: '{{count}} кун',
  durationDays_other: '{{count}} кун',
  durationHours_one: '{{count}} соат',
  durationHours_other: '{{count}} соат',
  durationMinutes_one: '{{count}} дақиқа',
  durationMinutes_other: '{{count}} дақиқа',

  typeSheetTitle: 'Сўров турини танланг',
  typeCustomPlaceholder: 'Ёки ўзингиз ёзинг...',

  // Preset leave-type labels. Keys are the untranslated LEAVE_TYPES values.
  presetType: {
    "Xizmat topshirig'i": 'Хизмат топшириғи',
    Kasallik: 'Касаллик',
    "Ta'til": 'Таътил',
    'Shaxsiy sabab': 'Шахсий сабаб',
    Boshqa: 'Бошқа',
  },

  fieldType: 'Сўров тури',
  fieldStart: 'Бошланиш',
  fieldEnd: 'Тугаш',
  fieldComment: 'Изоҳ',
  fieldCreated: 'Юборилган',
  typeFallback: 'Сўров',

  signersTitle: 'Тасдиқловчилар',
  signerSigned: 'Тасдиқлади',

  approve: 'Тасдиқлаш',
  reject: 'Рад этиш',
  delete: 'Ўчириш',
  deleteConfirmTitle: 'Сўровни ўчириш',
  deleteConfirmMessage: 'Ушбу сўровни ўчирмоқчимисиз? Бу амални бекор қилиб бўлмайди.',
  actionNeeded: 'Тасдиқлаш керак',
  rejectReasonTitle: 'Рад этиш сабаби',
  rejectReasonPlaceholder: 'Сабабни ёзинг...',

  statusApproved: 'Тасдиқланган',
  statusRejected: 'Рад этилди',
  statusPending: 'Кутилмоқда',

  createdAtPrefix: 'Юборилган: {{date}}',
  emptyLeaves: 'Сўровлар йўқ',
  emptyPending: 'Кутилаётган сўровлар йўқ',
  notFound: 'Маълумот топилмади',

  errorTitle: 'Хато',
  endMustBeAfterStart: 'Тугаш вақти бошланиш вақтидан кейин бўлиши керак',
  createdSuccess: 'Сўров юборилди',
  approvedSuccess: 'Сўров тасдиқланди',
  rejectedSuccess: 'Сўров рад этилди',

  approveError: 'Тасдиқлашда хатолик юз берди',
  rejectError: 'Рад этишда хатолик юз берди',
  deletedSuccess: 'Сўров ўчирилди',
  deleteError: 'Ўчиришда хатолик юз берди',
} as const;
