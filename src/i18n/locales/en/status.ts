// English translation of the status namespace. Keep the key set identical to
// uz-Latn/status.ts (a parity test enforces this).
export default {
  // ── Order-act (decree) statuses ─────────────────────────────────────────────
  orderDraft: 'Draft',
  orderPendingApproval: 'Awaiting approval',
  orderPendingLeadership: 'Awaiting leadership signature',
  orderPendingChancellery: 'Awaiting chancellery',
  orderApproved: 'Approved',
  orderConfirmed: 'Registered',
  orderApplied: 'Applied',
  orderChangesRequested: 'Changes requested',
  orderRejected: 'Rejected',
  orderPending: 'Pending',
  orderSigned: 'Signed',

  // ── Letter type labels ──────────────────────────────────────────────────────
  letterTypeNotification: 'Notification',
  letterTypeApplication: 'Application',
  letterTypeBusinessTrip: 'Business trip',
  letterTypeDefault: 'Letter',

  // ── Letter statuses ─────────────────────────────────────────────────────────
  letterRejected: 'Rejected',
  letterRegistered: 'Registered',
  letterSignedStatus: 'Signed',
  letterInChancellery: 'In chancellery',
  letterInLeadership: 'With leadership',
  letterPending: 'Pending',
  letterTripArrived: 'Report pending',
  letterTripLeadershipPending: 'Awaiting leadership approval',
  letterTripGuvohnomaReview: 'Awaiting guvohnoma approval',
  letterReportSubmitted: 'Report submitted',
  letterReportReturned: 'Report returned',
  letterReportReview: 'Report in leadership',
  letterReportApproved: 'Report approved',

  // ── Signing-timeline status texts ───────────────────────────────────────────
  timelineApproved: 'Approved',
  timelineSigned: 'Signed',
  timelineAgreed: 'Agreed',
  timelineRejected: 'Rejected',
  timelinePending: 'Pending',

  // ── Timeline role fallbacks ─────────────────────────────────────────────────
  roleLeadership: 'Leadership',
  roleChief: 'Head',
  roleCoordinator: 'Coordinator',
  roleSigner: 'Signer',

  // ── Order category translations ─────────────────────────────────────────────
  categoryLeave: 'Annual leave',
  categoryBusinessTrip: 'Business trip',
  categorySickLeave: 'Sick leave',
  categoryDefault: 'Order',

  // ── Shared fallbacks ────────────────────────────────────────────────────────
  unknown: 'Unknown',
  noPosition: 'Position not specified',
} as const;
