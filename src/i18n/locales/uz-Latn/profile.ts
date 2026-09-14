// Profile feature strings — the profile home (ProfileScreen: user card, org,
// appearance/language/settings sections, logout) and the self-edit form
// (ProfileEditScreen). uz-Latn is the source of truth; the other three locales
// expose the exact same key set (parity test).
//
// Web-parity note: the maritalStatus.* KEYS are the API `maritial_status` enum
// codes (single/married/…) — codes are never translated, only their labels.
// LANGUAGE_NATIVE_NAME (from @/i18n/locales) supplies the language switcher's
// self-names, so those are NOT re-declared here. Reuses common.* (edit/save/
// cancel/ok) where the label already exists.
export default {
  // ── Home screen ─────────────────────────────────────────────────────────────
  title: 'Profil',
  userFallback: 'Foydalanuvchi',
  reference: "Ma'lumotnoma",
  orgFallback: 'Tashkilot',
  branchFallback: 'Joriy filial',

  // Section labels
  sectionAppearance: "Ko'rinish",
  sectionLanguage: 'Til',
  sectionSettings: 'Sozlamalar',

  // Appearance (theme) options
  themeSystem: 'Tizim',
  themeLight: "Yorug'",
  themeDark: 'Tungi',

  // Settings rows
  onlySubordinates: "Faqat bo'ysunuvchilar",
  onlySubordinatesHint: "Jamoa va ro'yxatlarda faqat sizga biriktirilganlar",
  changePin: "PIN kodni o'zgartirish",
  biometrics: 'Biometrik kirish',
  biometricsHint: 'Barmoq izi yoki yuz bilan tez ochish',

  // Logout
  logout: 'Chiqish',
  logoutConfirm: 'Tizimdan chiqishni xohlaysizmi?',
  logoutYes: 'Ha, chiqish',

  version: 'Dastur versiyasi {{version}}',

  // ── Edit form ───────────────────────────────────────────────────────────────
  editTitle: "Ma'lumotlarni o'zgartirish",
  editNote: "Ish ma'lumotlari (bo'lim, lavozim, ish vaqti) faqat kadrlar bo'limi tomonidan o'zgartiriladi.",

  sectionPersonal: 'Shaxsiy',
  sectionContact: 'Kontakt',
  sectionDocuments: 'Hujjatlar',

  fieldName: 'F.I.O.',
  fieldAddress: 'Manzil',
  fieldMaritalStatus: 'Oilaviy holati',
  fieldPhone: 'Telefon',
  fieldInternalPhone: 'Ichki telefon',
  fieldPassportSeries: 'Pasport seriya',
  fieldPassportNumber: 'Pasport raqami',
  fieldPassportIssuedBy: 'Pasport berilgan joy',
  fieldJshir: 'JSHSHIR',
  fieldPinfl: 'PINFL',
  fieldInn: 'INN',
  fieldPensionAccount: 'Pensiya hisob raqami',

  // Marital status options (keys are the API enum codes — never translated)
  maritalStatus: {
    single: 'Turmush qurmagan',
    married: 'Turmush qurgan',
    divorced: 'Ajrashgan',
    widowed: 'Beva',
  },

  // Save flow alerts
  nameRequired: 'F.I.O. kiritilishi shart',
  savedTitle: 'Saqlandi',
  savedMessage: "Ma'lumotlar yangilandi",
  saveErrorTitle: 'Xatolik',
  pushDiagnostics: 'Bildirishnomalar tekshiruvi',
  pushDiagnosticsHint: "Push kelmayotgan bo'lsa — sababini shu yerda ko'ring",
  pushIntro: "Push-xabar to'rt bo'g'indan o'tadi: qurilma ruxsati → qurilma tokeni → serverda ro'yxat → yuborish. Qaysi bo'g'in uzilganini quyida ko'rasiz.",
  pushPermission: 'Qurilma ruxsati',
  pushPerm_granted: 'Ruxsat berilgan',
  pushPerm_denied: 'Ruxsat berilmagan',
  pushPerm_undetermined: "Hali so'ralmagan",
  pushPerm_unavailable: 'Bu qurilmada mavjud emas',
  pushOpenSettings: 'Sozlamalarni ochish',
  pushDeviceToken: 'Qurilma tokeni',
  pushNoToken: 'Token olinmagan',
  pushServer: "Serverda ro'yxat",
  pushServerCount_one: '{{count}} ta qurilma',
  pushServerCount_other: '{{count}} ta qurilma',
  pushReregister: "Qayta ro'yxatdan o'tkazish",
  pushReregistered: "Qayta ro'yxatdan o'tkazildi",
  pushSendTest: 'Sinov xabarini yuborish',
  pushTestSent_one: 'Yuborildi ({{count}} ta qurilma) — bir necha soniyada kelishi kerak',
  pushTestSent_other: 'Yuborildi ({{count}} ta qurilma) — bir necha soniyada kelishi kerak',
  pushTestHint: "Sinov xabari serverdagi barcha qurilmalaringizga yuboriladi. Kelmasa — yuqoridagi qizil bo'g'inni tuzating (ruxsat yo'q bo'lsa Sozlamalardan yoqing, token yo'q bo'lsa ilovani do'kondan yangilang).",
  pushServerUnknown: "Server hali bu tekshiruvni qo'llamaydi",
} as const;
