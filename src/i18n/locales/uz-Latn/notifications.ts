// Client-side notification titles. The backend push/in-app payload carries only
// a notification_type code + a free-text body; the human-readable TITLE is
// generated on the client from that type code (see src/services/notifications.ts).
// These titles are therefore translatable and follow the current app language.
// The body text, which arrives already-composed from the backend, is not.
//
// Keys here are display labels; the notification_type codes they map from
// (order_act_created, …) are a backend contract and live in the service, not here.
export default {
  // order-act (buyruq) events
  orderActCreated: 'Yangi buyruq',
  orderActSigned: 'Buyruq tasdiqlandi',
  orderActChangesRequested: "Buyruqqa tuzatish so'raldi",
  // business-trip (xizmat safari) events
  businessTripCreated: 'Yangi xizmat safari',
  businessTripSigned: 'Safar imzolandi',
  businessTripStamped: 'Safar tasdiqlandi',
  businessTripRejected: 'Safar rad etildi',
  businessTripReportSubmitted: 'Safar hisoboti',
  businessTripReportStamped: "Hisobot tasdig'i",
  businessTripReportApproved: 'Hisobot tasdiqlandi',
  businessTripExtensionRequested: 'Safar muddati',
  businessTripExtensionApproved: 'Muddat uzaytirildi',
  businessTripExtensionRejected: 'Muddat rad etildi',
  // news (yangilik) events
  newsPostCreated: 'Yangilik',
  // workspace (loyiha) events
  workspaceCreated: 'Yangi loyiha',
  workspaceUpdated: 'Loyiha yangilandi',
  workspaceMemberAdded: "Loyihaga qo'shildingiz",
  // card (vazifa) events
  cardCreated: 'Yangi vazifa',
  cardMemberAdded: 'Vazifa biriktirildi',
  cardCompleted: 'Vazifa bajarildi',
  cardRejected: 'Vazifa rad etildi',
  cardCommentCreated: 'Yangi izoh',
  cardCommentMention: "Sizni eslab o'tishdi",
  cardDeadlineApproaching: 'Muddat yaqinlashmoqda',
  kpiTaskSubmitted: 'Vazifa topshirildi',
  kpiTaskConfirmed: 'Vazifa tasdiqlandi',
  kpiTaskRejected: 'Vazifa rad etildi',
  workLeaveRequested: "Yangi ruxsat so'rovi",
  tripReturnPrompt: 'Safar yakunlandimi?',
  tripSelfFinished: 'Xodim safarni yakunladi',
  medicalCheckupDue: 'Tibbiy ko\'rik muddati',
  medicalCheckupDueHr: 'Tibbiy ko\'rik muddati (xodimlar)',
  medicalResultRecorded: 'Tibbiy ko\'rik natijasi',
  hrOrderSoon: 'Buyruq muddati tugamoqda',
  hrOrderExpired: 'Buyruq muddati tugadi',
  visitorArrived: 'Mehmon keldi',
  zoomDecision: 'Zoom yig\'ilishi',
  navbatchilikAssigned: 'Navbatchilik',
  workLeaveSigned: "So'rov tasdiqlandi",
  workLeaveRejected: "So'rov rad etildi",
  workLeaveFallback: 'Ruxsat',
  kpiFallback: 'KPI',
  // prefix fallbacks for unmapped variants of a known family
  orderFallback: 'Buyruq',
  businessTripFallback: 'Xizmat safari',
  newsFallback: 'Yangilik',
  workspaceFallback: 'Loyiha',
  cardFallback: 'Vazifa',
  // ── 2026-08-20 auditi: backend YUBORADIGAN, lekin mobilда nomsiz
  //    qolib ketgan turlar (xat/kelishuv, texnik yordam, avtopark, digest).
  letterAgreementRequested: 'Kelishuv so\'raldi',
  letterAgreementActed: 'Kelishuv javobi',
  letterRegistered: 'Ro\'yxatga olindi',
  letterSentToRegistry: 'Devonxonaga yuborildi',
  letterReturned: 'Hujjat qaytarildi',
  letterDeleted: 'Hujjat o\'chirildi',
  letterFallback: 'Bildirgi va arizalar',
  orderActConfirmed: 'Buyruq kuchga kirdi',
  orderActTextEdited: 'Buyruq matni o\'zgardi',
  orderActReapproval: 'Buyruq qayta kelishuvda',
  orderActReturned: 'Buyruq qaytarildi',
  orderActDeleted: 'Buyruq o\'chirildi',
  businessTripApproved: 'Safar tasdiqlandi',
  businessTripRegistered: 'Safar ro\'yxatga olindi',
  businessTripArrivalDue: 'Safardan qaytish kuni',
  businessTripArrived: 'Safardan qaytdi',
  businessTripCancelled: 'Safar bekor qilindi',
  businessTripPendingRahbar: 'Rahbar tasdig\'i kutilmoqda',
  businessTripGuvohnomaPending: 'Guvohnoma tasdig\'i',
  supportTicketCreated: 'Yangi murojaat',
  supportTicketTaken: 'Murojaat olindi',
  supportTicketDone: 'Murojaat bajarildi',
  supportTicketInvited: 'Murojaatga taklif',
  supportTicketRated: 'Murojaat baholandi',
  supportTicketMessage: 'Murojaatda yangi xabar',
  supportFallback: 'Texnik yordam',
  vehicleRequested: 'Transport so\'raldi',
  vehicleRequestAnswered: 'Transport so\'roviga javob',
  driverTripCreated: 'Yangi reys',
  fleetFallback: 'Avtopark',
  workspaceDeleted: 'Loyiha o\'chirildi',
  zoomOrganizerChanged: 'Zoom tashkilotchisi o\'zgardi',
  medicalFallback: 'Tibbiy ko\'rik',
  pendingActionDigest: 'Sizni kutayotgan hujjatlar',
  // Android bildirishnoma kanali nomi (tizim sozlamalarida ko'rinadi)
  channelName: 'Bildirishnomalar',
  // last-resort title for a completely unknown type
  generic: 'Bildirishnoma',

  // ── Notifications SCREEN (NotificationsScreen) chrome ────────────────────────
  // Added in the i18n feature wave. The title keys above are consumed by the
  // notification service; these keys are the on-screen list UI. Kept in the same
  // namespace on purpose (the screen renders these titles).
  screenTitle: 'Bildirishnomalar',
  markAllRead: "O'qildi",
  empty: "Bildirishnomalar yo'q",
} as const;
