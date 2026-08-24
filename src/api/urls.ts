// Auth
// OnlyOffice document server (public host that serves the editor api.js)
import { Env } from '../config/env';

export const AUTH_LOGIN = 'auth/login';
export const AUTH_REFRESH = 'auth/refresh';
export const USER_INFO = 'auth/me';

// OneID (YaIT) SSO — mobile flow. SSO_LOGIN is opened in the system browser
// (not called via apiClient); SSO_EXCHANGE trades the one-time code for tokens.
export const SSO_LOGIN = 'sso/login';
export const SSO_EXCHANGE = 'sso/exchange';

// Employee
export const EMPLOYEE_DETAIL = (id: number) => `employees/${id}`;

// Turnstile attendance
export const TURNSTILE_ATTENDANCE_EVENTS = 'turnstile-attendance-events';

// Time-tracking (Учёт времени) — read-only mobile surfaces.
// The "monthly tabel grid": one row per employee with an attendance.calendar
// {date -> status code} map. We request our own employee_id for "my tabel".
export const TURNSTILE_ATTENDANCE_NORMALIZED = 'turnstile-attendance-events/normalized';
// Navbatchilik (duty roster), read-only on mobile. /my is truly self-scoped;
// {pk}/members is the effective (dept-expanded) roster; work-schedule-days are
// the actual day/shift rows — branch-scoped server-side since backend `f9c79f0`
// but NOT self-scoped, so always pass our employee_id for a personal view.
export const NAVBATCHILIK_GROUPS_MY = 'navbatchilik-groups/my';
export const NAVBATCHILIK_GROUP_MEMBERS = (id: number) => `navbatchilik-groups/${id}/members`;
export const WORK_SCHEDULE_DAYS = 'work-schedule-days';
export const WORK_SCHEDULE_DAY_DETAIL = (id: number) => `work-schedule-days/${id}`;
// All group members' duty days in one request (backend feat/work-schedule-by-group).
export const WORK_SCHEDULE_DAYS_BY_GROUP = (groupId: number) => `work-schedule-days/group/${groupId}`;
// Holidays (Bayramlar) + duty-days (who works through the off-days) — two
// SEPARATE backend resources; both read-only on mobile (CRUD stays on web).
export const HOLIDAYS_LIST = 'holidays';
export const DUTY_DAYS_LIST = 'duty-days';

// LLM assistant. Owner-scoped sessions + streaming chat (SSE data: chunks).
// NOTE: no role gate server-side — visibility is a CLIENT rule (roles.ts
// 'assistant': stricter than web, see the plan note).
export const LLM_SESSIONS = 'llm/sessions';
export const LLM_SESSION_DETAIL = (id: number) => `llm/sessions/${id}`;
export const LLM_SESSION_MESSAGES = (id: number) => `llm/sessions/${id}/messages`;
export const LLM_SESSION_CHAT = (id: number) => `llm/sessions/${id}/chat`;
export const LLM_SESSION_CHAT_STREAM = (id: number) => `llm/sessions/${id}/chat/stream`;
export const LLM_LARGE_LIST = (listId: string) => `llm/large-lists/${listId}`;

// Work leaves (ruxsat so'rovlar)
export const WORK_LEAVES = 'work-leaves';
export const WORK_LEAVE_DETAIL = (id: number) => `work-leaves/${id}`;
export const WORK_LEAVE_SIGN = (id: number) => `work-leaves/${id}/sign`;
export const WORK_LEAVE_REJECT = (id: number) => `work-leaves/${id}/reject`;

// News
export const NEWS_POSTS = 'news-posts';
export const NEWS_POST_DETAIL = (id: number) => `news-posts/${id}`;

// Chairman tasks (Raisning kun tartibi — agenda). Calendar-style entries: no
// detail endpoint (the list carries everything). Manage = secretariat / admin.
export const CHAIRMAN_TASKS = 'chairman-tasks';
export const CHAIRMAN_TASK_DETAIL = (id: number) => `chairman-tasks/${id}`;

// Notifications
export const NOTIFICATIONS_LIST = 'notifications';
export const NOTIFICATION_READ = (id: number) => `notifications/${id}/read`;
export const NOTIFICATIONS_READ_ALL = 'notifications/read-all';
// Menyudagi QIZIL raqamlar: foydalanuvchining AMALINI kutayotgan hujjatlar soni
// bo'limlar kesimida ({letters, orders, support, projects, fleet, documents}).
// Backend 60s keshlaydi; web chap menyuda AYNAN shu manbadan foydalanadi.
export const MENU_BADGES = 'notifications/menu-badges';

