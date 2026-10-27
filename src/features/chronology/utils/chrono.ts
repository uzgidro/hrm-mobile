// Topshiriqlar xronologiyasi — web v2 `features/chronology` porti.
//
// A task is the MAIN job (main executor + deadline); its work is a tree of
// jobs hanging on it (`parent_id`, null = on the main job). Every forecast,
// delay and cause is computed by the server (`analyze()`), so these helpers
// only shape what it sends for the screen — web and mobile cannot drift.
import dayjs from 'dayjs';

export type ChronoPerson = {
  id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  position_name?: string | null;
  branch_name?: string | null;
  /** Away today: leave / sick / trip / maternity / order / other. */
  absence?: 'leave' | 'sick' | 'trip' | 'maternity' | 'order' | 'other' | null;
};

/** Asosiy / Texnik / Sayyor — separate registers (web v2 parity, 2026-10-27). */
export type ChronoKind = 'main' | 'technical' | 'field';
export const CHRONO_KINDS: ChronoKind[] = ['main', 'technical', 'field'];

export type StepStatus = 'active' | 'submitted' | 'returned' | 'approved';
export type TaskStatus = 'active' | 'late' | 'review' | 'done';
export type TaskFilter = '' | 'active' | 'late' | 'review' | 'extensions' | 'done';
export const TASK_FILTERS: Exclude<TaskFilter, ''>[] = ['active', 'late', 'review', 'extensions', 'done'];

export type ChronoExtension = {
  id: number;
  step_id: number;
  status: 'pending' | 'approved' | 'rejected';
  old_deadline: string;
  requested_deadline: string;
  new_deadline?: string | null;
  reason: string;
  decision_note?: string | null;
  requested_by?: ChronoPerson | null;
  decided_by?: ChronoPerson | null;
  created_at?: string | null;
  decided_at?: string | null;
  /** agreement (control department + main executor) → chair → done; null = moved directly. */
  stage?: 'agreement' | 'chair' | 'done' | null;
  votes?: {
    role: 'control' | 'responsible' | 'chair';
    person?: ChronoPerson | null;
    decision?: 'agree' | 'disagree' | null;
    note?: string | null;
    acted_at?: string | null;
  }[];
  /** The viewer may agree now / may give the chairman's decision now. */
  can_agree?: boolean;
  can_decide?: boolean;
};

export type ChronoStep = {
  id: number;
  title: string;
  description?: string | null;
  assignee?: ChronoPerson | null;
  start_date?: string | null;
  deadline: string;
  original_deadline: string;
  status: StepStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  parent_id: number | null;
  depth: number;
  children_total: number;
  children_done: number;
  blocked: boolean;
  forecast_end?: string | null;
  late_days: number;
  own_late_days: number;
  inherited_days: number;
  days_left?: number | null;
  on_critical_path: boolean;
  extensions: ChronoExtension[];
  /** 1, 2, 3 … among the jobs on the same job. */
  order_no?: number;
  requires_file?: boolean;
  /** A job before it is not accepted yet — a sequential task waits. */
  waiting_turn?: boolean;
  coexecutors?: { employee?: ChronoPerson | null; reason?: string | null }[];
};

/** Whose move it is now. */
export type ChronoTurn = {
  kind: 'step' | 'review' | 'main' | 'control' | 'final' | 'done';
  step_id?: number | null;
  title?: string;
  person?: ChronoPerson | null;
  late_days?: number;
};

export type ChronoCause = {
  step_id: number | null;
  title: string;
  assignee?: ChronoPerson | null;
  own_late_days: number;
  finished: boolean;
  extensions: number;
};

export type ChronoAttachment = {
  id: number;
  original_filename: string;
  content_type?: string | null;
  size?: number | null;
  url?: string | null;
};

export type ChronoFile = ChronoAttachment & {
  event_kind: string;
  step_id?: number | null;
  step_title?: string | null;
  uploaded_by?: ChronoPerson | null;
  created_at?: string | null;
};

