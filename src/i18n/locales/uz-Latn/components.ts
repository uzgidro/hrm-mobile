// Strings for the shared cross-feature components in src/components/*
// (AccessDenied, AttachmentField, DateTimePicker, RootErrorBoundary). uz-Latn
// is the source of truth; the other three locales must expose the exact same
// key set (parity test). Generic labels (Bekor / Tayyor / Qidirish / Topilmadi
// / Qayta urinish) are NOT duplicated here — those reuse the `common` section.
export default {
  // AccessDenied
  accessDeniedTitle: "Ruxsat yo'q",
  accessDeniedText: "Bu sahifaga kirish huquqingiz yo'q",

  // AttachmentField
  attachmentLabel: 'Ilova',
  addFile: "Fayl qo'shish",

  // DateTimePicker time units
  hourUnit: 'soat',
  minuteUnit: 'daqiqa',

  // RootErrorBoundary
  crashTitle: "Nimadir noto'g'ri ketdi",
  crashText: 'Ilovada kutilmagan xatolik yuz berdi.',
} as const;
