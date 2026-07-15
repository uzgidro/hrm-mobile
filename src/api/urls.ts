// Auth
export const AUTH_LOGIN = 'auth/login';
export const AUTH_REFRESH = 'auth/refresh';
export const USER_INFO = 'auth/me';

// OneID (YaIT) SSO — mobile flow. SSO_LOGIN is opened in the system browser
// (not called via apiClient); SSO_EXCHANGE trades the one-time code for tokens.
export const SSO_LOGIN = 'sso/login';
export const SSO_EXCHANGE = 'sso/exchange';

// Employee
export const EMPLOYEE_DETAIL = (id: number) => `employees/${id}`;
export const EMPLOYEE_ATTENDANCE_CALENDAR = (id: number) => `employees/${id}/attendance-calendar`;

// Turnstile attendance
export const TURNSTILE_ATTENDANCE_EVENTS = 'turnstile-attendance-events';

// Work leaves (ruxsat so'rovlar)
export const WORK_LEAVES = 'work-leaves';
export const WORK_LEAVE_DETAIL = (id: number) => `work-leaves/${id}`;
export const WORK_LEAVE_SIGN = (id: number) => `work-leaves/${id}/sign`;
export const WORK_LEAVE_REJECT = (id: number) => `work-leaves/${id}/reject`;

// News
export const NEWS_POSTS = 'news-posts';

// Dashboard
export const DASHBOARD_MAIN = 'dashboard/main';

// Notifications
export const NOTIFICATIONS_LIST = 'notifications';
export const NOTIFICATION_READ = (id: number) => `notifications/${id}/read`;
export const NOTIFICATIONS_READ_ALL = 'notifications/read-all';

// Employees list
export const EMPLOYEES_LIST = 'employees';
export const EMPLOYEES_BIRTHDAYS = 'employees/birthdays';

// Departments & positions
export const DEPARTMENTS_LIST = 'departments';
export const JOB_POSITIONS_LIST = 'job-positions';

// Push notifications
export const PUSH_TOKENS = 'push-tokens';

// Visitors (Mehmonlar)
export const VISITORS_LIST = 'visitors';
export const VISITOR_DETAIL = (id: number) => `visitors/${id}`;
export const EMPLOYEE_VALIDATE_PHOTO = 'employees/me/validate-photo';

// Projects (Loyihalar) — workspaces, columns, cards
export const WORKSPACES_LIST = 'workspaces';
export const WORKSPACE_DETAIL = (id: number) => `workspaces/${id}`;
export const WORKSPACE_MEMBER = (workspaceId: number, memberId: number) => `workspaces/${workspaceId}/members/${memberId}`;
export const COLUMNS_LIST = 'columns';
export const CARDS_LIST = 'cards';
export const CARD_COMPLETE = (id: number) => `cards/${id}/complete`;
export const CARD_UNCOMPLETE = (id: number) => `cards/${id}/uncomplete`;

// Employee self update
export const EMPLOYEE_SELF_UPDATE = 'employees/me/self-update';

// Order act categories
export const ORDER_ACT_CATEGORIES = 'order-act-categories';
export const ORDER_ACT_DOCUMENTS = (id: number) => `order-acts/${id}/documents`;

// Letters (Xatlar)
export const LETTERS_LIST = 'letters';
export const LETTER_CREATE = 'letters';
export const LETTER_DETAIL = (id: number) => `letters/${id}`;
export const LETTER_SIGN = (id: number) => `letters/${id}/sign`;
export const LETTER_REJECT = (id: number) => `letters/${id}/reject`;
export const LETTER_EDITOR_CONFIG = (id: number) => `letters/${id}/editor-config`;
export const LETTER_UPLOAD_ATTACHMENT = (id: number) => `letters/${id}/upload-attachment`;

// Organization branches
export const ORGANIZATION_BRANCHES = 'organization-branches';
export const ORGANIZATION_BRANCH_LEADERS = (id: number) => `organization-branches/${id}/leaders`;

// Order acts (Buyruqlar / decrees)
export const ORDER_ACTS = 'order-acts';
export const ORDER_ACT_DETAIL = (id: number) => `order-acts/${id}`;
export const ORDER_ACT_DECREE_APPROVE = (id: number) => `order-acts/${id}/decree/approve`;
export const ORDER_ACT_DECREE_REJECT = (id: number) => `order-acts/${id}/decree/reject`;
export const ORDER_ACT_DECREE_RESUBMIT = (id: number) => `order-acts/${id}/decree/resubmit`;
export const ORDER_ACT_DECREE_FORWARD = (id: number) => `order-acts/${id}/decree/forward-to-leadership`;
export const ORDER_ACT_DECREE_REGISTER = (id: number) => `order-acts/${id}/decree/register`;
export const ORDER_ACT_DECREE_ACKNOWLEDGE = (id: number) => `order-acts/${id}/decree/acknowledge`;
export const ORDER_ACT_EDITOR_CONFIG = (id: number) => `order-acts/${id}/editor-config`;

// OnlyOffice document server (public host that serves the editor api.js)
import { Env } from '../config/env';
export const ONLYOFFICE_SERVER_URL = Env.onlyOfficeUrl;