// Employees list
export const EMPLOYEES_LIST = 'employees';
export const EMPLOYEES_BIRTHDAYS = 'employees/birthdays';
// Company phone book — light, no PII, served to every role without scoping.
export const PHONE_DIRECTORY = 'employees/phone-directory';

// Departments
export const DEPARTMENTS_LIST = 'departments';

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
export const CARD_DETAIL = (id: number) => `cards/${id}`;
export const CARD_REJECT = (id: number) => `cards/${id}/reject`;
export const CARD_COMMENTS = (id: number) => `cards/${id}/comments`;

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
// Xatning BOSHQA hujjatlari uchun OnlyOffice konfiglari. Mobilда faqat ASOSIY
// hujjat ochilardi — guvohnoma (safar varaqasi), hisobot docx'i va ILOVA
// umuman ko'rib bo'lmasdi (webda uchalasi ham ochiladi).
export const LETTER_REPORT_EDITOR_CONFIG = (id: number) => `letters/${id}/report-editor-config`;
export const LETTER_GUVOHNOMA_EDITOR_CONFIG = (id: number) => `letters/${id}/guvohnoma-editor-config`;
export const LETTER_ATTACHMENT_EDITOR_CONFIG = (id: number) => `letters/${id}/attachment-editor-config`;
export const LETTER_UPLOAD_ATTACHMENT = (id: number) => `letters/${id}/upload-attachment`;
// Business-trip report stage (xizmat safari, OLD flow). submit-report takes a
// plain JSON body; upload-report is an optional single-file multipart; the
// employee may reset a submitted report back to management_approved.
export const LETTER_SUBMIT_REPORT = (id: number) => `letters/${id}/submit-report`;
export const LETTER_UPLOAD_REPORT = (id: number) => `letters/${id}/upload-report`;
export const LETTER_RESET_REPORT = (id: number) => `letters/${id}/reset-report`;

// The employee sends a trip draft into the flow (draft → pending).
export const LETTER_SUBMIT_TRIP = (id: number) => `letters/${id}/submit-trip`;
// Leadership approvals: approve-report + approve-guvohnoma. Gated on the server
// available_actions flags (the client cannot compute the trip_approver rights).
// ⚠️ `approve-trip` (eski flow_version 2 shoxi) backenddan OLIB TASHLANGAN
// (safar oqimi yagona) — u endi 404 beradi, shu bois mijozdan ham olib
// tashlandi. `available_actions.can_approve_trip` ham qaytarilmaydi.
// DEVONXONA ro'yxatga olgach RAHBAR tasdig'i: registered_pending_rahbar →
// management_approved (boshqa filial safari). Web'da bu tugma bor edi, mobilda
// yo'q — ya'ni rahbar safarni telefondan tasdiqlay olmasdi.
export const LETTER_APPROVE_TRIP_REGISTRATION = (id: number) =>
  `letters/${id}/approve-trip-registration`;
export const LETTER_APPROVE_REPORT = (id: number) => `letters/${id}/approve-report`;
export const LETTER_APPROVE_GUVOHNOMA = (id: number) => `letters/${id}/approve-guvohnoma`;

// Business-trip movements (kelish/ketish, read-only list) + return confirmation.
// confirm-return sets is_trip_confirmed which unblocks the report stage; its
// manage rights are branch-scoped (see isBranchHr).
export const LETTER_TRIP_MOVEMENTS = (id: number) => `letters/${id}/trip-movements`;
export const LETTER_CONFIRM_RETURN = (id: number) => `letters/${id}/confirm-return`;
// XODIMNING O'ZI safarni yakunlashi (Face ID sharti serverda tekshiriladi).
export const LETTER_SELF_CONFIRM_RETURN = (id: number) => `letters/${id}/self-confirm-return`;
// KADR tasdiqlangan safarning KELGAN SANASINI tuzatadi (har qanday bosqichda).
export const LETTER_RETURN_DATE = (id: number) => `letters/${id}/return-date`;

