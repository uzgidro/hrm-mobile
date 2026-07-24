export interface User {
  id: number;
  type: 'employee' | 'master-admin' | 'admin';
  employee?: Employee;
  is_secretariat?: boolean;
  /** member of a navbatchilik group (auth/me flag; gates the duty tile like the web nav) */
  is_navbatchi?: boolean;
  /** branches where this user is an HR branch-leader (leadership_role='hr'), from /me */
  hr_branch_ids?: number[];
  /** may create/edit news posts (auth/me flag = can_manage_news on the backend) */
  is_news_manager?: boolean;
  /** may access the KPI module — auth/me flag (backend scoping.kpi_enabled); gates the KPI tile like the web nav */
  kpi_enabled?: boolean;
}

export interface Employee {
  id: number;
  legal_name: string;
  photo_path?: string;
  birth_date?: string;
  email?: string;
  phone_number?: string;
  internal_phone_number?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  lunch_start_time?: string;
  lunch_end_time?: string;
  working_days?: number[];
  job_position?: { id: number; name: string };
  department?: { id: number; name: string; organization_branch_id?: number; has_navbatchilik?: boolean };
  is_multi_org_user?: boolean;
  multi_org_employee_role?: string | string[];
  organization_branches?: OrganizationBranch[];
  supervisor?: Employee;
  supervisor_id?: number;
}

export interface OrganizationBranch {
  id: number;
  name: string;
}

export interface AttendanceEvent {
  id: number;
  happen_time: string;
  direction_type?: string | null;
  check_in_out_type?: number | null;
  employee_id?: number | null;
  turnstile?: { acs_dev_name?: string; name?: string };
  is_granted?: boolean;
  user_type?: string | null;
}

export interface WorkLeave {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  employee_id?: number;
  employee?: Employee;
  description?: string;
  created_at?: string;
  updated_at?: string;
  assigned_signers?: Employee[];
  signers?: Employee[];
  rejection_reason?: string | null;
}

export interface OrderActCategory {
  id: number;
  name: string;
  description?: string | null;
}

export interface OrderActSigner {
  id?: number;
  order_act_id?: number;
  employee_id?: number;
  signer_type?: string; // 'approver' | 'leadership'
  can_edit_document?: boolean;
  employee?: Employee;
}

export interface OrderActFamiliarizer {
  id?: number;
  order_act_id?: number;
  employee_id?: number;
  acknowledged?: boolean;
  acknowledged_at?: string;
  employee?: Employee;
}

export interface OrderActComment {
  id?: number;
  order_act_id?: number;
  employee_id?: number;
  employee?: Employee;
  action?: string;
  text?: string;
  created_at?: string;
}

export interface OrderAct {
  id: number;
  category_id?: number;
  category_rel?: { id: number; name: string };
  act_number?: number | null;
  act_date?: string | null;
  summary?: string;
  description?: string;
  plans?: string;
  arrival_report?: string;
  planned_arrival_date?: string | null;
  planned_departure_date?: string | null;
  status?: string;
  employee_id?: number;
  employee?: Employee;
  submitter_id?: number;
  submitter?: Employee;
  created_by_id?: number;
  created_by?: Employee;
  created_at?: string;
  organization_branch_id?: number;
  familiarizers?: OrderActFamiliarizer[];
  assigned_signers?: OrderActSigner[];
  signers?: OrderActSigner[];
  rejected_by?: Employee;
  rejection_reason?: string | null;
  comments?: OrderActComment[];
  document?: { id: number; document_objectname?: string } | null;
}

export interface LetterSigner {
  id?: number;
  employee_id?: number;
  signer_type?: 'main' | 'ordinary' | 'management' | string;
  employee?: Employee;
}

export interface Letter {
  id: number;
  letter_type?: string;
  letter_number?: string | null;
  letter_date?: string | null;
  description?: string;
  status?: string;
  reject_by_id?: number | null;
  rejection_reason?: string | null;
  rejected_by?: Employee | null;
  is_stamped?: boolean;
  generated_document_path?: string | null;
  attachment_path?: string | null;
  departure_date?: string | null;
  arrival_date?: string | null;
  submitter_id?: number | null;
  submitter?: Employee | null;
  employee_id?: number | null;
  employee?: Employee | null;
  created_by_id?: number | null;
  created_by?: Employee | null;
  creator_employee_id?: number | null;
  creator_employee?: Employee | null;
  created_at?: string;
  organization_branch_id?: number;
  assigned_signers?: LetterSigner[];
  signers?: LetterSigner[];

