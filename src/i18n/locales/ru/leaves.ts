// Russian translation of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Отправить заявку',
  detailTitle: 'Детали заявки',
  teamTitle: 'Заявки команды',
  incomingTitle: 'Входящие заявки',
  myTitle: 'Заявки',
  searchPlaceholder: 'Имя, тип или примечание...',
  filterAll: 'Все',

  typeLabel: 'Тип заявки *',
  startLabel: 'Начало *',
  endLabel: 'Окончание *',
  commentLabel: 'Комментарий *',
  commentPlaceholder: 'Кратко опишите причину...',
  routeLabel: 'Кому уйдёт',
  routeToSupervisor: 'Заявка уйдёт вашему непосредственному руководителю: {{name}}',
  routeToHead: 'Заявка уйдёт начальнику вашего отдела: {{name}}',
  routeToNobody: 'Руководитель и начальник отдела не назначены — заявку рассмотрит отдел кадров',
  backHint_one: 'Заявку можно оформить не более чем на {{count}} день назад.',
  backHint_few: 'Заявку можно оформить не более чем на {{count}} дня назад.',
  backHint_many: 'Заявку можно оформить не более чем на {{count}} дней назад.',
  tooFarBack_one: 'Заявку можно оформить не более чем на {{count}} день назад — измените дату начала.',
  tooFarBack_few: 'Заявку можно оформить не более чем на {{count}} дня назад — измените дату начала.',
  tooFarBack_many: 'Заявку можно оформить не более чем на {{count}} дней назад — измените дату начала.',
  descRequired: 'Комментарий обязателен',
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
  homeTitle: "Запросы на отлучку",
  homeAll: "Все",
  homeAwaiting: "Ждут вашего решения: {{count}}",
  homeNoneAwaiting: "Нет запросов, ожидающих вашего решения",
  homeCreate: "Запросить отлучку",
  rejectReasonTitle: 'Причина отклонения',
  rejectReasonPlaceholder: 'Укажите причину...',

  statusApproved: 'Утверждён',
  statusRejected: 'Отклонён',
  statusPending: 'В ожидании',

  createdAtPrefix: 'Отправлено: {{date}}',
  emptyLeaves: 'Заявок нет',
  emptyPending: 'Ожидающих заявок нет',
  notFound: 'Данные не найдены',

  endMustBeAfterStart: 'Время окончания должно быть позже времени начала',
  createdSuccess: 'Заявка отправлена',
  approvedSuccess: 'Заявка утверждена',
  rejectedSuccess: 'Заявка отклонена',

  approveError: 'Ошибка при утверждении',
  rejectError: 'Ошибка при отклонении',
  deletedSuccess: 'Заявка удалена',
  deleteError: 'Ошибка при удалении',
  signerRejected: 'Отклонил(а)',
  fieldOrigin: 'Источник',
  originHrOrder: 'Из приказа кадров',

  // ── Scope (web v2 RequestPermissionPage) ───────────────────────────────────
  scopeMine: 'Мои и ко мне',
  scopeTeam: 'Моя команда',
  scopeBranch: 'Весь филиал',

  // ── Reopen (Verifix «reset», v2) ───────────────────────────────────────────
  reopen: 'Открыть заново',
  reopenHint: 'Подписи или отказ будут отменены, заявка снова станет «В ожидании». Сотрудник получит уведомление.',
  reopenReason: 'Причина повторного открытия',
  reopenedNote: 'Открыта заново: {{reason}}',
  reopenedSuccess: 'Заявка возвращена на рассмотрение',
  reopenError: 'Не удалось открыть заявку заново',
} as const;
