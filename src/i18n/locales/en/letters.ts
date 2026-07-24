// English translation of the letters namespace. Keep the key set identical to
// uz-Latn/letters.ts (a parity test enforces this).
export default {
  // ── Screen / header titles ──────────────────────────────────────────────────
  listTitle: 'Letters',
  detailTitle: 'Letter',
  createTitle: 'New letter',
  documentTitle: 'Document',

  // ── List screen ─────────────────────────────────────────────────────────────
  tabAction: 'To me',
  tabMine: 'Mine',
  emptyAction: 'No letters awaiting signature',
  empty: 'No letters',
  actionPending: 'Your signature is pending',

  // ── Detail screen ───────────────────────────────────────────────────────────
  openDocument: 'Open document',
  sectionContent: 'Content',
  sectionInfo: 'Information',
  fieldAuthor: 'Author',
  fieldDate: 'Date',
  fieldDeparture: 'Departure',
  fieldReturn: 'Return',
  sectionSigners: 'Signers',
  // Business-trip movements (kelish/ketish) + return confirmation
  sectionMovements: 'Movements (arrival/departure)',
  movementArrived: 'Arrived',
  movementDeparted: 'Departed',
  movementEmpty: 'No movements',
  movementFaceId: 'Face ID',
  movementNote: 'Note (optional)',
  confirmReturn: 'Confirm return',
  confirmReturnDateLabel: 'Date the employee returned to their branch',
  returnConfirmedBadge: 'Return confirmed: {{date}}',
  rejectionReason: 'Rejection reason',

  // ── Action bar ──────────────────────────────────────────────────────────────
  sign: 'Sign',
  reject: 'Reject',

  // ── Document (OnlyOffice) screen ────────────────────────────────────────────
  documentLoading: 'Loading document...',
  documentLoadError: 'Failed to load document',
  documentOpenError: 'Error opening document',

  // ── Create form: field labels ───────────────────────────────────────────────
  fieldType: 'Document type',
  fieldLetterDate: 'Date',
  fieldShortSummary: 'Short summary',
  fieldText: 'Text',
  fieldMainSigner: 'Leadership (signer)',
  fieldCoordinators: 'Coordinators',
  fieldDepartureDate: 'Departure date',
  fieldArrivalDate: 'Arrival date',
  fieldRegions: 'Region(s)',
  fieldDestinations: 'Destination branch(es)',
  fieldTripPurpose: 'Purpose of trip',
  fieldWorkPlan: 'Business trip work plan',
  fieldLeadership: 'Leadership (Minister / Deputy)',
  fieldSubmitter: 'Submitter',
  fieldAttachment: 'Attachment or basis',

  // ── Create form: placeholders ───────────────────────────────────────────────
  placeholderSelect: 'Select...',
  placeholderSelectDate: 'Select a date',
  placeholderDate: 'Date',
  placeholderRegions: 'Select regions...',
  placeholderDestinations: 'Select branches...',
  placeholderTripPurpose: 'Purpose of trip...',
  placeholderWorkPlan: 'Work plan...',
  placeholderLeadership: 'Select leadership...',
  placeholderSubmitter: 'Select submitter...',
  placeholderShortSummary: 'Short summary...',
  placeholderText: 'Document text...',
  placeholderCoordinators: 'Select coordinators...',

  // ── Create form: type option labels ─────────────────────────────────────────
  typeNotification: 'Notification',
  typeApplication: 'Application',
  typeBusinessTrip: 'Business trip',

  // ── Create form: type hints ─────────────────────────────────────────────────
  hintApplication: 'Application: all coordinators and the manager must sign. If anyone rejects — the document is cancelled.',
  hintBusinessTrip: 'Business trip: once the manager approves, the letter appears in the destination branch HR account.',
  hintNotification: 'Notification: only the manager signature is mandatory. Coordinators are optional.',

  // ── Picker modal titles ─────────────────────────────────────────────────────
  pickerType: 'Document type',
  pickerMainSigner: 'Leadership (signer)',
  pickerCoordinators: 'Coordinators',
  pickerLeadership: 'Leadership',
  pickerSubmitter: 'Submitter',
  pickerRegions: 'Regions',
  pickerDestinations: 'Destination branches',

  // ── Selected-count summaries (i18next plurals) ──────────────────────────────
  regionsSelected_one: '{{count}} region',
  regionsSelected_other: '{{count}} regions',
  destinationsSelected_one: '{{count}} branch',
  destinationsSelected_other: '{{count}} branches',
  leadershipSelected_one: '{{count}} selected',
  leadershipSelected_other: '{{count}} selected',
  coordinatorsSelected_one: '{{count}} coordinator',
  coordinatorsSelected_other: '{{count}} coordinators',

  // ── Validation alerts ───────────────────────────────────────────────────────
  validationTitle: 'Error',
  typeRequired: 'A document type must be selected',
  branchNotFound: 'Branch could not be determined',
  mainSignerRequired: 'Leadership (signer) must be selected',
  destinationRequired: 'At least one destination branch must be selected',
  submitterRequired: 'A submitter must be selected',
  leadershipRequired: 'At least one leadership member must be selected',
  attachmentNoticeTitle: 'Notice',
  attachmentFailed: 'Letter saved, but the attachment was not uploaded',

  // ── Sign / reject workflow ──────────────────────────────────────────────────
  actionDoneTitle: 'Done',
  signed: 'Signed',
  rejected: 'Rejected',
  rejectConfirmTitle: 'Reject',
  rejectConfirmMessage: 'Confirm rejection of the letter?',

  // ── Error fallbacks ─────────────────────────────────────────────────────────
  createError: 'An error occurred',
  actionError: 'Error',

  tripSubmit: 'Submit',
  tripSubmitConfirmTitle: 'Submit trip',
  tripSubmitConfirmMessage: 'The business trip will be sent for signing.',

  sectionReport: 'Report',
  reportTitle: 'Submit report',
  reportEditTitle: 'Edit report',
  reportSubmit: 'Submit report',
  reportEdit: 'Edit report',
  reportSend: 'Submit',
  reportReset: 'Delete',
  reportNumber: 'Report number',
  reportDate: 'Date',
  reportSummary: 'Summary',
  reportSummaryPlaceholder: 'Short summary...',
  reportTask: 'Task',
  reportTaskPlaceholder: 'Trip purpose / task...',
  reportContent: 'Report text',
  reportContentPlaceholder: 'Enter the report text...',
  reportContentRequired: 'Report text is empty',
  reportAttachment: 'Attachment (optional)',
  reportReturnedReason: 'Return reason',
  reportFileFailed: 'Report submitted, but the attachment failed to upload',
  reportSubmitError: 'Failed to submit the report',
  reportResetConfirmTitle: 'Delete report',
  reportResetConfirmMessage: 'The report will be deleted and reopened for editing. Continue?',
} as const;
