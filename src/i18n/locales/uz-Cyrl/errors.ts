// Cyrillic transliteration of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {
  generic: 'Хатолик юз берди',
  saveFailed: 'Сақлашда хатолик юз берди',
  sendFailed: 'Сўров юборишда хатолик юз берди',
  refreshFailed: "Маълумотни янгилаб бўлмади",
  actionFailed: "Амални бажариб бўлмади",
  timeout: "Сервер жавоб бермади (вақт тугади). Амал бажарилган бўлиши ҳам мумкин — рўйхатни янгиланг.",
  network: "Интернет алоқаси йўқ. Уланишни текширинг.",
} as const;