  // ── Business-trip report stage (xizmat safari; OLD flow only) ──────────────
  // flow_version 2 = NEW flow (main branch, no report stage); 1/null = OLD flow.
  flow_version?: number | null;
  // Set by KADR "Keldi" (hr-arrive / confirm-return) — gates report submission.
  is_trip_confirmed?: boolean | null;
  actual_return_date?: string | null;
  // Report fields (authored via plain form; the DOCX is built server-side).
  report_number?: string | null;
  report_date?: string | null;
  report_summary?: string | null;
  report_task?: string | null;
  report_content?: string | null;
  report_attachment_path?: string | null;
  report_filename?: string | null;
  // Chancellery's reason when a submitted report is bounced back (report_returned).
  return_reason?: string | null;
  // Destination branch(es) of a business trip — used with organization_branch_id
  // to build the branch set that gates trip-movement management (isBranchHr).
  destination_branch_id?: number | null;
  destination_branches?: OrganizationBranch[] | null;
}

// A single kelish/ketish event of a business trip. event_type is a backend
// contract string ('arrived' | 'departed') — never translated, only its label.
// turnstile_event_id != null means the event came from a Face-ID turnstile.
export interface BusinessTripMovement {
  id: number;
  letter_id?: number;
  branch_id?: number | null;
  branch?: OrganizationBranch | null;
  event_type: 'arrived' | 'departed';
  event_date: string;
  sequence_order?: number;
  note?: string | null;
  is_confirmed?: boolean;
  turnstile_event_id?: number | null;
}

export interface NewsPost {
  id: number;
  title: string;
  description?: string;
  content?: string;
  created_at: string;
  author?: { legal_name: string; photo_path?: string };
  organization_branch_id?: number | null;
  organization_branch?: OrganizationBranch;
}

