export interface User {
  id: number;
  type: 'employee' | 'master-admin' | 'admin';
  employee?: Employee;
  is_secretariat?: boolean;
  /** member of a navbatchilik group (auth/me flag; gates the duty tile like the web nav) */
  is_navbatchi?: boolean;
  /** branches where this user is an HR branch-leader (leadership_role='hr'), from /me */
  hr_branch_ids?: number[];
  /** branches where this user is a chancellery/devonxona branch-leader (leadership_role='chancellery'), from /me */
  chancellery_branch_ids?: number[];
  // Tabel sozlamalarida "Texnik yordam (AKT)" roli berilgan filiallar —
  // backend `require_system_admin` shu roldagi XODIMni ham kiritadi
  // (turniket/HikCentral monitoringi).
  akt_branch_ids?: number[];
  /** departments this user heads (department head), from /me — scopes work-leave "all" view like the web */
  headed_department_ids?: number[];
  /** may create/edit news posts (auth/me flag = can_manage_news on the backend) */
  is_news_manager?: boolean;
  /** may access the KPI module — auth/me flag (backend scoping.kpi_enabled); gates the KPI tile like the web nav */
  kpi_enabled?: boolean;
  // Tabel sozlamalarida filialga DIREKTOR / O'RINBOSAR qilib biriktirilgan
  // filiallar (auth/me). Safarni rahbar tasdiqlashi shular bo'yicha aniqlanadi
  // (web roleHelpers.canApproveTripForBranch) — backendда bu amal uchun
  // available_actions bayrog'i YO'Q.
  director_branch_ids?: number[];
  deputy_branch_ids?: number[];
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
  // Filial BIR NECHTA viloyatga qarashi mumkin (`regions[]`); eski yozuvlarda
  // bitta `region` satri. `branchRegions()` (utils/tripRegions) ikkalasini
  // birlashtiradi — filial viloyatini shu yerdan o'qing.
  region?: string | null;
  regions?: string[] | null;
}

// Turniket joylashuvi (GES / obyekt). `locations` M2M bo'lgani uchun massiv
// keladi; amalda bitta joylashuv bo'ladi — `eventPlace()` (utils/attendance)
// birinchisini oladi va nomni shundan yasaydi.
export interface TurnstileLocation {
  id?: number;
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  organization_branch_id?: number | null;
  organization_branch?: { id?: number; name?: string | null } | null;
}

