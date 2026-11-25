// Sanatorium, mobile parity round: sanPlaces texts (journey, housekeeping, transfers, waitlist, broadcasts, territory, info, switches).
export default {
  journey: {
    keyHint: "Лотин ҳарфлари, рақамлар ва _ (ўзгартириб бўлмайди)",
    triggerHint: "Воқеа юз берганда меҳмон шу босқичга ўтади",
    manualOnly: "Фақат қўлда",
  },
  hk: {
    oos: "Ёпиқ",
    auto: "авто",
    anyAssignee: "Барча ижрочилар",
    assigneeHint: "Фақат хона тозаловчи роли бор ходимлар",
    floorN: "{{n}}-қават",
    openN: "Вазифа: {{n}}",
  },
  transfer: {
    carAndDriver: "Машина / ҳайдовчи",
    driverRequired: "Машина ёки ҳайдовчи исмини кўрсатинг",
    peopleRange: "Одамлар сони: 1 дан 20 гача",
    vehicleReadonly: "Машина ва ҳайдовчи",
    notSet: "Тайинланмаган",
    confirm: "Тасдиқлаш",
    confirmed: "Трансфер тасдиқланди",
  },
  waitlist: {
    requestN: "Сўров №{{n}}",
    offersN: "Таклифлар: {{n}}",
    phoneInvalid: "Телефон +998 ва 9 рақамдан иборат бўлиши керак",
    convertTitle: "{{name}}: жой бериш",
    convertHint: "Муддат: {{period}}. Кейинги ойнада меҳмонни текшириб, хона танлайсиз.",
    birthFuture: "Туғилган сана келажакда бўлиши мумкин эмас",
  },
  bc: {
    createdBy: "Юборувчи",
    noReachable: "Telegram уланган меҳмон йўқ: юбориб бўлмайди",
    skippedHint: "Telegram уланмаган меҳмонлар ўтказиб юборилади",
    sentOf: "Юборилди: {{n}} / {{total}}",
    history: "Юборилган эълонлар",
    skippedN: "Ўтказиб юборилган: {{n}}",
    failedN: "Хато: {{n}}",
  },
  territory: {
    floorInvalid: "Қават: -5 дан 100 гача бутун сон",
  },
  info: {
    bodyRequired: "Ўзбекча матнни киритинг",
    titleRequired: "Ўзбекча сарлавҳани киритинг",
  },
  feat: {
    lead: "Бўлимни ўчирсангиз, у менюдан, меҳмон кабинетидан ва ботдан йўқолади. Маълумотлар сақланиб қолади.",
    on: "Ёқилган",
    off: "Ўчирилган",
    group: {
      existing: "Асосий имкониятлар",
      content: "Меҳмон йўли, харита, контент",
      catalog: "Каталог ва тўловлар",
      ops: "Операциялар",
      other: "Бошқа",
    },
  },
};