// Matches the backend NotificationRead schema exactly.
export interface Notification {
  id: number;
  notification_type: string;
  description?: string | null;
  order_act_id?: number | null;
  news_post_id?: number | null;
  workspace_id?: number | null;
  card_id?: number | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WorkExperience {
  id: number;
  company_name: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Education {
  id: number;
  institution_name: string;
  faculty_name: string;
  degree_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface EmployeeFull extends Employee {
  gender?: number;
  nationality?: string;
  maritial_status?: string;
  address?: string;
  pasport_series?: string;
  pasport_number?: string;
  pasport_individual_number?: string;
  pasport_issue_by?: string;
  personal_identification_number?: string;
  taxpayer_identification_number?: string;
  individual_accumulative_pension_account_number?: string;
  job_acceptance_date?: string;
  work_experiences?: WorkExperience[];
  educations?: Education[];
}

export interface EmployeeBirthday {
  id: number;
  legal_name: string;
  birth_date?: string;
  photo_path?: string;
  days_left: number;
  job_position?: { id: number; name: string };
}

export interface AttendanceDay {
  date: string;
  status: 'present' | 'absent' | 'weekend' | 'holiday' | 'vacation' | 'sick' | 'business_trip';
  entry_time?: string;
  exit_time?: string;
  is_late?: boolean;
  minutes_late?: number;
}

// ── Visitors (Mehmonlar) ─────────────────────────────────────────────────────
export interface Visitor {
  id: number;
  legal_name?: string;
  personal_identification_number?: string;
  organization_name?: string;
  job_position?: string;
  phone_number?: string;
  telegram_username?: string;
  organization_branch_id?: number;
  host_employee_id?: number;
  host_employee_name?: string;
  host_employee_internal_phone?: string;
  card_no?: string;
  photo_path?: string;
  qr_path?: string;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
  last_visit_time?: string;
  visit_count?: number;
  organization_branch?: OrganizationBranch;
}

// ── Projects / Loyihalar (workspaces, columns, cards) ────────────────────────
export interface WorkspaceMember {
  id?: number;
  workspace_id?: number;
  member_id?: number;
  member?: Employee;
}

export interface Workspace {
  id: number;
  name?: string;
  description?: string;
  created_by_id?: number;
  members?: WorkspaceMember[];
  columns?: WorkspaceColumn[];
  columns_count?: number;
  cards_count?: number;
  members_count?: number;
}

export interface WorkspaceColumn {
  id: number;
  name?: string;
  workspace_id?: number;
  is_archived?: boolean;
  color?: string;
}

export interface WorkspaceCard {
  id: number;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  column_id?: number;
  is_completed?: boolean;
  members?: { id?: number; member_id?: number; member?: Employee }[];
}

// Card label (nested `{ label }` per backend CardLabelRead).
export interface CardLabel {
  id?: number;
  label?: { id?: number; name?: string; color?: string; workspace_id?: number };
}

// Card file attachment. `attachment_path` is a ready-to-open presigned MinIO URL
// (open via Linking.openURL). No uploader/created_at on the backend schema.
export interface CardAttachment {
  id?: number;
  card_id?: number;
  original_filename?: string;
  content_type?: string;
  attachment_path?: string;
}

// Card comment (GET /cards/{id}/comments — NOT nested in the card detail).
export interface CardComment {
  id?: number;
  card_id?: number;
  author_id?: number;
  text?: string;
  is_edited?: boolean;
  created_at?: string;
  updated_at?: string;
  author?: { id?: number; legal_name?: string; photo_path?: string };
}

// Full card detail (GET /cards/{id} → CardReadFull). Reject shows via
// rejected_at != null; there is no separate status enum. "Assignee" = being in
// members[] (or created_by_id) — the backend enforces who may act (403 otherwise).
export interface WorkspaceCardFull extends WorkspaceCard {
  position?: number;
  completed_at?: string | null;
  rejected_at?: string | null;
  completed_by_id?: number | null;
  rejected_by_id?: number | null;
  created_by_id?: number | null;
  labels?: CardLabel[];
  attachments?: CardAttachment[];
}

// ── Documents / Hujjatlar (files & folders storage, view-only on mobile) ──────
// Backend FileScope enum: literal string values (never translated — web parity).
export type DocumentScope = 'public' | 'private' | 'branch';

// A stored file. Bytes are reachable only through the OnlyOffice editor-config
// (see urls.ts) — there is no raw-download URL on this shape.
export interface HrmFile {
  id: number;
  original_filename?: string | null;
  file_filename?: string | null;
  content_type?: string | null;
  folder_id?: number | null;
  scope?: DocumentScope | null;
  share_slug?: string | null;
  created_by_id?: number | null;
  created_by?: Employee | null;
  created_at?: string;
  updated_at?: string;
}

// A flat folder (no nesting / no parent_id) that embeds its files[] inline.
// Note: the backend exposes only `created_by_id` here, never a nested employee.
export interface DocumentFolder {
  id: number;
  name?: string | null;
  scope?: DocumentScope | null;
  organization_branch_id?: number | null;
  created_by_id?: number | null;
  files?: HrmFile[] | null;
  created_at?: string;
  updated_at?: string;
}

// ── KPI (Verifix-style scorecard, kpi/*) ─────────────────────────────────────
// Codes below (direction M|L, statuses, fact_source) are backend contract
// identifiers — never translated, only their display labels localize.

// KPI definition. direction 'M' = more-is-better, 'L' = penalty (subtracted).
export interface KpiIndicator {
  id: number;
  name?: string | null;
  description?: string | null;
  direction?: 'M' | 'L' | null;
  measure?: string | null;
  weight?: number | null;
  has_tasks?: boolean | null;
  max_percent?: number | null;
  fact_source?: 'manual' | 'task' | 'gather' | 'formula' | null;
  group_name?: string | null;
  is_active?: boolean | null;
}

// A configurable, per-branch task status (Verifix catalog). `counts_for_fact`
// rows roll their task scores into entry.fact_value on the backend.
export interface KpiTaskStatus {
  id: number;
  name: string;
  color?: string | null;
  order_no?: number | null;
  counts_for_fact: boolean;
  is_active?: boolean;
  organization_branch_id?: number | null;
}

// Employee work item under a has_tasks entry. Verifix: a task carries a `score`
// (set on create or via set-grade) and a `status_id` pointing at the per-branch
// status catalog (`task_status` is the expanded row). `status` is the legacy
// string kept for back-compat.
export interface KpiTask {
  id: number;
  entry_id?: number | null;
  name?: string | null;
  score?: number | null;
  status?: 'draft' | 'submitted' | 'confirmed' | 'rejected' | string | null;
  status_id?: number | null;
  task_status?: Partial<Pick<KpiTaskStatus, 'name' | 'color' | 'counts_for_fact' | 'order_no'>> | null;
  review_note?: string | null;
  reviewed_by_id?: number | null;
}

// The caller's permissions on ONE entry (backend KpiEntryAccess). Filled ONLY by
// the entry-detail endpoint (GET kpi/entries/{id}); null in the scorecard/list.
// manage_access (HR/master/kpi_admin) grants everything; owner => is_owner +
// edit_access; supervisor => task_approve_access; stakeholder per grants.
export interface KpiEntryAccess {
  is_owner: boolean;
  edit_access: boolean;
  fact_insert_access: boolean;
  status_change_access: boolean;
  task_approve_access: boolean;
  manage_access: boolean;
}

// One employee × indicator × period plan/fact row. Status carries BOTH legacy
// ('draft'/'locked') and new ('N'/'I'/'D') values — treat locked ≡ D, draft ≡ N.
export interface KpiEntry {
  id: number;
  indicator_id?: number | null;
  employee_id?: number | null;
  organization_branch_id?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  plan_value?: number | null;
  fact_value?: number | null;
  result_coef?: number | null;
  result_percent?: number | null;
  status?: string | null;
  note?: string | null;
  indicator?: KpiIndicator | null;
  employee?: Employee | null;
  tasks?: KpiTask[] | null;
  /** the caller's rights on this entry — only present on the detail endpoint */
  my_access?: KpiEntryAccess | null;
}

export interface KpiScorecardProfile {
  id?: number | null;
  legal_name?: string | null;
  photo_path?: string | null;
  job_position_name?: string | null;
  department_name?: string | null;
  supervisor_name?: string | null;
  work_schedule?: string | null;
  gender?: string | null;
  period_begin?: string | null;
  period_end?: string | null;
}

// GET kpi/my-scorecard envelope. `result_percent` is the backend-computed
// gauge value (Σ M-facts − Σ L-facts, clamped ≥0) — do not recompute.
export interface KpiScorecard {
  employee_id?: number | null;
  result_percent?: number | null;
  profile?: KpiScorecardProfile | null;
  period?: string | null; // 'YYYY-MM'
  available_periods?: string[] | null;
  entries?: KpiEntry[] | null;
}

// One direct report's aggregate on GET kpi/my-team (no entries array — only
// counts; open the member's scorecard via my-scorecard?employee_id=).
export interface KpiTeamMember {
  employee_id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  job_position_name?: string | null;
  department_name?: string | null;
  result_percent?: number | null;
  entries_count?: number | null;
  pending_tasks?: number | null; // tasks awaiting the supervisor's review
  all_done?: boolean | null; // every entry finalized (locked/D)
}

// GET kpi/my-team envelope. Empty employees[] for a non-supervisor — safe to
// call for everyone.
export interface KpiTeam {
  period_begin?: string | null;
  period_end?: string | null;
  employees?: KpiTeamMember[] | null;
}

// A bonus row attached to an entry (read-only for the employee). `amount` is
// always null until the 1C payroll integration — render the percent only.
export interface KpiBonus {
  id: number;
  object_type?: string | null;
  object_id?: number | null;
  oper_type_name?: string | null;
  bonus_percent?: number | null;
  amount?: number | null;
}

// ── Time-tracking (Учёт времени, read-only) ──────────────────────────────────
// All codes below (calendar status codes, shift schedule_type) are backend
// contract identifiers — never translated, only their display labels localize.

// The per-employee attendance summary carried on GET
// /turnstile-attendance-events/normalized. `calendar` is the month grid:
// { "YYYY-MM-DD" -> status code } (present|late|absent|day_off|business_trip|
// annual_leave|sick_leave|unpaid_leave|dekret|dismissed|work_leave|early_leave
// and the label-mapped codes). This is the source for "Мой табель".
export interface AttendanceSummary {
  present_days_count?: number | null;
  late_days_count?: number | null;
  absent_days_count?: number | null;
  work_duration_hours?: number | null;
  calendar?: Record<string, string> | null;
  daily_late_minutes?: Record<string, number> | null;
}

// One row of the normalized tabel grid: a full Employee plus its attendance
// summary. For "my tabel" we request employee_id=me and read items[0].
export interface EmployeeAttendance extends Employee {
  attendance?: AttendanceSummary | null;
}

// A duty shift within a navbatchilik group (name + start/end times).
export interface NavbatchilikShift {
  name?: string | null;
  start?: string | null; // 'HH:MM'
  end?: string | null;
}

// A navbatchilik (duty) group the current employee belongs to
// (GET /navbatchilik-groups/my). employees are the direct members only — the
// effective (department-expanded) roster comes from /{pk}/members.
export interface NavbatchilikGroup {
  id: number;
  name?: string | null;
  organization_branch_id?: number | null;
  weekdays?: number[] | null;
  shifts?: NavbatchilikShift[] | null;
  is_active?: boolean | null;
  employees?: Employee[] | null;
  departments?: { id: number; name?: string | null }[] | null;
  effective_member_count?: number | null;
}

// One assigned duty/shift day (GET /work-schedule-days). schedule_type is the
// shift name (dept mode: K/T/D); is_day_off marks a rest day.
export interface WorkScheduleDay {
  id: number;
  employee_id: number;
  schedule_date: string; // 'YYYY-MM-DD'
  schedule_type?: string | null;
  is_day_off?: boolean | null;
  working_hours_start?: string | null; // 'HH:MM:SS'
  working_hours_end?: string | null;
}

// A named non-working range (Bayramlar). is_repeatable = recurs yearly.
export interface Holiday {
  id: number;
  name?: string | null;
  date_from: string; // 'YYYY-MM-DD'
  date_to: string;
  is_repeatable?: boolean | null;
  organization_branch_id?: number | null;
}

// A duty-day range with the employees who work through those off-days
// (GET /duty-days — separate from both holidays and navbatchilik).
export interface DutyDay {
  id: number;
  date_from: string; // 'YYYY-MM-DD'
  date_to: string;
  employees?: Employee[] | null;
}


// ── LLM assistant (llm/*) ────────────────────────────────────────────────────
// Role strings ('user' | 'assistant' | 'tool' | 'system') and interaction
// statuses are backend contract identifiers — never translated.

// A chat session (SessionRead). NOTE: the backend schema exposes NO
// created_at/updated_at, and there is no auto-title — `name` stays "New Chat"
// unless PATCHed.
export interface LlmSession {
  id: number;
  name?: string | null;
  created_by_id?: number | null;
  system_prompt?: string | null;
}

// One stored message (MessageRead). The mobile client always requests
// visible_only=true, so only role 'user' and final 'assistant' rows arrive.
export interface LlmMessage {
  id: number;
  session_id?: number | null;
  interaction_id?: number | null;
  role: 'user' | 'assistant' | 'tool' | 'system' | string;
  content?: string | null;
  sequence?: number | null;
  is_visible?: boolean | null;
}

// Non-stream POST llm/sessions/{id}/chat response.
export interface LlmChatResponse {
  response?: string | null;
  interaction_id?: number | null;
  session_id?: number | null;
  status?: 'collecting' | 'executing' | 'completed' | 'failed' | string | null;
}

// GET llm/large-lists/{id} page (the [[LOAD_MORE:id:shown:total]] marker's
// target). `rows` are cleaned scalar objects; `lines` is the legacy text form.
export interface LlmLargeListPage {
  lines?: string[] | null;
  rows?: Record<string, unknown>[] | null;
  offset: number;
  next_offset: number;
  total: number;
  has_more: boolean;
}

// ── Support tickets (Texnik yordam / АКТ helpdesk) ────────────────────────────
// status/priority are backend contract strings — never translated, only their
// display labels (see supportStatus util).
export interface SupportTicketAttachment {
  id: number;
  original_filename?: string | null;
  content_type?: string | null;
  file_url?: string | null;
}

// A chairman-task = one agenda (kun tartibi) calendar entry: title/participants/
// date/time/color. No status or assignee — it's a scheduled event, not a task.
export interface ChairmanTask {
  id: number;
  title: string;
  description?: string | null;
  participants?: string | null;
  task_date: string;
  start_time?: string | null;
  end_time?: string | null;
  color?: string | null;
  position?: number | null;
  organization_branch_id?: number | null;
  created_by_id?: number | null;
  created_by?: { id?: number; legal_name?: string } | null;
}

export interface SupportTicket {
  id: number;
  organization_branch_id?: number | null;
  created_by_id?: number | null;
  assignee_id?: number | null;
  uge_number?: string | null;
  room_number?: string | null;
  priority: 'urgent' | 'normal' | 'low';
  description: string;
  status: 'open' | 'in_progress' | 'done' | 'rated';
  taken_at?: string | null;
  done_at?: string | null;
  rated_at?: string | null;
  rating?: number | null;
  rating_note?: string | null;
  created_at?: string | null;
  creator_internal_number?: string | null;
  creator?: Employee | null;
  assignee?: Employee | null;
  attachments?: SupportTicketAttachment[];
}
