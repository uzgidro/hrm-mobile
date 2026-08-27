// English translation of the common API-error fallbacks.
// See uz-Latn/errors.ts for the meaning of each key.
export default {
  generic: 'An error occurred',
  saveFailed: 'Failed to save',
  sendFailed: 'Failed to send the request',
  refreshFailed: 'Failed to refresh data',
  actionFailed: 'Failed to perform the action',
  timeout: 'The server did not respond (timed out). The action may still have gone through — refresh the list.',
  network: 'No internet connection. Check your network.',
} as const;
