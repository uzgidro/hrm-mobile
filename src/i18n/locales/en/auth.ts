// English translation of the login screen strings.
// See uz-Latn/auth.ts for the meaning of each key.
export default {
  appName: 'Uzgidro HRM',
  appSubtitle: 'Human resources management system',
  usernameLabel: 'Username',
  usernamePlaceholder: 'Username or email',
  passwordLabel: 'Password',
  loginButton: 'Sign in',
  oneIdButton: 'Sign in with OneID',

  credentialsRequired: 'Username and password are required',
  loginError: 'Sign-in error',
  invalidCredentials: 'Invalid username or password',
  oneIdError: 'Could not sign in with OneID',

  // Adaptive CAPTCHA + throttle (2026-09-15)
  captchaLabel: 'Verification',
  captchaPlaceholder: 'Characters from the image',
  captchaHint: 'After a few failed attempts you must type the characters shown in the image.',
  captchaRefresh: 'Another image',
  captchaRequired: 'Type the characters from the image',
  captchaInvalid: 'The characters are wrong — try again with the new image',
  tooManyAttempts: 'Too many attempts. Try again in a few minutes',
  tomchiIdle: "Hi! I'm Tomchi. Let's start the workday!",
  tomchiWatching: "I'm watching your username closely…",
  tomchiShy: "I won't look at your password, promise!",
  tomchiPeek: "Just one eye… I won't tell anyone!",
  tomchiSad: "Oops! Something's wrong. Shall we try again?",
  tomchiHappy: 'Great! Welcome aboard!',
} as const;
