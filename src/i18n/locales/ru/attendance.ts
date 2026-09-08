export default {
  title: 'Посещаемость',
  teamTitle: 'Сотрудники',
  onlySubordinates: 'Только подчинённые',
  onlySubordinatesTeam: 'Показаны только подчинённые',

  section: {
    present: 'Пришли',
    late: 'Опоздали',
    onLeave: 'Отправлен запрос',
    absent: 'Отсутствуют',
  },
  sectionEmpty: {
    present: 'Нет пришедших сотрудников',
  },

  legend: {
    present: 'пришли',
    late: 'опоздали',
    absent: 'отсутствуют',
    onLeave: 'запрос',
    onLeaveTeam: 'в запросе',
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
} as const;
