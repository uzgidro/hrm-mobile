// Barrel of all uz-Latn namespaces. Feature waves add a namespace file next to
// common.ts and register it here (and in the other three locale barrels).
import common from './common';
import status from './status';
import notifications from './notifications';
import errors from './errors';
import attendance from './attendance';
import leaves from './leaves';
import orders from './orders';
import letters from './letters';

export default {
  common,
  status,
  notifications,
  errors,
  attendance,
  leaves,
  orders,
  letters,
} as const;
