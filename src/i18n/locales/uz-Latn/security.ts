// App-lock (PIN + biometrics) feature strings — the setup, unlock and change
// screens plus the shared PinPad. uz-Latn is the source of truth; the other
// three locales must expose the exact same key set (parity test).
//
// `attemptsLeft` is a plural: it carries the whole "wrong PIN" sentence so the
// remaining-attempts count pluralizes correctly (ru: urinish → попытка/попытки/
// попыток). uz/en are invariant in the noun but still use {{count}}.
export default {
  // ── Unlock screen ───────────────────────────────────────────────────────────
  unlockTitle: 'PIN kodni kiriting',

  // ── Setup screen ────────────────────────────────────────────────────────────
  setupTitle: "PIN kod o'rnating",
  setupConfirmTitle: 'PIN kodni tasdiqlang',
  setupSubtitle: 'Ilovani himoyalash uchun 4 xonali PIN kod kiriting',
  setupConfirmSubtitle: 'PIN kodni qaytadan kiriting',

  // ── Change screen ───────────────────────────────────────────────────────────
  changeTitle: "PIN kodni o'zgartirish",
  changeCurrentTitle: 'Joriy PIN kodni kiriting',
  changeNewTitle: 'Yangi PIN kod kiriting',
  changeConfirmTitle: 'Yangi PIN kodni tasdiqlang',
  changeSuccess: "PIN kod o'zgartirildi",

  // ── Errors (shown under the dots) ───────────────────────────────────────────
  attemptsLeft_one: "Noto'g'ri PIN kod. {{count}} ta urinish qoldi.",
  attemptsLeft_other: "Noto'g'ri PIN kod. {{count}} ta urinish qoldi.",
  mismatch: "PIN kodlar mos kelmadi. Qaytadan urinib ko'ring.",

  // ── Force-logout alert (5 wrong attempts) ───────────────────────────────────
  forceLogoutTitle: 'Urinishlar soni tugadi',
  forceLogoutMessage: 'Xavfsizlik maqsadida tizimdan chiqarildingiz. Qaytadan kiring.',

  // ── Biometrics offer alert (after setup) ────────────────────────────────────
  biometricTitle: 'Biometrik kirish',
  biometricMessage: 'Ilovani barmoq izi yoki yuz orqali ochishni yoqasizmi?',
  biometricLater: 'Keyinroq',
  biometricEnable: 'Yoqish',
} as const;
