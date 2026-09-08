// LLM assistant (Yordamchi) strings. uz-Latn is the source of truth; the
// other three locales must expose the exact same key set (parity test).
export default {
  title: 'Yordamchi',
  subtitle: 'AI yordamchi',
  newChat: 'Yangi suhbat',
  sessionsTitle: 'Suhbatlar',
  sessionsEmpty: 'Suhbatlar yo‘q — yangisini boshlang',
  sessionFallback: 'Suhbat',
  inputPlaceholder: 'Savolingizni yozing…',
  thinking: 'O‘ylayapman…',
  streamError: 'Javob olishda xatolik yuz berdi',
  loadError: 'Suhbatni yuklashda xatolik',
  deleteConfirmTitle: 'Suhbatni o‘chirish',
  deleteConfirmMessage: 'Bu suhbat butunlay o‘chiriladi. Davom etasizmi?',
  disclaimer: 'AI xato qilishi mumkin. Muhim ma’lumotlarni tekshiring.',
} as const;
