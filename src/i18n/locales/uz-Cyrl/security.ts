// Uzbek Cyrillic transliteration of the security (app-lock) feature strings.
// See uz-Latn/security.ts for the meaning of each key.
export default {
  unlockTitle: 'PIN кодни киритинг',

  setupTitle: 'PIN код ўрнатинг',
  setupConfirmTitle: 'PIN кодни тасдиқланг',
  setupSubtitle: 'Иловани ҳимоялаш учун 4 хонали PIN код киритинг',
  setupConfirmSubtitle: 'PIN кодни қайтадан киритинг',

  changeTitle: 'PIN кодни ўзгартириш',
  changeCurrentTitle: 'Жорий PIN кодни киритинг',
  changeNewTitle: 'Янги PIN код киритинг',
  changeConfirmTitle: 'Янги PIN кодни тасдиқланг',
  changeSuccess: 'PIN код ўзгартирилди',

  attemptsLeft_one: "Нотўғри PIN код. {{count}} та уриниш қолди.",
  attemptsLeft_other: "Нотўғри PIN код. {{count}} та уриниш қолди.",
  mismatch: "PIN кодлар мос келмади. Қайтадан уриниб кўринг.",

  forceLogoutTitle: 'Уринишлар сони тугади',
  forceLogoutMessage: 'Хавфсизлик мақсадида тизимдан чиқарилдингиз. Қайтадан киринг.',

  biometricPrompt: 'Иловани очиш учун тасдиқланг',

  biometricTitle: 'Биометрик кириш',
  biometricMessage: 'Иловани бармоқ изи ёки юз орқали очишни ёқасизми?',
  biometricLater: 'Кейинроқ',
  biometricEnable: 'Ёқиш',
} as const;
