// Russian translation of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Отправить запрос',
  detailTitle: 'Детали запроса',
  teamTitle: 'Запросы команды',
  incomingTitle: 'Входящие запросы',
  myTitle: 'Запросы',

  typeLabel: 'Тип запроса *',
  startLabel: 'Начало *',
  endLabel: 'Окончание *',
  supervisorLabel: 'Руководитель (утверждающий)',
  commentLabel: 'Комментарий (необязательно)',
  commentPlaceholder: 'Кратко опишите причину...',
  noSupervisor: 'Руководитель не назначен',
  supervisorHint: 'Запрос отправляется напрямую в отдел кадров',
  endBeforeStart: 'Время окончания должно быть позже начала',

  startPickerTitle: 'Время начала',
  endPickerTitle: 'Время окончания',

  durationDays_one: '{{count}} день',
  durationDays_few: '{{count}} дня',
  durationDays_many: '{{count}} дней',
  durationHours_one: '{{count}} час',
  durationHours_few: '{{count}} часа',
  durationHours_many: '{{count}} часов',
  durationMinutes_one: '{{count}} минута',
  durationMinutes_few: '{{count}} минуты',
  durationMinutes_many: '{{count}} минут',

  typeSheetTitle: 'Выберите тип запроса',
  typeCustomPlaceholder: 'Или введите свой...',

  fieldType: 'Тип запроса',
  fieldStart: 'Начало',
  fieldEnd: 'Окончание',
  fieldComment: 'Комментарий',
  fieldCreated: 'Отправлено',
  typeFallback: 'Запрос',

  signersTitle: 'Утверждающие',
  signerSigned: 'Утвердил',

  approve: 'Утвердить',
  reject: 'Отклонить',
  actionNeeded: 'Требует утверждения',
  rejectReasonTitle: 'Причина отклонения',
  rejectReasonPlaceholder: 'Укажите причину...',

  statusApproved: 'Утверждён',
  statusRejected: 'Отклонён',
  statusPending: 'В ожидании',

  createdAtPrefix: 'Отправлено: {{date}}',
  emptyLeaves: 'Запросов нет',
  emptyPending: 'Ожидающих запросов нет',
  notFound: 'Данные не найдены',

  errorTitle: 'Ошибка',
  endMustBeAfterStart: 'Время окончания должно быть позже времени начала',
  createdSuccess: 'Запрос отправлен',
  approvedSuccess: 'Запрос утверждён',
  rejectedSuccess: 'Запрос отклонён',

  approveError: 'Ошибка при утверждении',
  rejectError: 'Ошибка при отклонении',
} as const;
