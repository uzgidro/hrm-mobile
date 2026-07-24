// Russian translation of the KPI feature strings.
// See uz-Latn/kpi.ts for the meaning of each key.
export default {
  title: 'KPI',
  entryTitle: 'Показатель KPI',
  loadError: 'Ошибка при загрузке данных KPI',

  department: 'Отдел',
  period: 'Период',
  supervisor: 'Руководитель',
  schedule: 'График работы',
  periodPicker: 'Период оценки',

  bandBad: 'ПЛОХО',
  bandUnsatisfactory: 'НЕУДОВЛ.',
  bandSatisfactory: 'УДОВЛ.',
  bandGood: 'ХОРОШО',
  bandExcellent: 'ОТЛИЧНО',

  entriesTitle: 'Показатели KPI',
  emptyPeriod: 'В этом периоде нет показателей KPI',
  penalty: 'ШТРАФ',
  plan: 'План',
  fact: 'Факт',
  result: 'Результат',
  statusFinal: 'Итоговый',
  statusInProgress: 'В процессе',
  statusDraft: 'Черновик',
  planSum: 'Сумма плана',
  factSum: 'Факты',
  penaltySum: 'Штраф (вычитается)',
  totalNet: 'Итого',

  indicator: 'Тип показателя',
  owner: 'Владелец',
  computedFact: 'Рассчитанный факт',
  lockedNote: 'Период завершён — изменения невозможны',
  noTasksIndicator: 'По этому показателю задачи не вводятся',

  tasksTitle: 'Задачи',
  emptyTasks: 'Задач нет',
  addTaskPlaceholder: 'Опишите выполненную работу...',
  scorePlaceholder: 'Оценка',
  scoreLabel: 'Оценка (%)',
  setScore: 'Оценить',
  statusNone: 'Статус не выбран',
  pickStatusTitle: 'Выберите статус',

  deleteConfirmTitle: 'Удалить задачу',
  deleteConfirmMessage: 'Удалить эту задачу?',
  deleteAction: 'Удалить',

  teamTitle: 'Эффективность моих сотрудников',
  teamEntries: 'Показатели',
  teamPending: 'Ждут подтверждения',
  teamAllDone: 'Завершено',
  teamEmpty: 'За вами не закреплены сотрудники',
  bonusesTitle: 'Бонусы',
} as const;
