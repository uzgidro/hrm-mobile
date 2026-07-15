// Russian translation of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Отправить заявку',
  detailTitle: 'Детали заявки',
  teamTitle: 'Заявки команды',
  incomingTitle: 'Входящие заявки',
  myTitle: 'Заявки',

  typeLabel: 'Тип заявки *',
  startLabel: 'Начало *',
  endLabel: 'Окончание *',
  supervisorLabel: 'Руководитель (утверждающий)',
  commentLabel: 'Комментарий (необязательно)',
  commentPlaceholder: 'Кратко опишите причину...',
  noSupervisor: 'Руководитель не назначен',
  supervisorHint: 'Заявка отправляется напрямую в отдел кадров',
  pickSupervisor: 'Выберите руководителя',
  pickSupervisorTitle: 'Выбор руководителя',
  supervisorRequired: 'Пожалуйста, выберите утверждающего руководителя',
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

  typeSheetTitle: 'Выберите тип заявки',
  typeCustomPlaceholder: 'Или введите свой...',

  // Preset leave-type labels. Keys are the untranslated LEAVE_TYPES values.
  presetType: {
    "Xizmat topshirig'i": 'Служебное задание',
    Kasallik: 'Больничный',
    "Ta'til": 'Отпуск',
    'Shaxsiy sabab': 'Личная причина',
    Boshqa: 'Другое',
  },

  fieldType: 'Тип заявки',
  fieldStart: 'Начало',
  fieldEnd: 'Окончание',
  fieldComment: 'Комментарий',
  fieldCreated: 'Отправлено',
  typeFallback: 'Заявка',

  signersTitle: 'Утверждающие',
  signerSigned: 'Утвердил',

  approve: 'Утвердить',
  reject: 'Отклонить',
  delete: 'Удалить',
  deleteConfirmTitle: 'Удалить заявку',
  deleteConfirmMessage: 'Удалить эту заявку? Это действие нельзя отменить.',
  actionNeeded: 'Требует утверждения',
  rejectReasonTitle: 'Причина отклонения',
  rejectReasonPlaceholder: 'Укажите причину...',

  statusApproved: 'Утверждён',
  statusRejected: 'Отклонён',
  statusPending: 'В ожидании',

  createdAtPrefix: 'Отправлено: {{date}}',
  emptyLeaves: 'Заявок нет',
  emptyPending: 'Ожидающих заявок нет',
  notFound: 'Данные не найдены',

  errorTitle: 'Ошибка',
  endMustBeAfterStart: 'Время окончания должно быть позже времени начала',
  createdSuccess: 'Заявка отправлена',
  approvedSuccess: 'Заявка утверждена',
  rejectedSuccess: 'Заявка отклонена',

  approveError: 'Ошибка при утверждении',
  rejectError: 'Ошибка при отклонении',
  deletedSuccess: 'Заявка удалена',
  deleteError: 'Ошибка при удалении',
} as const;
