// Common API-error fallback messages shown when getApiErrorMessage() can't
// extract a message from the response (src/api/errors.ts). Wave 0 seeds only the
// high-reuse strings that repeat across many catch blocks; feature-specific
// fallbacks migrate with their own feature waves.
//
// `generic` is the module-level DEFAULT_MESSAGE used by getApiErrorMessage/
// toApiError when no explicit fallback is passed.
export default {

  // Server `code` -> text. `src/api/errors.ts` looks these up BEFORE falling
  // back to the server's own sentence, which is always Uzbek.
  forbidden: 'Ruxsat yo\'q',
  not_authorized: 'Bu amalga ruxsatingiz yo\'q',
  extension_not_later: 'Yangi qaytish sanasi joriy sanadan keyin bo\'lishi kerak',
  not_found: 'Topilmadi',
  invalid_addressee: 'Adresat rahbariyat yoki kadr bo\'lishi kerak — ro\'yxatdan tanlang',
  invalid_management_signer: 'Tanlangan xodim bu filialning rahbariyati emas',
  letter_author_required: 'Hujjat muallifini tanlang',
  signer_not_found: 'Tanlangan adresat topilmadi',
  not_home_branch_hr: 'Qaytishni faqat o\'z filiali kadri tasdiqlaydi',
  trip_finalized: 'Safar yakunlangan — o‘zgartirib bo‘lmaydi',
  trip_not_registered: 'Safar hali ro\'yxatdan o\'tmagan',
  employee_required: 'Bu amal uchun xodim kartochkasi kerak',
  no_branch: 'Hisobga filial biriktirilmagan',
  validation_error: 'Kiritilgan ma\'lumot noto\'g\'ri',
  invalid_date_range: 'Sana oralig\'i noto\'g\'ri',
  search_too_long: 'Qidiruv matni juda uzun',
  generic: 'Xatolik yuz berdi',
  saveFailed: 'Saqlashda xatolik yuz berdi',
  sendFailed: "So'rov yuborishda xatolik yuz berdi",
  // React Query cache onError toast fallbacks (src/lib/queryClient.ts).
  refreshFailed: "Ma'lumotni yangilab bo'lmadi",
  actionFailed: "Amalni bajarib bo'lmadi",
} as const;
