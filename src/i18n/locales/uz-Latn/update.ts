// In-app update prompt (Google Play flexible update Alert, Android only —
// src/services/appUpdates.ts). uz-Latn is the source of truth; the other three
// locales must expose the exact same key set (parity test).
export default {
  available: 'Yangilanish mavjud',
  message: "Ilovaning yangi versiyasi chiqdi. Yangilanishni hozir o'rnatishni tavsiya qilamiz.",
  later: 'Keyinroq',
  install: 'Yangilash',
} as const;