// Devonxona "Tasdiqlash": a stamped bildirgi/ariza/xizmat safari sits at
// pending_registration (auto number+seal) until the chancellery confirms it.
// confirm-registration finalizes it (agreement → registered, trip →
// management_approved); the devonxona may edit the auto number/date. The
// availability endpoint (declared BEFORE /{pk} server-side) live-checks whether a
// registration number is free in the branch. exclude_id = the letter's own id.
// BILDIRGI/ARIZA kelishuv oqimi. Bu hujjatlar IMZOLANMAYDI — backend
// `/sign` ga 400 `use_agreement_flow` qaytaradi; kelishuvchi agree/disagree
// qiladi (izoh MAJBURIY), muallif esa qoralamani kelishuvga yuboradi va
// hammasi kelishgach devonxonaga jo'natadi.
export const LETTER_AGREE = (id: number) => `letters/${id}/agree`;
export const LETTER_DISAGREE = (id: number) => `letters/${id}/disagree`;
export const LETTER_SUBMIT_AGREEMENT = (id: number) => `letters/${id}/submit-agreement`;
export const LETTER_SEND_TO_REGISTRY = (id: number) => `letters/${id}/send-to-registry`;
export const LETTER_CONFIRM_REGISTRATION = (id: number) => `letters/${id}/confirm-registration`;
// DEVONXONA hujjatni yaratuvchiga QAYTARADI (sabab MAJBURIY) — ISTALGAN
// bosqichda: muhr/ro'yxat bekor bo'ladi, status 'returned'. Mobilда bu amal
// yo'q edi, ya'ni devonxona telefondan hujjatni qaytara olmasdi.
export const LETTER_RETURN = (id: number) => `letters/${id}/return`;
// DEVONXONA safar HISOBOTINI qaytaradi (report_submitted → report_returned).
export const LETTER_RETURN_REPORT = (id: number) => `letters/${id}/return-report`;
// KADR xizmat safarini BEKOR qiladi (sabab ixtiyoriy).
export const LETTER_CANCEL_TRIP = (id: number) => `letters/${id}/cancel-trip`;
// SAFARNI UZAYTIRISH: KADR yangi qaytish sanasini so'raydi (status →
// extension_review), rahbariyat esa tasdiqlaydi yoki rad etadi. Mobilда butun
// oqim yo'q edi — so'rov shu bosqichda tiqilib qolardi.
// ASOS BUYRUQ (guvohnomadagi "Asos:" qatori) — KADR raqam+sanani kiritadi,
// guvohnoma qayta yaratiladi. Bosqich cheklovi YO'Q (raqam ko'pincha safar
// yakunlangach ma'lum bo'ladi). Mobilда qiymat ko'rinardi-yu, KIRITIB
// bo'lmasdi.
export const LETTER_BASIS_DECREE = (id: number) => `letters/${id}/basis-decree`;
export const LETTER_EXTEND_TRIP = (id: number) => `letters/${id}/extend-trip`;
export const LETTER_APPROVE_EXTENSION = (id: number) => `letters/${id}/approve-extension`;
export const LETTER_REJECT_EXTENSION = (id: number) => `letters/${id}/reject-extension`;
export const LETTER_REGISTERED_NUMBER_AVAILABILITY = 'letters/registered-number/availability';

// Organization branches
export const ORGANIZATION_BRANCHES = 'organization-branches';
export const ORGANIZATION_BRANCH_LEADERS = (id: number) => `organization-branches/${id}/leaders`;

// Order acts (Buyruqlar / decrees)
export const ORDER_ACTS = 'order-acts';
export const ORDER_ACT_DETAIL = (id: number) => `order-acts/${id}`;
export const ORDER_ACT_DECREE_APPROVE = (id: number) => `order-acts/${id}/decree/approve`;
export const ORDER_ACT_DECREE_REJECT = (id: number) => `order-acts/${id}/decree/reject`;
export const ORDER_ACT_DECREE_RESUBMIT = (id: number) => `order-acts/${id}/decree/resubmit`;
// Yaratuvchi kelishilgan buyruqni RAHBARIYATGA yuboradi. Yo'l `send-to-leadership`
// (backend api/v1/order_act.py) — mijozda `forward-to-leadership` deb yozilgan
// edi va tugma har safar 404 bilan yiqilardi.
export const ORDER_ACT_DECREE_FORWARD = (id: number) => `order-acts/${id}/decree/send-to-leadership`;
// YARATUVCHI qoralamani OQIMGA yuboradi: draft → pending_submitter (kirituvchi
// boshqa odam bo'lsa) yoki pending_approval. Mijozda umuman yo'q edi — mobilda
// yaratilgan buyruq DRAFTда abadiy qolib ketardi (web'da "Yuborish" tugmasi bor).
export const ORDER_ACT_DECREE_SUBMIT = (id: number) => `order-acts/${id}/decree/submit`;
// KIRITUVCHI shaxs (submitter) buyruqni tasdiqlaydi: pending_submitter →
// pending_approval / approved. Mijozda umuman yo'q edi — buyruq mobilда
// shu bosqichda tiqilib qolardi.
export const ORDER_ACT_DECREE_CONFIRM_SUBMISSION = (id: number) =>
  `order-acts/${id}/decree/confirm-submission`;
