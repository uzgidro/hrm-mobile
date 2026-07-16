// Orders (Buyruqlar) feature — English translation.
// See uz-Latn/orders.ts for the meaning of each key.
export default {
  // ── List screen ─────────────────────────────────────────────────────────────
  title: 'Orders',
  tabAction: 'For me',
  tabMine: 'Mine',
  emptyAction: 'No orders awaiting your action',
  emptyAll: 'No orders',
  actionExpected: 'Your action is required',

  // ── Create screen ───────────────────────────────────────────────────────────
  createTitle: 'New order',
  hrSubtitle: 'HR order',
  employeeSubtitle: 'Employee order',
  categoryLabel: 'Order types',
  selectPlaceholder: 'Select...',
  summaryLabel: 'Summary',
  summaryPlaceholder: 'Short summary of the order...',
  descriptionLabel: 'Order text',
  descriptionPlaceholder: 'Full text of the order...',
  leadershipLabel: 'Leadership',
  leadershipPlaceholder: 'Select a leader...',
  submitterLabel: 'Submitting person',
  familiarizersLabel: 'People to acknowledge the order',
  familiarizersPlaceholder: 'Select departments...',
  deptsSelected_one: '{{count}} department selected',
  deptsSelected_other: '{{count}} departments selected',

  // ── Approvers editor ────────────────────────────────────────────────────────
  approversLabel: 'Approvers',
  approversEmpty: 'No approvers added',
  approverPlaceholder: 'Full name or position',
  canEditDocLabel: 'Right to edit the order',

  // ── Pickers ─────────────────────────────────────────────────────────────────
  pickCategory: 'Order types',
  pickLeadership: 'Leadership',
  pickSubmitter: 'Submitting person',
  pickFamiliarizerDepts: 'Acknowledging departments',
  pickApprover: 'Approver',

  // ── Create validation / result alerts ───────────────────────────────────────
  validationTitle: 'Error',
  categoryRequired: 'Order type must be selected',
  descriptionRequired: 'Order text must be entered',
  approverRequired: 'At least one approver is required',
  leadershipRequired: 'One of the leadership must be selected',
  branchNotFound: 'Branch could not be determined',
  filesPartialTitle: 'Note',
  filesPartialMessage: 'The order was saved, but some files were not uploaded',

  // ── Detail screen ───────────────────────────────────────────────────────────
  detailTitle: 'Order',
  fallbackTitle: 'Order',
  dateLabel: 'Date',
  openDocument: 'Open document',
  sectionDescription: 'Content',
  sectionSummary: 'Summary',
  sectionPlans: 'Plans',
  sectionInfo: 'Information',
  kvEmployee: 'Employee',
  kvSubmitter: 'Sender',
  kvCreatedBy: 'Created by',
  kvArrival: 'Arrival',
  kvDeparture: 'Return',
  changeReasonTitle: 'Reason for change',

  // ── Detail sections ─────────────────────────────────────────────────────────
  sectionSigners: 'Signers',
  sectionFamiliarizers: 'Acknowledgers',
  sectionHistory: 'History',
  signerFallback: 'Employee',
  signerLeadership: 'Leadership',
  signerApprover: 'Approver',
  signed: 'Signed',
  waiting: 'Waiting',
  acknowledged: 'Acknowledged',

  // ── Action bar ──────────────────────────────────────────────────────────────
  actionRequestChange: 'Request change',
  actionApprove: 'Approve',
  actionResubmit: 'Resubmit',
  actionForward: 'Forward to leadership',
  actionRegister: 'Register',
  actionAcknowledge: 'Acknowledge',

  // ── Reject / register modals ────────────────────────────────────────────────
  rejectTitle: 'Request a change',
  rejectPlaceholder: 'Write the reason...',
  registerTitle: 'Registration',
  registerHint: 'Enter the order number (optional)',
  registerPlaceholder: 'Order number',

  // ── Decree action results ───────────────────────────────────────────────────
  actionDoneTitle: 'Done',
  reasonRequired: 'Enter a reason',
  approveSuccess: 'Order approved',
  rejectSuccess: 'Change requested',
  resubmitSuccess: 'Resubmitted',
  forwardSuccess: 'Forwarded to leadership',
  acknowledgeSuccess: 'Acknowledged',
  registerSuccess: 'Registered',
  actionError: 'Error performing the action',

  // ── Document screen ─────────────────────────────────────────────────────────
  documentTitle: 'Document',
  documentLoading: 'Loading document...',
  documentLoadError: 'Failed to load the document',
  documentOpenError: 'Error opening the document',
} as const;
