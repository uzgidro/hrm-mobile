// Cyrillic transliteration of the login screen strings.
// See uz-Latn/auth.ts for the meaning of each key.
export default {
  appName: 'Uzgidro HRM',
  appSubtitle: 'Ходимлар бошқарув тизими',
  usernameLabel: 'Фойдаланувчи номи',
  usernamePlaceholder: 'Username ёки email',
  passwordLabel: 'Парол',
  loginButton: 'Кириш',
  oneIdButton: 'OneID орқали кириш',

  credentialsRequired: 'Логин ва парол киритилиши шарт',
  loginError: 'Кириш хатоси',
  invalidCredentials: "Логин ёки парол нотўғри",
  oneIdError: 'OneID орқали киришда хатолик юз берди',

  // Adaptive CAPTCHA + throttle (2026-09-15)
  captchaLabel: 'Текширув',
  captchaPlaceholder: 'Расмдаги белгилар',
  captchaHint: 'Бир неча нотўғри уринишдан сўнг расмдаги белгиларни киритиш талаб қилинади.',
  captchaRefresh: 'Бошқа расм',
  captchaRequired: 'Расмдаги белгиларни киритинг',
  captchaInvalid: 'Расмдаги белгилар нотўғри — янги расм бўйича қайта киритинг',
  tooManyAttempts: 'Жуда кўп уриниш. Бир неча дақиқадан сўнг қайта урининг',
} as const;
