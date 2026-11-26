// Sanatorium, mobile parity round: sanPlaces texts (journey, housekeeping, transfers, waitlist, broadcasts, territory, info, switches).
export default {
  journey: {
    keyHint: "Латиница, цифры и _ (изменить нельзя)",
    triggerHint: "При наступлении события гость переходит в этот этап",
    manualOnly: "Только вручную",
  },
  hk: {
    oos: "Закрыт",
    auto: "авто",
    anyAssignee: "Все исполнители",
    assigneeHint: "Только сотрудники с ролью уборщика",
    floorN: "{{n}} этаж",
    openN: "Задач: {{n}}",
  },
  transfer: {
    carAndDriver: "Машина / водитель",
    driverRequired: "Укажите автомобиль или имя водителя",
    peopleRange: "Количество людей: от 1 до 20",
    vehicleReadonly: "Машина и водитель",
    notSet: "Не назначено",
    confirm: "Подтвердить",
    confirmed: "Трансфер подтверждён",
  },
  waitlist: {
    requestN: "Заявка №{{n}}",
    offersN: "Предложений: {{n}}",
    phoneInvalid: "Телефон: +998 и 9 цифр",
    convertTitle: "{{name}}: дать место",
    convertHint: "Период: {{period}}. В следующем окне вы проверите гостя и выберете номер.",
    birthFuture: "Дата рождения не может быть в будущем",
  },
  bc: {
    createdBy: "Отправил",
    noReachable: "Нет гостей с Telegram: отправить нельзя",
    skippedHint: "Гости без Telegram пропускаются",
    sentOf: "Отправлено: {{n}} / {{total}}",
    history: "История рассылок",
    skippedN: "Пропущено: {{n}}",
    failedN: "Ошибок: {{n}}",
  },
  territory: {
    floorInvalid: "Этаж: целое число от -5 до 100",
  },
  info: {
    bodyRequired: "Введите текст на узбекском",
    titleRequired: "Введите заголовок на узбекском",
  },
  feat: {
    lead: "Выключенный раздел исчезает из меню, кабинета гостя и бота. Данные сохраняются.",
    on: "Включено",
    off: "Выключено",
    group: {
      existing: "Основные возможности",
      content: "Путь гостя, карта, контент",
      catalog: "Каталог и оплаты",
      ops: "Операции",
      other: "Прочее",
    },
  },
};
