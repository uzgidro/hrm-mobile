// Chairman agenda (Raisning kun tartibi) — calendar-style tasks grouped by day.
// Secretariat/master-admin manage (CRUD); the minister views. uz-Latn is the
// source of truth; the other three locales mirror this key set (parity test).
// Web-parity: color hex values / dates are backend contract — only labels here.
export default {
  title: 'Kun tartibi',
  subtitle: 'Rais kun tartibi',
  empty: 'Vazifalar mavjud emas',
  loadError: 'Kun tartibini yuklashda xatolik',

  // Month navigation
  prevMonth: 'Oldingi oy',
  nextMonth: 'Keyingi oy',
  today: 'Bugun',

  // Create / edit form
  createTitle: 'Yangi vazifa',
  editTitle: 'Vazifani tahrirlash',
  titleLabel: 'Sarlavha',
  titlePlaceholder: 'Vazifa sarlavhasi',
  descriptionLabel: 'Tavsif',
  descriptionPlaceholder: 'Qisqacha tavsif...',
  participantsLabel: 'Ishtirokchilar',
  participantsPlaceholder: 'Ishtirokchilar ro\'yxati',
  dateLabel: 'Sana',
  startTimeLabel: 'Boshlanish vaqti',
  endTimeLabel: 'Tugash vaqti',
  timePlaceholder: 'HH:MM',
  save: 'Saqlash',

  // Actions / alerts
  created: 'Vazifa qo\'shildi',
  updated: 'Vazifa yangilandi',
  deleted: 'Vazifa o\'chirildi',
  edit: 'Tahrirlash',
  delete: "O'chirish",
  deleteConfirmTitle: "Vazifani o'chirish",
  deleteConfirmMessage: "Ushbu vazifani o'chirishni tasdiqlaysizmi?",
  titleRequired: 'Sarlavha kiritilishi shart',
  dateRequired: 'Sana kiritilishi shart',
  errorTitle: 'Xatolik',
  actionError: "Amalni bajarib bo'lmadi",
} as const;
