import common from './common';
import status from './status';
import notifications from './notifications';
import errors from './errors';
import attendance from './attendance';
import leaves from './leaves';
import orders from './orders';
import letters from './letters';
import birthdays from './birthdays';
import news from './news';
import dashboard from './dashboard';
import visitors from './visitors';
import documents from './documents';
import kpi from './kpi';
import timesheet from './timesheet';
import assistant from './assistant';
import projects from './projects';
import profile from './profile';
import employees from './employees';
import security from './security';
import auth from './auth';
import modules from './modules';
import components from './components';
import update from './update';
import ota from './ota';
import support from './support';
import terminals from './terminals';
import chairman from './chairman';
import directory from './directory';
import qrLogin from './qrLogin';

export default {
  qrLogin,
  common,
  status,
  notifications,
  errors,
  attendance,
  leaves,
  orders,
  letters,
  birthdays,
  news,
  dashboard,
  visitors,
  documents,
  kpi,
  timesheet,
  assistant,
  projects,
  profile,
  employees,
  security,
  auth,
  modules,
  components,
  update,
  ota,
  support,
  terminals,
  chairman,
  directory,
} as const;
