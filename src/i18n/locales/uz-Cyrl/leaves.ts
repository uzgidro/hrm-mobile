// uz-Cyrl transliteration of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Сўров юбориш',
  detailTitle: 'Сўров тафсилоти',
  teamTitle: 'Жамоа сўровлари',
  incomingTitle: 'Кирувчи сўровлар',
  myTitle: 'Сўровлар',
  searchPlaceholder: 'Исм, тур ёки изоҳ...',
  filterAll: 'Барча',

  typeLabel: 'Сўров тури *',
  startLabel: 'Бошланиш *',
  endLabel: 'Тугаш *',
  commentLabel: 'Изоҳ *',
  commentPlaceholder: 'Сабабни қисқача ёзинг...',
  routeLabel: 'Кимга боради',
  routeToSupervisor: 'Сўров бевосита раҳбарингизга юборилади: {{name}}',
  routeToHead: 'Сўров бўлим бошлиғингизга юборилади: {{name}}',
  routeToNobody: 'Бевосита раҳбар ва бўлим бошлиғи бириктирилмаган — сўровни кадрлар бўлими кўриб чиқади',
  backHint_one: 'Сўровни кўпи билан {{count}} кун орқага ёзиш мумкин.',
  backHint_other: 'Сўровни кўпи билан {{count}} кун орқага ёзиш мумкин.',
  tooFarBack_one: 'Сўровни кўпи билан {{count}} кун орқага ёзиш мумкин — бошланиш санасини ўзгартиринг.',
  tooFarBack_other: 'Сўровни кўпи билан {{count}} кун орқага ёзиш мумкин — бошланиш санасини ўзгартиринг.',
  descRequired: 'Изоҳ киритилиши шарт',
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
  homeTitle: "Рухсат сўровлари",
  homeAll: "Барчаси",
  homeAwaiting: "Тасдиғингизни кутмоқда: {{count}}",
  homeNoneAwaiting: "Тасдиғингизни кутаётган сўров йўқ",
  homeCreate: "Рухсат сўраш",
  rejectReasonTitle: 'Рад этиш сабаби',
  rejectReasonPlaceholder: 'Сабабни ёзинг...',

  statusApproved: 'Тасдиқланган',
  statusRejected: 'Рад этилди',
  statusPending: 'Кутилмоқда',

  createdAtPrefix: 'Юборилган: {{date}}',
  emptyLeaves: 'Сўровлар йўқ',
  emptyPending: 'Кутилаётган сўровлар йўқ',
  notFound: 'Маълумот топилмади',

  endMustBeAfterStart: 'Тугаш вақти бошланиш вақтидан кейин бўлиши керак',
  createdSuccess: 'Сўров юборилди',
  approvedSuccess: 'Сўров тасдиқланди',
  rejectedSuccess: 'Сўров рад этилди',

  approveError: 'Тасдиқлашда хатолик юз берди',
  rejectError: 'Рад этишда хатолик юз берди',
  deletedSuccess: 'Сўров ўчирилди',
  deleteError: 'Ўчиришда хатолик юз берди',
  signerRejected: 'Рад этди',
  fieldOrigin: 'Манба',
  originHrOrder: 'КАДР буйруғидан',

  // ── Scope (web v2 RequestPermissionPage) ───────────────────────────────────
  scopeMine: 'Менга тегишли',
  scopeTeam: 'Менинг жамоам',
  scopeBranch: 'Бутун филиал',

  // ── Reopen (Verifix «reset», v2) ───────────────────────────────────────────
  reopen: 'Қайта очиш',
  reopenHint: 'Имзо ёки рад этиш бекор қилинади, сўров яна «Кутилмоқда» ҳолатига ўтади. Ходимга хабар боради.',
  reopenReason: 'Қайта очиш сабаби',
  reopenedNote: 'Қайта очилган: {{reason}}',
  reopenedSuccess: 'Сўров қайта кўриб чиқишга қайтарилди',
  reopenError: 'Қайта очишда хатолик юз берди',
} as const;
