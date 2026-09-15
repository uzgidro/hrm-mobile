// Russian translation of the login screen strings.
// See uz-Latn/auth.ts for the meaning of each key.
export default {
  appName: 'Uzgidro HRM',
  appSubtitle: 'Система управления персоналом',
  usernameLabel: 'Имя пользователя',
  usernamePlaceholder: 'Логин или email',
  passwordLabel: 'Пароль',
  loginButton: 'Войти',
  oneIdButton: 'Войти через OneID',

  credentialsRequired: 'Введите логин и пароль',
  loginError: 'Ошибка входа',
  invalidCredentials: 'Неверный логин или пароль',
  oneIdError: 'Не удалось войти через OneID',

  // Adaptive CAPTCHA + throttle (2026-09-15)
  captchaLabel: 'Проверка',
  captchaPlaceholder: 'Символы с картинки',
  captchaHint: 'После нескольких неудачных попыток требуется ввести символы с картинки.',
  captchaRefresh: 'Другая картинка',
  captchaRequired: 'Введите символы с картинки',
  captchaInvalid: 'Символы с картинки неверны — введите по новой картинке',
  tooManyAttempts: 'Слишком много попыток. Повторите через несколько минут',
} as const;
