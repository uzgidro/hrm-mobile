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