export interface AttendanceEvent {
  id: number;
  happen_time: string;
  direction_type?: string | null;
  check_in_out_type?: number | null;
  employee_id?: number | null;
  turnstile?: {
    acs_dev_name?: string;
    name?: string;
    display_name?: string | null;
    locations?: TurnstileLocation[] | null;
  };
  is_granted?: boolean;
  user_type?: string | null;
  // Face ID suratining (MinIO) to'liq manzili — backend `photo_path` computed
  // maydonida beradi (imzolangan URL, brauzer/RN <Image> uchun tayyor).
  photo_path?: string | null;
  // Turniket joylashgan filial (backend computed) — GES nomini topib bo'lmasa
  // filial nomiga tayanamiz.
  terminal_branch_id?: number | null;
  employee_branch_id?: number | null;
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

// Buyruq MATNI tahriri izi (backend OrderActHistory). Matn o'zgarganda imzolar
// SAQLANADI, shuning uchun "qachon/kim o'zgartirdi" faqat shu tarixdan bilinadi.
export interface OrderActHistoryEntry {
  id?: number;
  order_act_id?: number;
  editor_employee_id?: number | null;
  editor?: Employee | null;
  field?: string | null;
  old_text?: string | null;
  new_text?: string | null;
  created_at?: string;
}

export interface OrderAct {
  id: number;
  category_id?: number;
  // `creator_role` — 'employee' | 'hr'. KADR buyrug'ida devonxona qadami YO'Q
  // (backend decree_register 400 `hr_decree_no_chancellery`), shu bois
  // ro'yxatga olish tugmasi faqat XODIM buyrug'ida chiqadi.
  category_rel?: { id: number; name: string; creator_role?: string | null; type?: number | null };
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
  // Devonxona muhri qo'yilganmi — muhrlangan buyruq TAHRIRLANMAYDI
  // (backend `_assert_decree_editable`).
  is_stamped?: boolean;
  comments?: OrderActComment[];
  document?: { id: number; document_objectname?: string } | null;
  // Backend joriy foydalanuvchi uchun hisoblaydigan bayroqlar (web BuyruqlarTable
  // ularni sariq ajratish uchun ishlatadi).
  action_required?: boolean;
  is_unseen?: boolean;
}

export interface LetterSigner {
  id?: number;
  employee_id?: number;
  // 'agreement' — bildirgi/ariza KELISHUVCHISI, 'addressee' — adresat (imzolamaydi).
  signer_type?: 'main' | 'ordinary' | 'management' | 'agreement' | 'addressee' | string;
  employee?: Employee;
  // Kelishuvchi holati (signer_type='agreement'): null = kutmoqda, true/false.
  agreed?: boolean | null;
  comment?: string | null;
  acted_at?: string | null;
}

// Per-user, per-record action flags the backend computes on the letter DETAIL
// read (GET /letters/{id}), using the same logic that 403s the endpoints. The
// client gates buttons on these — it does not re-derive trip rights (it does
// not know the branch trip_approver). Null on the list; only present on detail.
// Mirrors the KPI my_access pattern.
export interface LetterAvailableActions {
  can_submit_trip?: boolean;
  can_sign?: boolean;
  can_reject?: boolean;
  can_approve_report?: boolean;
  can_approve_guvohnoma?: boolean;
  // Xodim safarni O'ZI yakunlaydi (backend 2026-08-19). Tugma FAQAT xodim o'z
  // filiali turniketidan (Face ID) o'tgach ochiladi va yakunlash sanasi ham
  // o'sha o'tish sanasi (`self_finish_date`) — shartni SERVER hisoblaydi,
  // mijoz uni qayta talqin qilmaydi (aks holda tugma ko'rinib, bosganda
  // `face_id_required` 400 bo'lardi).
  can_self_finish_trip?: boolean;
  self_finish_date?: string | null;
}

export interface Letter {
  id: number;
  letter_type?: string;
  letter_number?: string | null;
  // Xizmat safarida "Bildirgi raqami" — web ro'yxati/tafsiloti raqam sifatida
  // AVVAL shuni ko'rsatadi (bo'lmasa letter_number).
  decree_number?: string | null;
  letter_date?: string | null;
  description?: string;
  /** Safar REJASI / maqsadi (web "Reja"). Tafsilotда ko'rsatiladi. */
  work_plan?: string | null;
  status?: string;
  reject_by_id?: number | null;
  rejection_reason?: string | null;
  rejected_by?: Employee | null;
  is_stamped?: boolean;
  // Registration stamp (devonxona). Auto-assigned when the letter reaches
  // pending_registration; the confirm-registration dialog pre-fills from these.
  registered_number?: string | null;
  registered_date?: string | null;
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
  /** Foydalanuvchi TANLAGAN viloyat(lar) — hujjatdagi "hudud" shu bo'yicha. */
  destination_regions?: string[] | null;
  // ASOS BUYRUQ (KADR kiritadi) — web tafsilotда alohida qator.
  basis_decree_number?: string | null;
  basis_decree_date?: string | null;
  /** Guvohnoma (safar varaqasi) raqami va fayli. */
  guvohnoma_number?: string | null;
  guvohnoma_path?: string | null;
  /** Soddalashtirilgan safar (rais + yordamchilari): devonxona/hisobot YO'Q. */
  is_simple_trip?: boolean | null;
  // Safarni UZAYTIRISH so'rovi (rahbariyat tasdig'ini kutadi).
  extension_requested_date?: string | null;
  extension_note?: string | null;
  status_before_extension?: string | null;
  /** action flags computed by the backend — only present on the detail read */
  available_actions?: LetterAvailableActions | null;
  // True when DB form text could not be patched into the (anchorless / stale)
  // docx — form edits are missing from the document. Drives a warning banner
  // in the detail view (web parity: LetterDetailModal document_out_of_sync).
  document_out_of_sync?: boolean;
  // Backend HAR BIR foydalanuvchi uchun hisoblaydigan bayroqlar (ro'yxatda ham,
  // tafsilotda ham keladi). `action_required` — "hozir bosiladigan tugmasi bor"
  // (kelishuv, devonxona ro'yxatga olishi, rahbar tasdig'i, hisobot...). Web
  // undan sariq ajratish uchun foydalanadi (LettersTable rowNeedsAction).
  action_required?: boolean;
  // Hech ochilmagan yoki oxirgi ochilishdan keyin O'ZGARGAN hujjat.
  is_unseen?: boolean;
  // DEVONXONA uchun alohida (umumiy, foydalanuvchiga bog'liq EMAS) ko'rildi
  // bayrog'i — devonxona ro'yxatida "yangi" shu bo'yicha aniqlanadi.
  chancellery_seen?: boolean;
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
  // Backend NotificationRead bularni RO'YXATDA ham qaytaradi (faqat push'da
  // emas) — deep-link shu id'lar orqali tafsilotga o'tadi.
  letter_id?: number | null;
  kpi_entry_id?: number | null;
  support_ticket_id?: number | null;
  work_leave_id?: number | null;
  medical_checkup_id?: number | null;
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

// GET employees/phone-directory — a flat, unscoped company phone book for all
// roles. Carries no PII; photo_path is already an absolute URL.
export interface PhoneDirectoryEntry {
  id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  phone_number?: string | null;
  internal_phone_number?: string | null;
  job_position_name?: string | null;
  job_position_razryad?: number | null;
  department_name?: string | null;
  branch_id?: number | null;
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
/** Duty-day member row. The backend narrowed `DutyDayRead.employees` from the
 *  full EmployeeRead (which carried passport/JShShIR/address) to this list-safe
 *  shape on 2026-07-30 — the duty list never rendered those fields anyway. */
export interface DutyEmployee {
  id: number;
  legal_name: string;
  photo_path?: string;
  photo_thumb_path?: string;
  job_position?: { id: number; name: string };
}

export interface DutyDay {
  id: number;
  date_from: string; // 'YYYY-MM-DD'
  date_to: string;
  employees?: DutyEmployee[] | null;
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
  participants?: SupportTicketParticipant[];
  // Shu foydalanuvchi uchun O'QILMAGAN xabarlar soni (ro'yxatdagi qizil nuqta).
  // Xabarlarning O'ZI ro'yxatga tushmaydi — ular alohida endpointda.
  unread_count?: number | null;
}

// Ticket ichidagi yozishma (AKT ↔ murojaatchi). `is_system` — tizim xabari
// ("X yozishmaga qo'shildi"), u markazda kulrang ko'rsatiladi.
// ── Turniket (HikCentral) monitoringi ───────────────────────────────────────
export interface HikSummary {
  devices_online?: number;
  devices_offline?: number;
  devices_total?: number;
  enrollment_verified?: number;
  enrollment_failed?: number;
  enrollment_pending?: number;
}

export interface HikDevice {
  id: number;
  acs_dev_name?: string | null;
  display_name?: string | null;
  /** display_name || acs_dev_name — serverda hisoblanadi. */
  effective_name?: string | null;
  acs_dev_ip?: string | null;
  status?: string | null;
  online?: boolean | null;
  last_online_at?: string | null;
  last_offline_at?: string | null;
  doors?: { id?: number; name?: string | null; direction_type?: string | null }[] | null;
  locations?: { id?: number; name?: string | null; organization_branch_id?: number | null }[] | null;
}

export interface SupportTicketMessage {
  id: number;
  ticket_id?: number;
  author_id?: number | null;
  author?: Employee | null;
  body?: string | null;
  is_system?: boolean | null;
  created_at?: string | null;
}

export interface SupportTicketParticipant {
  id?: number;
  employee_id?: number | null;
  employee?: Employee | null;
  added_by_id?: number | null;
}
