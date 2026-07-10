// Leaves (work-leave request) feature strings. uz-Latn is the source of truth;
// the other three locales must expose the exact same key set (parity test).
//
// Web-parity note: LEAVE_TYPES preset values and the API `type` field are the
// value stored on the backend and echoed back verbatim on the list/detail
// screens, so they are treated as domain identifiers and are NOT translated
// here — only display-only text (titles, labels, statuses, hints) lives below.
export default {
  // ── Screen titles / headers ─────────────────────────────────────────────────
  createTitle: "So'rov yuborish",
  detailTitle: "So'rov tafsiloti",
  teamTitle: "Jamoa so'rovlari",
  incomingTitle: "Kiruvchi so'rovlar",
  myTitle: "So'rovlar",

  // ── Create form field labels ────────────────────────────────────────────────
  typeLabel: "So'rov turi *",
  startLabel: 'Boshlanish *',
  endLabel: 'Tugash *',
  supervisorLabel: 'Rahbar (Tasdiqlovchi)',
  commentLabel: 'Izoh (ixtiyoriy)',
  commentPlaceholder: 'Sababni qisqacha yozing...',
  noSupervisor: 'Rahbar biriktirilmagan',
  supervisorHint: "So'rov HR bo'limiga to'g'ridan-to'g'ri yuboriladi",
  endBeforeStart: "Tugash vaqti boshlanishdan keyin bo'lishi kerak",

  // ── Date-time picker ────────────────────────────────────────────────────────
  startPickerTitle: 'Boshlanish vaqti',
  endPickerTitle: 'Tugash vaqti',

  // ── Duration parts (plurals) ────────────────────────────────────────────────
  durationDays_one: '{{count}} kun',
  durationDays_other: '{{count}} kun',
  durationHours_one: '{{count}} soat',
  durationHours_other: '{{count}} soat',
  durationMinutes_one: '{{count}} daqiqa',
  durationMinutes_other: '{{count}} daqiqa',

  // ── Leave-type sheet ────────────────────────────────────────────────────────
  typeSheetTitle: "So'rov turini tanlang",
  typeCustomPlaceholder: "Yoki o'zingiz yozing...",

  // ── Detail info rows ────────────────────────────────────────────────────────
  fieldType: "So'rov turi",
  fieldStart: 'Boshlanish',
  fieldEnd: 'Tugash',
  fieldComment: 'Izoh',
  fieldCreated: 'Yuborilgan',
  typeFallback: "So'rov",

  // ── Signers ─────────────────────────────────────────────────────────────────
  signersTitle: 'Tasdiqlovchilar',
  signerSigned: 'Tasdiqladi',

  // ── Actions ─────────────────────────────────────────────────────────────────
  approve: 'Tasdiqlash',
  reject: 'Rad etish',
  actionNeeded: 'Tasdiqlash kerak',
  rejectReasonTitle: 'Rad etish sababi',
  rejectReasonPlaceholder: 'Sababni yozing...',

  // ── Statuses ────────────────────────────────────────────────────────────────
  statusApproved: 'Tasdiqlangan',
  statusRejected: 'Rad etildi',
  statusPending: 'Kutilmoqda',

  // ── List meta / empty states ────────────────────────────────────────────────
  createdAtPrefix: 'Yuborilgan: {{date}}',
  emptyLeaves: "So'rovlar yo'q",
  emptyPending: "Kutilayotgan so'rovlar yo'q",
  notFound: "Ma'lumot topilmadi",

  // ── Alerts ──────────────────────────────────────────────────────────────────
  errorTitle: 'Xato',
  endMustBeAfterStart: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak",
  createdSuccess: "So'rov yuborildi",
  approvedSuccess: "So'rov tasdiqlandi",
  rejectedSuccess: "So'rov rad etildi",

  // ── Error fallbacks ─────────────────────────────────────────────────────────
  approveError: 'Tasdiqlashda xatolik yuz berdi',
  rejectError: 'Rad etishda xatolik yuz berdi',
} as const;
