// Sanatorium, mobile parity round: sanPlaces texts (journey, housekeeping, transfers, waitlist, broadcasts, territory, info, switches).
export default {
  journey: {
    keyHint: "Lotin harflari, raqamlar va _ (o'zgartirib bo'lmaydi)",
    triggerHint: "Voqea yuz berganda mehmon shu bosqichga o'tadi",
    manualOnly: "Faqat qo'lda",
  },
  hk: {
    oos: "Yopiq",
    auto: "avto",
    anyAssignee: "Barcha ijrochilar",
    assigneeHint: "Faqat xona tozalovchi roli bor xodimlar",
    floorN: "{{n}}-qavat",
    openN: "Vazifa: {{n}}",
  },
  transfer: {
    carAndDriver: "Mashina / haydovchi",
    driverRequired: "Mashina yoki haydovchi ismini ko'rsating",
    peopleRange: "Odamlar soni: 1 dan 20 gacha",
    vehicleReadonly: "Mashina va haydovchi",
    notSet: "Tayinlanmagan",
    confirm: "Tasdiqlash",
    confirmed: "Transfer tasdiqlandi",
  },
  waitlist: {
    requestN: "So'rov №{{n}}",
    offersN: "Takliflar: {{n}}",
    phoneInvalid: "Telefon +998 va 9 raqamdan iborat bo'lishi kerak",
    convertTitle: "{{name}}: joy berish",
    convertHint: "Muddat: {{period}}. Keyingi oynada mehmonni tekshirib, xona tanlaysiz.",
    birthFuture: "Tug'ilgan sana kelajakda bo'lishi mumkin emas",
  },
  bc: {
    createdBy: "Yuboruvchi",
    noReachable: "Telegram ulangan mehmon yo'q: yuborib bo'lmaydi",
    skippedHint: "Telegram ulanmagan mehmonlar o'tkazib yuboriladi",
    sentOf: "Yuborildi: {{n}} / {{total}}",
    history: "Yuborilgan e'lonlar",
    skippedN: "O'tkazib yuborilgan: {{n}}",
    failedN: "Xato: {{n}}",
  },
  territory: {
    floorInvalid: "Qavat: -5 dan 100 gacha butun son",
  },
  info: {
    bodyRequired: "O'zbekcha matnni kiriting",
    titleRequired: "O'zbekcha sarlavhani kiriting",
  },
  feat: {
    lead: "Bo'limni o'chirsangiz, u menyudan, mehmon kabinetidan va botdan yo'qoladi. Ma'lumotlar saqlanib qoladi.",
    on: "Yoqilgan",
    off: "O'chirilgan",
    group: {
      existing: "Asosiy imkoniyatlar",
      content: "Mehmon yo'li, xarita, kontent",
      catalog: "Katalog va to'lovlar",
      ops: "Operatsiyalar",
      other: "Boshqa",
    },
  },
};
