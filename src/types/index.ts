export interface User {
  id: number;
  type: 'employee' | 'master-admin' | 'admin';
  employee?: Employee;
  is_secretariat?: boolean;
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
  department?: { id: number; name: string; organization_branch_id?: number };
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
  created_at?: string;
  organization_branch_id?: number;
  assigned_signers?: LetterSigner[];
  signers?: LetterSigner[];
}

export interface NewsPost {
  id: number;
  title: string;
  description?: string;
  content?: string;
  created_at: string;
  author?: { legal_name: string; photo_path?: string };
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
  members?: { id?: number; member?: Employee }[];
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

// Employee work item under a has_tasks entry. `score` is set only by the
// supervisor on confirm — the owner submits names only.
export interface KpiTask {
  id: number;
  entry_id?: number | null;
  name?: string | null;
  score?: number | null;
  status?: 'draft' | 'submitted' | 'confirmed' | 'rejected' | string | null;
  review_note?: string | null;
  reviewed_by_id?: number | null;
}

// One employee × indicator × period plan/fact row. Status carries BOTH legacy
// ('draft'/'locked') and new ('N'/'I'/'D') values — treat locked ≡ D, draft ≡ N.
export interface KpiEntry {
  id: number;
  indicator_id?: number | null;
  employee_id?: number | null;
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
