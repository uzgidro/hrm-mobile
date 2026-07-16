// Status / stage / leave-type / role-label / category strings for the document
// and role flows. Migrated verbatim from the hardcoded Uzbek labels that used
// to live in src/utils/{orderStatus,letterStatus,roles}.ts.
//
// IMPORTANT (web-parity): ONLY the human-readable label text is localized here.
// The enum values / status codes / role tokens / category names those utils map
// FROM (e.g. 'pending_approval', 'business_trip', 'hr', 'vacation') are contract
// identifiers shared with the backend/web dashboard and are NOT translated —
// they stay as literal Record keys in the util files.
export default {
  // ── Order-act (decree) statuses — ORDER_STATUS_META ─────────────────────────
  orderDraft: 'Qoralama',
  orderPendingApproval: 'Kelishish kutilmoqda',
  orderPendingLeadership: 'Rahbariyat imzosi kutilmoqda',
  orderPendingChancellery: 'Kanselyariya kutilmoqda',
  orderApproved: 'Kelishildi',
  orderConfirmed: "Ro'yxatga olingan",
  orderApplied: "Qo'llanildi",
  orderChangesRequested: "O'zgartirish so'raldi",
  orderRejected: 'Rad etildi',
  orderPending: 'Kutilmoqda',
  orderSigned: 'Imzolandi',

  // ── Letter type labels — LETTER_TYPE_LABELS ─────────────────────────────────
  letterTypeNotification: 'Bildirgi',
  letterTypeApplication: 'Ariza',
  letterTypeBusinessTrip: 'Xizmat safari',
  letterTypeDefault: 'Xat',

  // ── Letter statuses — letterStatusMeta ──────────────────────────────────────
  letterRejected: 'Rad etildi',
  letterRegistered: "Ro'yxatga olingan",
  letterSignedStatus: 'Imzolangan',
  letterInChancellery: 'Devonxonada',
  letterInLeadership: 'Rahbariyatda',
  letterPending: 'Kutilmoqda',
  letterTripArrived: 'Hisobot kutilmoqda',
  letterReportSubmitted: 'Hisobot yuborildi',
  letterReportReturned: 'Hisobot qaytarildi',
  letterReportReview: 'Hisobot rahbariyatda',
  letterReportApproved: 'Hisobot tasdiqlandi',

  // ── Signing-timeline status texts — getSigningTimeline ──────────────────────
  timelineApproved: 'Tasdiqladi',
  timelineSigned: 'Imzoladi',
  timelineAgreed: 'Roziman',
  timelineRejected: 'Rad etdi',
  timelinePending: 'Kutilmoqda',

  // ── Timeline role fallbacks ─────────────────────────────────────────────────
  roleLeadership: 'Rahbariyat',
  roleChief: "Boshlig'i",
  roleCoordinator: 'Kelishuvchi',
  roleSigner: 'Imzolovchi',

  // ── Order category translations — ORDER_CATEGORY_TRANSLATIONS ────────────────
  categoryLeave: "Mehnat ta'tili",
  categoryBusinessTrip: 'Xizmat safari',
  categorySickLeave: 'Kasallik varaqasi',
  categoryDefault: 'Buyruq',

  // ── Shared fallbacks ────────────────────────────────────────────────────────
  unknown: "Noma'lum",
  noPosition: 'Lavozim kiritilmagan',
} as const;
