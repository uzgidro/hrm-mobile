export default {
  title: 'Давомат',
  teamTitle: 'Ходимлар',
  onlySubordinates: 'Фақат бўйсунувчилар',
  onlySubordinatesTeam: 'Фақат бўйсунувчилар кўрсатилмоқда',

  section: {
    present: 'Келди',
    late: 'Кечиккан',
    onLeave: 'Сўров юборилган',
    absent: 'Келмаган',
  },
  sectionEmpty: {
    present: 'Келган ходим йўқ',
    late: 'Кечиккан ходим йўқ',
    onLeave: 'Рухсат сўровчи йўқ',
  },

  legend: {
    present: 'келди',
    late: 'кечиккан',
    absent: 'келмаган',
    onLeave: 'сўров',
    onLeaveTeam: 'сўровда',
  },
  clearFilter: 'тозалаш учун босинг',
  showAll: 'Барчасини кўрсатиш',
  collapse: 'Йиғиш',

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
} as const;
