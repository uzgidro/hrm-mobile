// English translation of the leaves feature strings.
// See uz-Latn/leaves.ts for the meaning of each key.
export default {
  createTitle: 'Send request',
  detailTitle: 'Request details',
  teamTitle: 'Team requests',
  incomingTitle: 'Incoming requests',
  myTitle: 'Requests',

  typeLabel: 'Request type *',
  startLabel: 'Start *',
  endLabel: 'End *',
  supervisorLabel: 'Supervisor (approver)',
  commentLabel: 'Comment (optional)',
  commentPlaceholder: 'Briefly describe the reason...',
  noSupervisor: 'No supervisor assigned',
  supervisorHint: 'The request is sent directly to the HR department',
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

  errorTitle: 'Error',
  endMustBeAfterStart: 'End time must be after the start time',
  createdSuccess: 'Request sent',
  approvedSuccess: 'Request approved',
  rejectedSuccess: 'Request rejected',

  approveError: 'Failed to approve',
  rejectError: 'Failed to reject',
} as const;
