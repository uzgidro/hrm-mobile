// Barrel of all uz-Latn namespaces. Feature waves add a namespace file next to
// common.ts and register it here (and in the other three locale barrels).
import common from './common';
import status from './status';
import notifications from './notifications';
import errors from './errors';

export default {
  common,
  status,
  notifications,
  errors,
} as const;
