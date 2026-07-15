// Visitors (Mehmonlar) feature strings — list, detail, and create/edit form.
// uz-Latn is the source of truth; the other three locales must expose the exact
// same key set (parity test). Reuses common.* (cancel/save/delete/…) instead of
// re-declaring shared button labels.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  listTitle: 'Mehmonlar',
  searchPlaceholder: 'Ism, tashkilot yoki qabul qiluvchi...',
  nameFallback: 'Mehmon',
  statusActive: 'Aktiv',
  statusInactive: 'Nofaol',
  emptySearch: 'Hech narsa topilmadi',
  emptyList: "Mehmonlar yo'q",

  // ── Detail screen ───────────────────────────────────────────────────────────
  detailTitle: 'Mehmon',
  permitActive: 'Aktiv ruxsat',
  cardNo: 'Karta: {{value}}',
  qrDownload: 'Yuklab olish',
  qrShare: 'Ulashish',
  qrShareMessage: '{{name}} — QR kod',

  // Detail info rows
  fieldPhone: 'Telefon',
  fieldTelegram: 'Telegram',
  fieldPin: 'JSHSHIR',
  hostSection: 'Qabul qiluvchi',
  fieldHost: 'Xodim',
  fieldHostPhone: 'Ichki raqam',
  fieldBranch: 'Filial',
  permitSection: 'Ruxsat muddati',
  fieldValidFrom: 'Boshlanishi',
  fieldValidUntil: 'Tugashi',
  fieldLastVisit: 'Oxirgi tashrif',
  fieldVisitCount: 'Tashriflar soni',

  // Delete confirmation
  deleteTitle: "O'chirish",
  deleteConfirm: "Mehmonni o'chirishni xohlaysizmi?",
  deleteConfirmAction: "Ha, o'chirish",
  deleteError: "O'chirishda xatolik",

  // ── Form screen ─────────────────────────────────────────────────────────────
  editTitle: 'Mehmonni tahrirlash',
  createTitle: 'Yangi mehmon',

  // Photo
  photoReplace: 'Rasmni almashtirish',
  photoUpload: 'Rasm yuklash',
  photoHint: "Rasm bo'lsa, terminal yuzni tanib kiritadi. Bo'lmasa — QR orqali.",
  photoPermTitle: 'Ruxsat kerak',
  photoPermMessage: 'Rasm tanlash uchun galereyaga ruxsat bering.',
  photoRejectedTitle: 'Rasm qabul qilinmadi',
  photoRejectedMessage: 'Terminal yuzni tanimadi. Boshqa rasm tanlang.',

  // Field labels
  labelName: 'F.I.SH',
  labelOrg: 'Tashkilot nomi',
  labelPosition: 'Lavozim',
  labelTelegram: 'Telegram',
  labelPhone: 'Telefon raqami',
  placeholderName: 'Azimov Jasur Shamsiyevich',
  placeholderOrg: "O'zbekiston Milliy Banki",
  placeholderPosition: 'Bosh mutaxassis',
  placeholderTelegram: 'jasur_azimov',
  placeholderPhone: '+998 90 123 45 67',

  // Date range
  dateGroupLabel: 'Kelish — Ketish vaqti',
  dateFrom: 'Kelish',
  dateUntil: 'Ketish',
  dateHint: "Ushbu muddatda mehmon kirish huquqiga ega bo'ladi.",
  fromPickerTitle: 'Kelish vaqti',
  untilPickerTitle: 'Ketish vaqti',

  // Validation / errors
  errorTitle: 'Xatolik',
  nameRequired: 'Ism-sharif kiritilishi shart',
  untilBeforeFrom: "Ketish vaqti kelish vaqtidan keyin bo'lishi kerak",
} as const;