export type ChronoEvent = {
  id: number;
  kind: string;
  step_id?: number | null;
  step_title?: string | null;
  text?: string | null;
  meta?: Record<string, unknown> | null;
  actor?: ChronoPerson | null;
  created_at?: string | null;
  attachments: ChronoAttachment[];
};

export type ChronoTaskRow = {
  id: number;
  title: string;
  doc_number?: string | null;
  start_date?: string | null;
  deadline: string;
  submitted_at?: string | null;
  completed_at?: string | null;
  main_executor?: ChronoPerson | null;
  status: TaskStatus;
  steps_total: number;
  steps_done: number;
  steps_review: number;
  steps_late: number;
  pending_extensions: number;
  forecast_end?: string | null;
  delay_days: number;
  days_left?: number | null;
  causes: ChronoCause[];
  assignees: ChronoPerson[];
  kind?: ChronoKind;
  /** Jobs on the same job are done one after another (1, 2, 3 …). */
  sequential?: boolean;
  /** executing → control → final → done */
  stage?: 'executing' | 'control' | 'final' | 'done';
  turn?: ChronoTurn | null;
};

export type ChronoTask = ChronoTaskRow & {
  description?: string | null;
  members: ChronoPerson[];
  files: ChronoFile[];
  created_by?: ChronoPerson | null;
  steps: ChronoStep[];
  events: ChronoEvent[];
  can_manage: boolean;
  my_step_ids: number[];
  is_main_executor: boolean;
  jobs_open: number;
  main_own_late_days: number;
  /** May give the final approval (after the control department). */
  can_final?: boolean;
  final_step?: boolean;
};

export type ChronoSummary = {
  active: number;
  late: number;
  review: number;
  extensions: number;
  done: number;
  all: number;
  can_manage: boolean;
  /** Manager, chairman or final approver — the scope switch makes sense. */
  sees_all?: boolean;
};

export type ChronoCalendarItem = {
  task_id: number;
  task_title: string;
  step_id: number | null;
  title: string;
  assignee?: ChronoPerson | null;
  deadline: string;
  tone: StepTone;
  is_main: boolean;
  mine: boolean;
  late_days: number;
};

/** A job as the form sends it: `id` for a saved one, `key` for a new one. */
export type StepInput = {
  id?: number;
  key?: string;
  title: string;
  description?: string | null;
  assignee_id: number;
  start_date?: string | null;
  deadline: string;
  parent: string | null;
  requires_file?: boolean;
};

/* ─────────────────────────── states ─────────────────────────── */

/** How a job reads at a glance — the same six tones as the web tree. */
export type StepTone = 'done' | 'review' | 'returned' | 'late' | 'waiting' | 'active';

export function stepTone(s: Pick<ChronoStep, 'status' | 'late_days' | 'blocked'>): StepTone {
  if (s.status === 'approved') return 'done';
  if (s.status === 'submitted') return 'review';
  if (s.status === 'returned') return s.late_days > 0 ? 'late' : 'returned';
  if (s.late_days > 0) return 'late';
  if (s.blocked) return 'waiting';
  return 'active';
}

/** The main job in the same vocabulary as a job. */
export function rootTone(task: Pick<ChronoTask, 'completed_at' | 'submitted_at' | 'delay_days' | 'jobs_open'>): StepTone {
  if (task.completed_at) return 'done';
  if (task.submitted_at) return 'review';
  if (task.delay_days > 0) return 'late';
  if (task.jobs_open > 0) return 'waiting';
  return 'active';
}

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const TONE_BADGE: Record<StepTone, BadgeTone> = {
  done: 'success',
  review: 'info',
  returned: 'warning',
  late: 'danger',
  waiting: 'neutral',
  active: 'brand',
};

export const TASK_BADGE: Record<TaskStatus, BadgeTone> = {
  active: 'brand',
  late: 'danger',
  review: 'info',
  done: 'success',
};

