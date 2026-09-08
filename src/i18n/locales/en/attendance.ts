export default {
  title: 'Attendance',
  teamTitle: 'Employees',
  onlySubordinates: 'Subordinates only',
  onlySubordinatesTeam: 'Showing subordinates only',

  section: {
    present: 'Present',
    late: 'Late',
    onLeave: 'Request sent',
    absent: 'Absent',
  },
  sectionEmpty: {
    present: 'No present employees',
  },

  legend: {
    present: 'present',
    late: 'late',
    absent: 'absent',
    onLeave: 'request',
    onLeaveTeam: 'on request',
  },
  clearFilter: 'tap to clear',
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
} as const;
