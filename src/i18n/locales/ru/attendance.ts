export default {
  title: 'Посещаемость',
  teamTitle: 'Сотрудники',
  onlySubordinates: 'Только подчинённые',
  onlySubordinatesTeam: 'Показаны только подчинённые',

  section: {
    present: 'Пришли',
    late: 'Опоздали',
    onLeave: 'Другая причина',
    absent: 'Отсутствуют',
  },
  sectionEmpty: {
    present: 'Нет пришедших сотрудников',
  },

  legend: {
    present: 'пришли',
    late: 'опоздали',
    absent: 'отсутствуют',
    onLeave: 'другая причина',
    onLeaveTeam: 'другая причина',
  },
  clearFilter: 'нажмите, чтобы сбросить',
  showAll: 'Показать все',
  allEmployees: 'Все сотрудники',

  leaveFallback: 'Отсутствие',
  requestFallback: 'Запрос',

  details: 'Подробнее',
  requestsTitle: 'Запросы',
  noRequests: 'Запросов нет',
  createRequest: 'Создать запрос',
  noEmployees: 'Сотрудников нет',
  birthdaysTitle: 'Дни рождения',
  birthdayToday: 'Сегодня!',

  status: {
    pending: 'Ожидает',
    approved: 'Подтверждён',
    rejected: 'Отклонён',
  },

  // Kun tanlash va dam olishdagilar (v2 MyTeamPage / DashboardPage — hisobga kirmaydi)
  today: 'Сегодня',
  prevDay: 'Предыдущий день',
  nextDay: 'Следующий день',
  dayOffTitle: 'Выходной',
  dayOffCount_one: '{{count}} человек в выходном',
  dayOffCount_few: '{{count}} человека в выходном',
  dayOffCount_many: '{{count}} человек в выходном',
} as const;
