// Cyrillic transliteration of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {

  // Server `code` -> text. `src/api/errors.ts` looks these up BEFORE falling
  // back to the server's own sentence, which is always Uzbek.
  forbidden: 'Ruxsat yo\'q',
  not_authorized: 'Bu amalga ruxsatingiz yo\'q',
  extension_not_later: 'Янги қайтиш санаси жорий санадан кейин бўлиши керак',
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
  generic: 'Хатолик юз берди',
  saveFailed: 'Сақлашда хатолик юз берди',
  sendFailed: 'Сўров юборишда хатолик юз берди',
  refreshFailed: "Маълумотни янгилаб бўлмади",
  actionFailed: "Амални бажариб бўлмади",
  timeout: "Сервер жавоб бермади (вақт тугади). Амал бажарилган бўлиши ҳам мумкин — рўйхатни янгиланг.",
  network: "Интернет алоқаси йўқ. Уланишни текширинг.",
} as const;
