// English translation of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Send request',
  detailTitle: 'Request details',
  teamTitle: 'Team requests',
  incomingTitle: 'Incoming requests',
  myTitle: 'Requests',
  searchPlaceholder: 'Name, type or note...',
  filterAll: 'All',

  typeLabel: 'Request type *',
  startLabel: 'Start *',
  endLabel: 'End *',
  commentLabel: 'Comment *',
  commentPlaceholder: 'Briefly describe the reason...',
  routeLabel: 'Goes to',
  routeToSupervisor: 'The request goes to your direct supervisor: {{name}}',
  routeToHead: 'The request goes to your department head: {{name}}',
  routeToNobody: 'No supervisor or department head is assigned — HR will review the request',
  backHint_one: 'A request can be dated at most {{count}} day back.',
  backHint_other: 'A request can be dated at most {{count}} days back.',
  tooFarBack_one: 'A request can be dated at most {{count}} day back — change the start date.',
  tooFarBack_other: 'A request can be dated at most {{count}} days back — change the start date.',
  descRequired: 'A comment is required',
  endBeforeStart: 'End time must be after the start',

  startPickerTitle: 'Start time',
  endPickerTitle: 'End time',

  durationDays_one: '{{count}} day',
  durationDays_other: '{{count}} days',
  durationHours_one: '{{count}} hour',
  durationHours_other: '{{count}} hours',
  durationMinutes_one: '{{count}} minute',
  durationMinutes_other: '{{count}} minutes',

  typeSheetTitle: 'Select request type',
  typeCustomPlaceholder: 'Or type your own...',

  // Preset leave-type labels. Keys are the untranslated LEAVE_TYPES values.
  presetType: {
    "Xizmat topshirig'i": 'Business assignment',
    Kasallik: 'Sick leave',
    "Ta'til": 'Vacation',
    'Shaxsiy sabab': 'Personal reason',
    Boshqa: 'Other',
  },

  fieldType: 'Request type',
  fieldStart: 'Start',
  fieldEnd: 'End',
  fieldComment: 'Comment',
  fieldCreated: 'Submitted',
  typeFallback: 'Request',

  signersTitle: 'Approvers',
  signerSigned: 'Approved',

  approve: 'Approve',
  reject: 'Reject',
  delete: 'Delete',
  deleteConfirmTitle: 'Delete request',
  deleteConfirmMessage: 'Delete this request? This action cannot be undone.',
  actionNeeded: 'Approval needed',
  rejectReasonTitle: 'Rejection reason',
  rejectReasonPlaceholder: 'Enter a reason...',

  statusApproved: 'Approved',
  statusRejected: 'Rejected',
  statusPending: 'Pending',

  createdAtPrefix: 'Submitted: {{date}}',
  emptyLeaves: 'No requests',
  emptyPending: 'No pending requests',
  notFound: 'Not found',

  endMustBeAfterStart: 'End time must be after the start time',
  createdSuccess: 'Request sent',
  approvedSuccess: 'Request approved',
  rejectedSuccess: 'Request rejected',

  approveError: 'Failed to approve',
  rejectError: 'Failed to reject',
  deletedSuccess: 'Request deleted',
  deleteError: 'Failed to delete',
  signerRejected: 'Rejected',
  fieldOrigin: 'Origin',
  originHrOrder: 'From an HR order',

  // ── Scope (web v2 RequestPermissionPage) ───────────────────────────────────
  scopeMine: 'Mine & for me',
  scopeTeam: 'My team',
  scopeBranch: 'Whole branch',

  // ── Reopen (Verifix «reset», v2) ───────────────────────────────────────────
  reopen: 'Reopen',
  reopenHint: 'Signatures or the rejection are cleared and the request goes back to «Pending». The employee is notified.',
  reopenReason: 'Reason for reopening',
  reopenedNote: 'Reopened: {{reason}}',
  reopenedSuccess: 'The request was sent back for review',
  reopenError: 'Could not reopen the request',
} as const;
