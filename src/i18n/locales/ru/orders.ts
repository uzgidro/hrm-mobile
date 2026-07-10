// Orders (Buyruqlar) feature — Russian translation.
// See uz-Latn/orders.ts for the meaning of each key.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  title: 'Приказы',
  tabAction: 'Мне',
  tabMine: 'Мои',
  emptyAction: 'Нет приказов, требующих вашего действия',
  emptyAll: 'Приказов нет',
  actionExpected: 'Требуется ваше действие',

  // ── Create screen ───────────────────────────────────────────────────────────
  createTitle: 'Новый приказ',
  hrSubtitle: 'Кадровый приказ',
  employeeSubtitle: 'Приказ сотрудника',
  categoryLabel: 'Типы приказов',
  selectPlaceholder: 'Выберите...',
  summaryLabel: 'Краткое содержание',
  summaryPlaceholder: 'Краткое содержание приказа...',
  descriptionLabel: 'Текст приказа',
  descriptionPlaceholder: 'Полный текст приказа...',
  leadershipLabel: 'Руководство',
  leadershipPlaceholder: 'Выберите руководителя...',
  submitterLabel: 'Вносящее лицо',
  familiarizersLabel: 'Ознакомляемые с приказом',
  familiarizersPlaceholder: 'Выберите отделы...',
  deptsSelected_one: 'Выбран {{count}} отдел',
  deptsSelected_few: 'Выбрано {{count}} отдела',
  deptsSelected_many: 'Выбрано {{count}} отделов',

  // ── Approvers editor ────────────────────────────────────────────────────────
  approversLabel: 'Согласующие',
  approversEmpty: 'Согласующие не добавлены',
  approverPlaceholder: 'ФИО или должность',
  canEditDocLabel: 'Право редактирования приказа',

  // ── Pickers ─────────────────────────────────────────────────────────────────
  pickCategory: 'Типы приказов',
  pickLeadership: 'Руководство',
  pickSubmitter: 'Вносящее лицо',
  pickFamiliarizerDepts: 'Ознакомляемые отделы',
  pickApprover: 'Согласующий',

  // ── Create validation / result alerts ───────────────────────────────────────
  validationTitle: 'Ошибка',
  categoryRequired: 'Необходимо выбрать тип приказа',
  descriptionRequired: 'Необходимо ввести текст приказа',
  leadershipRequired: 'Необходимо выбрать одного из руководства',
  branchNotFound: 'Филиал не определён',
  filesPartialTitle: 'Примечание',
  filesPartialMessage: 'Приказ сохранён, но некоторые файлы не загружены',

  // ── Detail screen ───────────────────────────────────────────────────────────
  detailTitle: 'Приказ',
  fallbackTitle: 'Приказ',
  dateLabel: 'Дата',
  openDocument: 'Открыть документ',
  sectionDescription: 'Содержание',
  sectionSummary: 'Кратко',
  sectionPlans: 'Планы',
  sectionInfo: 'Информация',
  kvEmployee: 'Сотрудник',
  kvSubmitter: 'Отправитель',
  kvCreatedBy: 'Создал',
  kvArrival: 'Прибытие',
  kvDeparture: 'Возвращение',
  changeReasonTitle: 'Причина изменения',

  // ── Detail sections ─────────────────────────────────────────────────────────
  sectionSigners: 'Подписанты',
  sectionFamiliarizers: 'Ознакомляемые',
  sectionHistory: 'История',
  signerFallback: 'Сотрудник',
  signerLeadership: 'Руководство',
  signerApprover: 'Согласующий',
  signed: 'Подписано',
  waiting: 'Ожидается',
  acknowledged: 'Ознакомлен',

  // ── Action bar ──────────────────────────────────────────────────────────────
  actionRequestChange: 'Изменить',
  actionApprove: 'Подтвердить',
  actionResubmit: 'Отправить повторно',
  actionForward: 'Отправить руководству',
  actionRegister: 'Зарегистрировать',
  actionAcknowledge: 'Ознакомился',

  // ── Reject / register modals ────────────────────────────────────────────────
  rejectTitle: 'Запросить изменение',
  rejectPlaceholder: 'Укажите причину...',
  registerTitle: 'Регистрация',
  registerHint: 'Введите номер приказа (необязательно)',
  registerPlaceholder: 'Номер приказа',

  // ── Decree action results ───────────────────────────────────────────────────
  actionDoneTitle: 'Выполнено',
  reasonRequired: 'Укажите причину',
  approveSuccess: 'Приказ подтверждён',
  rejectSuccess: 'Изменение запрошено',
  resubmitSuccess: 'Отправлено повторно',
  forwardSuccess: 'Отправлено руководству',
  acknowledgeSuccess: 'Ознакомление выполнено',
  registerSuccess: 'Зарегистрировано',
  actionError: 'Ошибка при выполнении действия',

  // ── Document screen ─────────────────────────────────────────────────────────
  documentTitle: 'Документ',
  documentLoading: 'Документ загружается...',
  documentLoadError: 'Не удалось загрузить документ',
  documentOpenError: 'Ошибка при открытии документа',
} as const;
