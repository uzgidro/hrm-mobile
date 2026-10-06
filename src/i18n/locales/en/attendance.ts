export default {
  title: 'Attendance',
  teamTitle: 'Employees',
  onlySubordinates: 'Subordinates only',
  onlySubordinatesTeam: 'Showing subordinates only',

  section: {
    present: 'Present',
    late: 'Late',
    onLeave: 'Other reason',
    absent: 'Absent',
  },
  sectionEmpty: {
    present: 'No present employees',
  },

  legend: {
    present: 'present',
    late: 'late',
    absent: 'absent',
    onLeave: 'other reason',
    onLeaveTeam: 'other reason',
  },
  clearFilter: 'tap to clear',
  searchPlaceholder: "Employee, position or department…",
  scopeBranch: "Whole branch",
  scopeDepartment: "My department",
  tabMine: "My timesheet",
  tabTeam: "Team",
  showAll: 'Show all',
  allEmployees: 'All employees',

  leaveFallback: 'Leave',
  requestFallback: 'Request',

  details: 'Details',
  requestsTitle: 'Requests',
  noRequests: 'No requests',
  createRequest: 'Create request',
  noEmployees: 'No employees',
  birthdaysTitle: 'Birthdays',
  birthdayToday: 'Today!',

  status: {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },

  // Kun tanlash va dam olishdagilar (v2 MyTeamPage / DashboardPage — hisobga kirmaydi)
  today: 'Today',
  prevDay: 'Previous day',
  nextDay: 'Next day',
  dayOffTitle: 'Day off',
  dayOffCount_one: '{{count}} person off today',
  dayOffCount_other: '{{count}} people off today',
} as const;
