// Russian translation of the letters namespace. Keep the key set identical to
// uz-Latn/letters.ts (a parity test enforces this). Russian has three plural
// forms (_one/_few/_many) where uz/en have two (_one/_other).
export default {
  // ── Screen / header titles ──────────────────────────────────────────────────
  listTitle: 'Письма',
  detailTitle: 'Письмо',
  createTitle: 'Новое письмо',
  documentTitle: 'Документ',

  // ── List screen ─────────────────────────────────────────────────────────────
  tabAction: 'Мне',
  tabMine: 'Мои',
  emptyAction: 'Нет писем, ожидающих подписи',
  empty: 'Писем нет',
  actionPending: 'Ожидается ваша подпись',

  // ── Detail screen ───────────────────────────────────────────────────────────
  openDocument: 'Открыть документ',
  sectionContent: 'Содержание',
  sectionInfo: 'Информация',
  fieldAuthor: 'Автор',
  fieldDate: 'Дата',
  fieldDeparture: 'Выезд',
  fieldReturn: 'Возвращение',
  sectionSigners: 'Подписанты',
  rejectionReason: 'Причина отклонения',

  // ── Action bar ──────────────────────────────────────────────────────────────
  sign: 'Подписать',
  reject: 'Отклонить',

  // ── Document (OnlyOffice) screen ────────────────────────────────────────────
  documentLoading: 'Документ загружается...',
  documentLoadError: 'Не удалось загрузить документ',
  documentOpenError: 'Ошибка при открытии документа',

  // ── Create form: field labels ───────────────────────────────────────────────
  fieldType: 'Тип документа',
  fieldLetterDate: 'Дата',
  fieldShortSummary: 'Краткое содержание',
  fieldText: 'Текст',
  fieldMainSigner: 'Руководство (подписант)',
  fieldCoordinators: 'Согласующие',
  fieldDepartureDate: 'Дата выезда',
  fieldArrivalDate: 'Дата приезда',
  fieldRegions: 'Область(и)',
  fieldDestinations: 'Филиал(ы) назначения',
  fieldTripPurpose: 'Цель поездки',
  fieldWorkPlan: 'План работы командировки',
  fieldLeadership: 'Руководство (Министр / Deputy)',
  fieldSubmitter: 'Отправитель',
  fieldAttachment: 'Приложение или основание',

  // ── Create form: placeholders ───────────────────────────────────────────────
  placeholderSelect: 'Выберите...',
  placeholderSelectDate: 'Выберите дату',
  placeholderDate: 'Дата',
  placeholderRegions: 'Выберите области...',
  placeholderDestinations: 'Выберите филиалы...',
  placeholderTripPurpose: 'Цель поездки...',
  placeholderWorkPlan: 'План работы...',
  placeholderLeadership: 'Выберите руководство...',
  placeholderSubmitter: 'Выберите отправителя...',
  placeholderShortSummary: 'Краткое содержание...',
  placeholderText: 'Текст документа...',
  placeholderCoordinators: 'Выберите согласующих...',

  // ── Create form: type option labels ─────────────────────────────────────────
  typeNotification: 'Уведомление',
  typeApplication: 'Заявление',
  typeBusinessTrip: 'Командировка',

  // ── Create form: type hints ─────────────────────────────────────────────────
  hintApplication: 'Заявление: все согласующие и руководитель должны подписать. Если кто-то отклонит — документ аннулируется.',
  hintBusinessTrip: 'Командировка: после подтверждения руководителем письмо появится в аккаунте HR филиала назначения.',
  hintNotification: 'Уведомление: обязательна только подпись руководителя. Согласующие по желанию.',

  // ── Picker modal titles ─────────────────────────────────────────────────────
  pickerType: 'Тип документа',
  pickerMainSigner: 'Руководство (подписант)',
  pickerCoordinators: 'Согласующие',
  pickerLeadership: 'Руководство',
  pickerSubmitter: 'Отправитель',
  pickerRegions: 'Области',
  pickerDestinations: 'Филиалы назначения',

  // ── Selected-count summaries (i18next plurals) ──────────────────────────────
  regionsSelected_one: '{{count}} область',
  regionsSelected_few: '{{count}} области',
  regionsSelected_many: '{{count}} областей',
  destinationsSelected_one: '{{count}} филиал',
  destinationsSelected_few: '{{count}} филиала',
  destinationsSelected_many: '{{count}} филиалов',
  leadershipSelected_one: 'Выбран {{count}}',
  leadershipSelected_few: 'Выбрано {{count}}',
  leadershipSelected_many: 'Выбрано {{count}}',
  coordinatorsSelected_one: '{{count}} согласующий',
  coordinatorsSelected_few: '{{count}} согласующих',
  coordinatorsSelected_many: '{{count}} согласующих',

  // ── Validation alerts ───────────────────────────────────────────────────────
  validationTitle: 'Ошибка',
  typeRequired: 'Необходимо выбрать тип документа',
  branchNotFound: 'Филиал не определён',
  mainSignerRequired: 'Необходимо выбрать руководство (подписанта)',
  destinationRequired: 'Необходимо выбрать хотя бы один филиал назначения',
  submitterRequired: 'Необходимо выбрать отправителя',
  leadershipRequired: 'Необходимо выбрать хотя бы одного руководителя',
  attachmentNoticeTitle: 'Примечание',
  attachmentFailed: 'Письмо сохранено, но приложение не загружено',

  // ── Sign / reject workflow ──────────────────────────────────────────────────
  actionDoneTitle: 'Выполнено',
  signed: 'Подписано',
  rejected: 'Отклонено',
  rejectConfirmTitle: 'Отклонить',
  rejectConfirmMessage: 'Подтвердить отклонение письма?',

  // ── Error fallbacks ─────────────────────────────────────────────────────────
  createError: 'Произошла ошибка',
  actionError: 'Ошибка',

  sectionReport: 'Отчёт',
  reportTitle: 'Отправить отчёт',
  reportEditTitle: 'Редактировать отчёт',
  reportSubmit: 'Отправить отчёт',
  reportEdit: 'Редактировать отчёт',
  reportSend: 'Отправить',
  reportReset: 'Удалить',
  reportNumber: 'Номер отчёта',
  reportDate: 'Дата',
  reportSummary: 'Резюме',
  reportSummaryPlaceholder: 'Краткое резюме...',
  reportTask: 'Задание',
  reportTaskPlaceholder: 'Цель командировки / задание...',
  reportContent: 'Текст отчёта',
  reportContentPlaceholder: 'Введите текст отчёта...',
  reportContentRequired: 'Не введён текст отчёта',
  reportAttachment: 'Вложение (необязательно)',
  reportReturnedReason: 'Причина возврата',
  reportFileFailed: 'Отчёт отправлен, но вложение не загрузилось',
  reportSubmitError: 'Ошибка при отправке отчёта',
  reportResetConfirmTitle: 'Удалить отчёт',
  reportResetConfirmMessage: 'Отчёт будет удалён и станет доступен для повторного редактирования. Продолжить?',
} as const;