/* ─────────────────────────── the job tree ─────────────────────────── */

export type TreeItem = { id: string; parent: string | null };

/**
 * Depth-first order of a job tree with outline numbers («1», «1.2», «1.2.1»),
 * siblings in their given order. A job whose parent is missing hangs on the
 * main job, and a loop (only a broken save could make one) is still listed.
 */
export function treeOrder<T extends TreeItem>(items: T[]): { item: T; depth: number; number: string }[] {
  const ids = new Set(items.map((i) => i.id));
  const kids = new Map<string | null, T[]>();
  for (const it of items) {
    const p = it.parent && ids.has(it.parent) && it.parent !== it.id ? it.parent : null;
    kids.set(p, [...(kids.get(p) ?? []), it]);
  }
  const out: { item: T; depth: number; number: string }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number, prefix: string) => {
    (kids.get(parent) ?? []).forEach((it, i) => {
      if (seen.has(it.id)) return;
      seen.add(it.id);
      const number = prefix ? `${prefix}.${i + 1}` : String(i + 1);
      out.push({ item: it, depth, number });
      walk(it.id, depth + 1, number);
    });
  };
  walk(null, 0, '');
  items.filter((it) => !seen.has(it.id)).forEach((it) => out.push({ item: it, depth: 0, number: '?' }));
  return out;
}

/** The job and every job below it — what it may not be hung under. */
export function subtree(items: TreeItem[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const it of items) {
      if (it.parent && out.has(it.parent) && !out.has(it.id)) {
        out.add(it.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Ordered jobs of a task as outline rows. */
export function jobRows(task: Pick<ChronoTask, 'steps'>) {
  return treeOrder(task.steps.map((s) => ({ id: String(s.id), parent: s.parent_id != null ? String(s.parent_id) : null, step: s }))).map(
    (o) => ({ step: o.item.step, depth: o.depth, number: o.number }),
  );
}

/** Days from `from` to `to` (YYYY-MM-DD). */
export const daysBetween = (from: string, to: string) => dayjs(to).startOf('day').diff(dayjs(from).startOf('day'), 'day');

/** The people a comment may «@»-mention: members, the main executor, every executor. */
export function mentionablePeople(task: Pick<ChronoTask, 'members' | 'main_executor' | 'steps'>): ChronoPerson[] {
  const out = new Map<number, ChronoPerson>();
  for (const m of task.members) out.set(m.id, m);
  if (task.main_executor) out.set(task.main_executor.id, task.main_executor);
  for (const s of task.steps) if (s.assignee) out.set(s.assignee.id, s.assignee);
  return [...out.values()];
}

/** The «@word» right before the caret, or null. */
export function mentionQuery(text: string, caret: number): string | null {
  const m = /(^|\s)@([^\s@]{0,40})$/u.exec(text.slice(0, caret));
  return m ? m[2] : null;
}

/** Replace the «@word» before the caret with «@Full Name ». Returns the new text and caret. */
export function insertMention(text: string, caret: number, name: string): { text: string; caret: number } {
  const before = text.slice(0, caret).replace(/@([^\s@]{0,40})$/u, `@${name} `);
  return { text: before + text.slice(caret), caret: before.length };
}

/** Ids of the picked people whose «@Name» is still in the text — a deleted mention notifies no one. */
export function mentionIds(text: string, picked: ChronoPerson[]): number[] {
  return picked.filter((p) => p.legal_name && text.includes(`@${p.legal_name}`)).map((p) => p.id);
}

/* ─────────────────────────── files ─────────────────────────── */

const VIEWABLE = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'xls', 'xlsx', 'csv', 'ods', 'ppt', 'pptx', 'odp']);
export const fileExt = (name: string) => (name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : '');
/** PDF / Word / Excel / PowerPoint open in OnlyOffice (view only); anything else is downloaded. */
export const opensInViewer = (name: string) => VIEWABLE.has(fileExt(name));

export function fileSize(n?: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
