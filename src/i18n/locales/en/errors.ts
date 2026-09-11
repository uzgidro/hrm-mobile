// English translation of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {

  // Server `code` -> text. `src/api/errors.ts` looks these up BEFORE falling
  // back to the server's own sentence, which is always Uzbek.
  forbidden: 'Access denied',
  not_authorized: 'You are not allowed to do this',
  extension_not_later: 'The new return date must be later than the current one',
  not_found: 'Not found',
  invalid_addressee: 'The addressee must be management or HR — pick one from the list',
  invalid_management_signer: 'The selected employee is not management of this branch',
  letter_author_required: 'Choose the document author',
  signer_not_found: 'The selected addressee was not found',
  not_home_branch_hr: 'Only the home branch HR confirms the return',
  trip_finalized: 'The trip is finalized and cannot be changed',
  trip_not_registered: 'The trip is not registered yet',
  employee_required: 'This action needs an employee record',
  no_branch: 'No branch is assigned to this account',
  validation_error: 'The submitted data is not valid',
  invalid_date_range: 'Invalid date range',
  search_too_long: 'Search text is too long',
  generic: 'An error occurred',
  saveFailed: 'Failed to save',
  sendFailed: 'Failed to send the request',
  refreshFailed: 'Failed to refresh data',
  actionFailed: 'Failed to perform the action',
} as const;
