// Attendance feature: the team dashboard (TeamScreen) and the day-detail
// breakdown (AttendanceDetailScreen). Reuses common.* for shared labels
// (common.all → "Barchasi") instead of re-declaring them here.
//
// `status.*` keys are keyed by the API status CODE (pending, approved, …) — the
// codes stay as keys (web parity: never translate enum values), only the labels
// are localized. Several codes map to the same label (pending/yuborildi, etc.).
export default {
  title: 'Davomat',
  teamTitle: 'Xodimlar',
  onlySubordinates: "Faqat bo'ysunuvchilar",
  onlySubordinatesTeam: "Faqat bo'ysunuvchilar ko'rsatilmoqda",

  // Detail screen — status sections
  section: {
    present: 'Keldi',
    late: 'Kechikkan',
    onLeave: "So'rov yuborilgan",
    absent: 'Kelmagan',
  },
  sectionEmpty: {
    present: "Kelgan xodim yo'q",
    late: "Kechikkan xodim yo'q",
    onLeave: "Ruxsat so'rovchi yo'q",
  },

  // Donut legend labels (lowercase, shown under counts)
  legend: {
    present: 'keldi',
    late: 'kechikkan',
    absent: 'kelmagan',
    onLeave: "so'rov",
    onLeaveTeam: "so'rovda",
  },
  clearFilter: 'tozalash uchun bosing',
  showAll: "Barchasini ko'rsatish",
  collapse: "Yig'ish",

  // Leave-type fallbacks (when the record has no explicit type)
  leaveFallback: 'Ruxsat',
  requestFallback: "So'rov",

  // Team dashboard cards
  details: 'Tafsilotlar',
  requestsTitle: "So'rovlar",
  noRequests: "So'rovlar yo'q",
  createRequest: "So'rov yaratish",
  noEmployees: "Xodimlar yo'q",
  birthdaysTitle: "Tug'ilgan kunlar",
  birthdayToday: 'Bugun!',

  // Work-leave request statuses (keyed by API code — codes are NOT translated)
  status: {
    pending: 'Kutilmoqda',
    approved: 'Tasdiqlangan',
    rejected: 'Rad etildi',
  },
} as const;
