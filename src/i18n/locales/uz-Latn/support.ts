// Support tickets (Texnik yordam / АКТ helpdesk) — MVP: employee creates a
// ticket and views their own with status. Status/priority codes are backend
// contract values and are NOT translated — only the display labels below.
// uz-Latn is the source of truth; the other three locales mirror this key set.
export default {
  // ── List ──────────────────────────────────────────────────────────────────
  title: 'Texnik yordam',
  chatPlaceholder: 'Xabar yozing...',
  chatEmpty: 'Xabar yo\'q — birinchi bo\'lib yozing',
  chatTitle: 'Yozishma',
  subtitle: 'Mening murojaatlarim',
  empty: "Murojaatlar yo'q",
  loadError: 'Murojaatlarni yuklashda xatolik',

  // ── Create form ───────────────────────────────────────────────────────────
  createTitle: 'Yangi murojaat',
  priorityLabel: 'Muhimlik',
  descriptionLabel: 'Muammo tavsifi',
  descriptionPlaceholder: 'Muammoni batafsil yozing...',
  ugeLabel: 'Kompyuter raqami (UGE)',
  ugePlaceholder: 'Masalan: UGE-1024',
  roomLabel: 'Xona raqami',
  roomPlaceholder: 'Masalan: 204',
  filesLabel: 'Rasm / video (ixtiyoriy)',
  submit: 'Yuborish',
  createdTitle: 'Yuborildi',
  createdMessage: 'Murojaatingiz qabul qilindi',
  descriptionRequired: 'Muammo tavsifi kiritilishi shart',

  // ── Detail ────────────────────────────────────────────────────────────────
  detailTitle: 'Murojaat',
  fieldAssignee: 'Mutaxassis',
  fieldCreated: 'Yaratilgan',
  fieldRoom: 'Xona',
  fieldUge: 'Kompyuter',
  attachmentsTitle: 'Ilovalar',
  noAssignee: 'Hali biriktirilmagan',

  // ── Status labels (codes stay untranslated) ───────────────────────────────
  statusOpen: 'Ochiq',
  statusInProgress: 'Bajarilmoqda',
  statusDone: 'Bajarildi',
  statusRated: 'Baholandi',

  // ── Priority labels ────────────────────────────────────────────────────────
  priorityUrgent: 'Juda zarur',
  priorityNormal: 'Zarur',
  priorityLow: 'Zarur emas',

  // ── Rate / reopen (creator, on a done ticket) ──────────────────────────────
  rate: 'Baholash',
  rateTitle: 'Ishni baholang',
  rateNotePlaceholder: 'Izoh (ixtiyoriy)',
  ratingLabel: 'Baho',
  rateDone: 'Baholandi',
  reopen: 'Qayta ochish',
  reopenConfirmTitle: 'Qayta ochish',
  reopenConfirmMessage: 'Murojaatni qayta ochishni tasdiqlaysizmi?',
  reopenDone: 'Qayta ochildi',
  actionError: "Amalni bajarib bo'lmadi",

  // ── AKT navbati / qidiruv (2026-09-13) ──
  tabMine: 'Mening',
  tabQueue: 'Navbat',
  searchPlaceholder: 'Tavsif, UGE yoki xona...',
  filterAll: 'Barchasi',
  take: 'Qabul qilish',
  takeDone: 'Murojaat qabul qilindi',
  markDone: 'Bajarildi deb belgilash',
  markDoneConfirm: 'Murojaat bajarildi deb belgilansinmi?',
  markDoneDone: 'Murojaat yakunlandi',
  creatorLabel: 'Murojaatchi',
  unreadMessages: '{{count}} ta yangi xabar',
  ratingNoteLabel: 'Baho izohi',
  participantsTitle: 'Ishtirokchilar',
} as const;
