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

  // Validation + login error alerts
  errorTitle: 'Xato',
  credentialsRequired: 'Login va parol kiritilishi shart',
  loginError: 'Kirish xatosi',
  invalidCredentials: "Login yoki parol noto'g'ri",
} as const;
