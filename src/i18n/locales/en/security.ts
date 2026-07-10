// English translation of the security (app-lock) feature strings.
// See uz-Latn/security.ts for the meaning of each key.
export default {
  unlockTitle: 'Enter PIN code',

  setupTitle: 'Set a PIN code',
  setupConfirmTitle: 'Confirm PIN code',
  setupSubtitle: 'Enter a 4-digit PIN code to protect the app',
  setupConfirmSubtitle: 'Enter the PIN code again',

  changeTitle: 'Change PIN code',
  changeCurrentTitle: 'Enter current PIN code',
  changeNewTitle: 'Enter new PIN code',
  changeConfirmTitle: 'Confirm new PIN code',
  changeSuccess: 'PIN code changed',

  attemptsLeft_one: 'Wrong PIN code. {{count}} attempt left.',
  attemptsLeft_other: 'Wrong PIN code. {{count}} attempts left.',
  mismatch: 'PIN codes do not match. Try again.',

  forceLogoutTitle: 'Out of attempts',
  forceLogoutMessage: 'You have been logged out for security reasons. Please sign in again.',

  biometricPrompt: 'Confirm to open the app',

  biometricTitle: 'Biometric unlock',
  biometricMessage: 'Unlock the app with fingerprint or face?',
  biometricLater: 'Later',
  biometricEnable: 'Enable',
} as const;
