// Common API-error fallback messages shown when getApiErrorMessage() can't
// extract a message from the response (src/api/errors.ts). Wave 0 seeds only the
// high-reuse strings that repeat across many catch blocks; feature-specific
// fallbacks migrate with their own feature waves.
//
// `generic` is the module-level DEFAULT_MESSAGE used by getApiErrorMessage/
// toApiError when no explicit fallback is passed.
export default {
  generic: 'Xatolik yuz berdi',
  saveFailed: 'Saqlashda xatolik yuz berdi',
  sendFailed: "So'rov yuborishda xatolik yuz berdi",
} as const;
