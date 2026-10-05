export default {
  title: 'Давомат',
  teamTitle: 'Ходимлар',
  onlySubordinates: 'Фақат бўйсунувчилар',
  onlySubordinatesTeam: 'Фақат бўйсунувчилар кўрсатилмоқда',

  section: {
    present: 'Келди',
    late: 'Кечиккан',
    onLeave: 'Бошқа сабаб',
    absent: 'Келмаган',
  },
  sectionEmpty: {
    present: 'Келган ходим йўқ',
  },

  legend: {
    present: 'келди',
    late: 'кечиккан',
    absent: 'келмаган',
    onLeave: 'бошқа сабаб',
    onLeaveTeam: 'бошқа сабаб',
  },
  clearFilter: 'тозалаш учун босинг',
  showAll: 'Барчасини кўрсатиш',
  allEmployees: 'Барча ходимлар',

  leaveFallback: 'Рухсат',
  requestFallback: 'Сўров',

  details: 'Тафсилотлар',
  requestsTitle: 'Сўровлар',
  noRequests: 'Сўровлар йўқ',
  createRequest: 'Сўров яратиш',
  noEmployees: 'Ходимлар йўқ',
  birthdaysTitle: 'Туғилган кунлар',
  birthdayToday: 'Бугун!',

  status: {
    pending: 'Кутилмоқда',
    approved: 'Тасдиқланган',
    rejected: 'Рад этилди',
  },

  // Kun tanlash va dam olishdagilar (v2 MyTeamPage / DashboardPage — hisobga kirmaydi)
  today: 'Бугун',
  prevDay: 'Олдинги кун',
  nextDay: 'Кейинги кун',
  dayOffTitle: 'Дам олишда',
  dayOffCount_one: '{{count}} киши дам олишда',
  dayOffCount_other: '{{count}} киши дам олишда',
} as const;