export const ORDER_ACT_DECREE_REGISTER = (id: number) => `order-acts/${id}/decree/register`;
export const ORDER_ACT_DECREE_ACKNOWLEDGE = (id: number) => `order-acts/${id}/decree/acknowledge`;
export const ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS = (id: number) =>
  `order-acts/${id}/decree/assign-familiarizers`;
export const ORDER_ACT_EDITOR_CONFIG = (id: number) => `order-acts/${id}/editor-config`;
// Buyruq IZOHLARI (ko'ra oladigan har kim yozadi; status o'zgarmaydi) va MATN
// TAHRIRI TARIXI. Ikkalasi ham webda ko'rinadi, mobilда umuman yo'q edi —
// kelishuv yozishmasi va "matn qachon/kim tomonidan o'zgardi" ko'rinmasdi.
export const ORDER_ACT_COMMENTS = (id: number) => `order-acts/${id}/comments`;
export const ORDER_ACT_HISTORY = (id: number) => `order-acts/${id}/history`;

// Documents (Hujjatlar) — files/folders storage, view-only on mobile.
// Folders are flat (no nesting) and embed their files[] inline. Root (folder-
// less) files are fetched with ?folder_id=0. File bytes are reachable ONLY via
// the JWT-signed OnlyOffice editor-config (there is no raw-download endpoint);
// the config route ignores any `mode` param and decides view/edit server-side
// (a plain viewer always gets mode:'view').
export const FOLDERS_LIST = 'folders';
export const FILES_LIST = 'files';
export const FILE_EDITOR_CONFIG = (id: number) => `files/${id}/editor-config`;

// KPI — the Verifix-style scorecard module (kpi/*). NOT the dashboard's
// attendance-analytics "employee-kpi" endpoints — those are an unrelated system.
// my-scorecard without employee_id = the caller's own card; the gauge percent
// is computed on the BACKEND (Σ M-facts − Σ L-facts, clamped ≥0) — never
// recompute it client-side. Verifix task flow: a task is created with an
// optional score; set-grade edits the score; set-status moves it through the
// per-branch status catalog (task-statuses). Permissions come from entry.my_access.
export const KPI_MY_SCORECARD = 'kpi/my-scorecard';
export const KPI_MY_TEAM = 'kpi/my-team';
export const KPI_ENTRY_DETAIL = (id: number) => `kpi/entries/${id}`;
export const KPI_TASKS = 'kpi/tasks';
export const KPI_TASK_DETAIL = (id: number) => `kpi/tasks/${id}`;
export const KPI_TASK_SET_STATUS = (id: number) => `kpi/tasks/${id}/set-status`;
export const KPI_TASK_SET_GRADE = (id: number) => `kpi/tasks/${id}/set-grade`;
export const KPI_TASK_STATUSES = 'kpi/task-statuses';
export const KPI_BONUSES = 'kpi/bonuses';

// Support tickets (Texnik yordam / АКТ helpdesk). Create is multipart (optional
// image/video attachments). Employees create + see their own; AKT specialists
// take/done; the creator rates/reopens.
export const SUPPORT_TICKETS = 'support-tickets';
export const SUPPORT_TICKET_DETAIL = (id: number) => `support-tickets/${id}`;
export const SUPPORT_TICKET_TAKE = (id: number) => `support-tickets/${id}/take`;
export const SUPPORT_TICKET_DONE = (id: number) => `support-tickets/${id}/done`;
export const SUPPORT_TICKET_RATE = (id: number) => `support-tickets/${id}/rate`;
export const SUPPORT_TICKET_REOPEN = (id: number) => `support-tickets/${id}/reopen`;
// Ticket ichidagi YOZISHMA (AKT ↔ murojaatchi) va o'qilgan belgisi.
export const SUPPORT_TICKET_MESSAGES = (id: number) => `support-tickets/${id}/messages`;
export const SUPPORT_TICKET_READ = (id: number) => `support-tickets/${id}/read`;

// ── Turniket / HikCentral monitoringi (AKT, admin, master-admin) ────────────
export const HIK_MONITORING_SUMMARY = 'hik-monitoring/summary';
export const HIK_MONITORING_DEVICES = 'hik-monitoring/devices';
export const ONLYOFFICE_SERVER_URL = Env.onlyOfficeUrl;
