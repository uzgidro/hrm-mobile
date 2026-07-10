// Dashboard (HomeScreen) strings. uz-Latn is the source of truth; the other
// three locales must expose the exact same key set (parity test).
//
// The header date line is built from the shared i18n/dates helpers
// (weekdayName/monthName), so weekday/month names are NOT declared here.
// `status.*` labels are keyed by the API status CODE elsewhere in the screen
// (approved/rejected/pending) — web parity: codes stay codes, only labels
// localize. Reuses common.all for the "Barchasi" link.
export default {
  userFallback: 'Foydalanuvchi',

  // Today's schedule card
  scheduleTitle: 'Bugungi jadval',
  checkIn: 'Kelish',
  checkOut: 'Ketish',

  // Requests card
  incomingRequests: "Kiruvchi so'rovlar",
  requests: "So'rovlar",
  noIncomingRequests: "Kiruvchi so'rovlar yo'q",
  noRequests: "So'rovlar yo'q",
  employeeFallback: 'Xodim',
  leaveRequestFallback: "Ruxsat so'rovi",
  actionNeeded: 'Tasdiqlash kerak',
  createRequest: "So'rov yaratish",

  // Leave-request status labels (keyed by API code — codes are NOT translated)
  status: {
    pending: 'Kutilmoqda',
    approved: 'Tasdiqlangan',
    rejected: 'Rad etildi',
  },
} as const;
