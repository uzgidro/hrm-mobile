// Login screen strings. uz-Latn is the source of truth; the other three locales
// must expose the exact same key set (parity test). Auth error alerts reuse
// errors.generic where a generic fallback fits.
export default {
  appName: 'Uzgidro HRM',
  appSubtitle: 'Xodimlar boshqaruv tizimi',
  usernameLabel: 'Foydalanuvchi nomi',
  usernamePlaceholder: 'Username yoki email',
  passwordLabel: 'Parol',
  loginButton: 'Kirish',
  oneIdButton: 'OneID orqali kirish',

  // Validation + login error alerts
  credentialsRequired: 'Login va parol kiritilishi shart',
  loginError: 'Kirish xatosi',
  invalidCredentials: "Login yoki parol noto'g'ri",
  oneIdError: "OneID orqali kirishda xatolik yuz berdi",

  // Adaptive CAPTCHA + throttle (2026-09-15)
  captchaLabel: 'Tekshiruv',
  captchaPlaceholder: 'Rasmdagi belgilar',
  captchaHint: 'Bir necha noto\'g\'ri urinishdan so\'ng rasmdagi belgilarni kiritish talab qilinadi.',
  captchaRefresh: 'Boshqa rasm',
  captchaRequired: 'Rasmdagi belgilarni kiriting',
  captchaInvalid: 'Rasmdagi belgilar noto\'g\'ri — yangi rasm bo\'yicha qayta kiriting',
  tooManyAttempts: 'Juda ko\'p urinish. Bir necha daqiqadan so\'ng qayta urining',
  // Tomchi maskoti kirish ekranidagi pufakchada — kayfiyatga qarab.
  tomchiIdle: 'Salom! Men Tomchi. Keling, ish kunini boshlaymiz!',
  tomchiWatching: 'Loginingizni diqqat bilan kuzatyapman…',
  tomchiShy: "Parolingizga qaramayman, xotirjam bo'ling!",
  tomchiPeek: "Faqat bitta ko'z bilan… hech kimga aytmayman!",
  tomchiSad: "Voy! Nimadir noto'g'ri. Yana bir urinib ko'ramiz?",
  tomchiHappy: "Zo'r! Xush kelibsiz!",
} as const;
