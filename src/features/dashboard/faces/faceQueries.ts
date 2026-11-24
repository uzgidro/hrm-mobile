// Data layer of the home "module faces": one small page of a module's own list endpoint.
// Request functions are pure (tested with axios-mock-adapter); `faceQuery` wraps them in a
// TanStack `queryOptions`. A face never decides access - the caller checks `canAccessPage`.
// Mirrors web v2 `moduleFaces.tsx` (endpoints, params, ordering); mobile `apiClient` adds no
// global branch, so a branch is sent explicitly where the web injected one and the mobile
// list screen also sends it (leaves, visitors, holidays, duty, roster).
import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  CHAIRMAN_TASKS,
  DASHBOARD_ROSTER_COMPOSITION,
  FILES_LIST,
  HOLIDAYS_LIST,
  LEARNING_MY,
  LETTERS_LIST,
  NAVBATCHILIK_GROUPS,
  NAVBATCHILIK_GROUP_MEMBERS,
  ORDER_ACTS,
  PHONE_DIRECTORY,
  SANATORIUM_DASHBOARD,
  SUPPORT_TICKETS,
  TASKS_OVERDUE,
  TASK_CHRONOLOGY,
  TRAININGS,
  VEHICLE_ACCESS,
  VEHICLE_REQUESTS,
  VISITORS_LIST,
  WORKSPACES_LIST,
  WORK_LEAVES,
  WORK_SCHEDULE_DAYS_BY_GROUP,
  ZOOM_MEETINGS,
} from '@/api/urls';
import type { ChairmanTask, Holiday, Letter, OrderAct, PhoneDirectoryEntry, SupportTicket, Visitor, WorkLeave } from '@/types';

/** Mobile pages that have a face (a subset of `PageKey`). */
export const FACE_PAGES = [
  'orders',
  'letters',
  'requests',
  'ijro',
  'chrono',
  'zoom',
  'support',
  'projects',
  'documents',
  'vehicles',
  'guests',
  'duty',
  'chairman',
  'trainings',
  'learning',
  'sanatorium',
  'holidays',
  'employees',
  'directory',
] as const;
export type FacePage = (typeof FACE_PAGES)[number];
export function isFacePage(page: string): page is FacePage {
  return (FACE_PAGES as readonly string[]).includes(page);
}

/** Rows a face asks the server for. */
export const FACE_SIZE = 4;
/** Shortest phone-directory search the face runs (below it the face shows a hint). */
export const PHONE_MIN_CHARS = 2;

const STALE_MS = 60_000;

export interface FaceCtx {
  /** Active branch (`useActiveBranchId`; an employee's own branch on the employee side). */
  branchId?: number;
  /** Directory face only. */
  search?: string;
}

// ── Row shapes (only what a face reads) ──────────────────────────────────────

export interface IjroRow {
  id: number;
  task_index?: string | null;
  description?: string | null;
  deadline_date?: string | null;
  employee?: { legal_name?: string | null } | null;
}
export interface ChronoRow {
  id: number;
  title: string;
  doc_number?: string | null;
  deadline?: string | null;
  delay_days?: number | null;
  days_left?: number | null;
}
export interface ZoomRow {
  id: number;
  status: string;
  topic?: string | null;
  agenda?: string | null;
  start_at?: string | null;
  is_live?: boolean;
  requested_by?: { legal_name?: string | null } | null;
}
export interface WorkspaceRow {
  id: number;
  name?: string | null;
  cards_count?: number;
  completed_cards_count?: number;
  pending_cards_count?: number;
  deadline?: string | null;
}
export interface FileRow {
  id: number;
  original_filename?: string | null;
  file_filename?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: { legal_name?: string | null } | null;
}
export interface VehicleRequestRow {
  id: number;
  employee_name?: string | null;
  requested_by?: { legal_name?: string | null } | null;
  purpose?: string | null;
  destination_names?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
}
export interface DutyRow {
  key: string;
  name: string;
  photo?: string | null;
  group: string;
  from?: string | null;
  to?: string | null;
}
export interface TrainingRow {
  id: number;
  employee_name?: string | null;
  employee_photo_thumb_path?: string | null;
  program_name?: string | null;
  start_date?: string | null;
  certificate_expires_at?: string | null;
}
export interface EnrollmentRow {
  id: number;
  course_id: number;
  course_title?: string | null;
  provider?: string | null;
  progress?: number | null;
  deadline?: string | null;
  completed_at?: string | null;
  last_activity_at?: string | null;
}
export interface StayRow {
  id: number;
  guest?: { full_name?: string | null } | null;
  room?: { number?: string | null } | null;
  planned_from: string;
  planned_to: string;
}
export interface SanatoriumData {
  today: string;
  stats: Record<string, number | undefined>;
  arrivals: StayRow[];
  departures: StayRow[];
}
export interface RosterSummary {
  total: number;
  no_birth_date: number;
  no_position: number;
  hired_year: number;
}

// ── Pure request functions ───────────────────────────────────────────────────

const page1 = (extra: Record<string, unknown> = {}) => ({ page: 1, size: FACE_SIZE, ...extra });
const today = () => dayjs().format('YYYY-MM-DD');

export const fetchOrders = () =>
  apiClient.get(ORDER_ACTS, { params: page1() }).then((r) => unwrapList<OrderAct>(r.data));

/** Letters waiting for me first; with nothing waiting - the latest letters (web parity). */
export async function fetchLetters(): Promise<{ items: Letter[]; awaiting: number }> {
  const waiting = await apiClient.get(LETTERS_LIST, { params: page1({ action_required: true }) });
  const w = waiting.data as { total?: number } | Letter[];
  const awaiting = Array.isArray(w) ? w.length : (w?.total ?? 0);
  if (awaiting > 0) return { items: unwrapList<Letter>(waiting.data), awaiting };
  const recent = await apiClient.get(LETTERS_LIST, { params: page1() });
  return { items: unwrapList<Letter>(recent.data), awaiting: 0 };
}

export const fetchLeaveRequests = (branchId?: number) =>
  apiClient
    .get(WORK_LEAVES, { params: page1({ status: 'pending', slim: true, organization_branch_id: branchId }) })
    .then((r) => unwrapList<WorkLeave>(r.data));

/** Late tasks first; with none late - the open ones. */
export async function fetchIjro(): Promise<IjroRow[]> {
  const late = await apiClient.get(TASKS_OVERDUE, { params: page1({ status: 'late' }) });
  const lateRows = unwrapList<IjroRow>(late.data);
  if (lateRows.length > 0) return lateRows;
  const open = await apiClient.get(TASKS_OVERDUE, { params: page1({ status: 'open' }) });
  return unwrapList<IjroRow>(open.data);
}

export const fetchChrono = () =>
  apiClient
    .get(TASK_CHRONOLOGY, { params: page1({ mine: true, status: 'active' }) })
    .then((r) => unwrapList<ChronoRow>(r.data));

/** Upcoming first. The web sends no branch for Zoom (one company-wide schedule). */
export const fetchZoom = () =>
  apiClient
    .get(ZOOM_MEETINGS, { params: page1({ scope: 'active' }) })
    .then((r) => unwrapList<ZoomRow>(r.data).sort((a, b) => (a.start_at ?? '').localeCompare(b.start_at ?? '')));

/** New tickets (urgent first), then taken ones; mobile status codes are `open` / `in_progress`. */
export async function fetchSupport(): Promise<SupportTicket[]> {
  const [fresh, taken] = await Promise.all([
    apiClient.get(SUPPORT_TICKETS, { params: page1({ mine: true, status: 'open', sort: 'priority' }) }),
    apiClient.get(SUPPORT_TICKETS, { params: page1({ mine: true, status: 'in_progress' }) }),
  ]);
  return [...unwrapList<SupportTicket>(fresh.data), ...unwrapList<SupportTicket>(taken.data)].slice(0, FACE_SIZE);
}

export const fetchProjects = () =>
  apiClient
    .get(WORKSPACES_LIST, { params: page1({ only_member: true }) })
    .then((r) => unwrapList<WorkspaceRow>(r.data));

/** `/files` answers the whole visible list (no paging): keep the newest few. */
export const fetchDocuments = () =>
  apiClient.get(FILES_LIST).then((r) =>
    unwrapList<FileRow>(r.data)
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      .slice(0, FACE_SIZE),
  );

/**
 * The queue the Vehicles screen opens on: approvers see what awaits approval, the fleet what is
 * pending; a person with neither right gets nothing (and no request that would 403).
 * `organization_branch_id` is never sent - the fleet lives in one branch, requesters in another.
 */
export async function fetchVehicles(): Promise<VehicleRequestRow[]> {
  const access = await apiClient.get<{ can_manage?: boolean; can_approve?: boolean }>(VEHICLE_ACCESS);
  const status = access.data?.can_approve ? 'awaiting_approval' : access.data?.can_manage ? 'pending' : null;
  if (!status) return [];
  const res = await apiClient.get(VEHICLE_REQUESTS, { params: page1({ status }) });
  return unwrapList<VehicleRequestRow>(res.data);
}

export const fetchGuests = (branchId?: number) =>
  apiClient
    .get(VISITORS_LIST, { params: page1({ visit: 'today', organization_branch_id: branchId }) })
    .then((r) => unwrapList<Visitor>(r.data));

interface DutyGroupRow {
  id: number;
  name?: string | null;
  is_active?: boolean | null;
  weekdays?: number[] | null;
  shifts?: { start?: string | null; end?: string | null }[] | null;
}
interface DutyDayRow {
  employee_id: number;
  is_day_off?: boolean | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
}
interface DutyMemberRow {
  id: number;
  legal_name?: string | null;
  photo_thumb_path?: string | null;
}

/** Who is on duty today across at most five active groups (today's weekday first). */
export async function fetchDuty(branchId?: number): Promise<DutyRow[]> {
  const res = await apiClient.get(NAVBATCHILIK_GROUPS, { params: { size: 100, organization_branch_id: branchId } });
  const weekday = (dayjs().day() + 6) % 7; // Monday = 0, as the roster page numbers them
  const groups = unwrapList<DutyGroupRow>(res.data)
    .filter((g) => g.is_active)
    .sort((a, b) => Number(b.weekdays?.includes(weekday)) - Number(a.weekdays?.includes(weekday)))
    .slice(0, 5);
  const day = today();
  const perGroup = await Promise.all(
    groups.map(async (g): Promise<DutyRow[]> => {
      const days = await apiClient
        .get(WORK_SCHEDULE_DAYS_BY_GROUP(g.id), { params: { date_from: day, date_to: day } })
        .then((r) => unwrapList<DutyDayRow>(r.data));
      const on = days.filter((d) => !d.is_day_off);
      if (on.length === 0) return [];
      const members = await apiClient.get(NAVBATCHILIK_GROUP_MEMBERS(g.id)).then((r) => unwrapList<DutyMemberRow>(r.data));
      return on.map((d) => {
        const m = members.find((x) => x.id === d.employee_id);
        return {
          key: `${g.id}-${d.employee_id}`,
          name: m?.legal_name || `#${d.employee_id}`,
          photo: m?.photo_thumb_path,
          group: g.name ?? '',
          from: d.working_hours_start ?? g.shifts?.[0]?.start,
          to: d.working_hours_end ?? g.shifts?.[0]?.end,
        };
      });
    }),
  );
  return perGroup.flat().sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
}

export const fetchChairman = () =>
  apiClient
    .get(CHAIRMAN_TASKS, { params: { from: today(), to: today() } })
    .then((r) => unwrapList<ChairmanTask>(r.data).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')));

/** Certificates about to expire first; with none - the planned trainings. */
export async function fetchTrainings(): Promise<{ items: TrainingRow[]; expiring: boolean }> {
  const exp = await apiClient.get(TRAININGS, { params: page1({ expiring_only: true }) });
  const expRows = unwrapList<TrainingRow>(exp.data);
  if (expRows.length > 0) return { items: expRows, expiring: true };
  const planned = await apiClient.get(TRAININGS, { params: page1({ status: 'planned' }) });
  return { items: unwrapList<TrainingRow>(planned.data), expiring: false };
}

/** In-progress courses first, then by recent activity. */
export const fetchLearning = () =>
  apiClient.get(LEARNING_MY).then((r) =>
    unwrapList<EnrollmentRow>(r.data)
      .sort(
        (a, b) =>
          Number(!!a.completed_at) - Number(!!b.completed_at) ||
          (b.last_activity_at || '').localeCompare(a.last_activity_at || ''),
      )
      .slice(0, FACE_SIZE),
  );

/** Staff-only endpoint (403 for a person with no sanatorium role - the caller gates access). */
export async function fetchSanatorium(): Promise<SanatoriumData> {
  const d = (await apiClient.get(SANATORIUM_DASHBOARD)).data as Partial<{
    today: string;
    stats: Record<string, number | undefined>;
    arrivals: StayRow[];
    departures: StayRow[];
  }> | null;
  return { today: d?.today ?? today(), stats: d?.stats ?? {}, arrivals: d?.arrivals ?? [], departures: d?.departures ?? [] };
}

export const fetchHolidays = (branchId?: number) =>
  apiClient
    .get(HOLIDAYS_LIST, { params: { kind: 'holiday', page: 1, size: 100, organization_branch_id: branchId } })
    .then((r) => unwrapList<Holiday>(r.data));

/** Leaders / HR only (403 for an ordinary employee - the caller gates access). */
export async function fetchRoster(branchId?: number): Promise<RosterSummary> {
  const res = await apiClient.get<{
    summary?: { total?: number; no_birth_date?: number; no_position?: number; seniority?: Record<string, number> };
  }>(DASHBOARD_ROSTER_COMPOSITION, { params: { organization_branch_id: branchId } });
  const s = res.data?.summary ?? {};
  return {
    total: s.total ?? 0,
    no_birth_date: s.no_birth_date ?? 0,
    no_position: s.no_position ?? 0,
    hired_year: s.seniority?.['<1'] ?? 0,
  };
}

/** First few matches only; the directory answers the whole organisation. */
export const fetchDirectory = (search: string) =>
  apiClient
    .get(PHONE_DIRECTORY, { params: page1({ search: search.trim() }) })
    .then((r) => unwrapList<PhoneDirectoryEntry>(r.data));

// ── Query factory ────────────────────────────────────────────────────────────

/** What a face fetched, tagged by page so the row mapper can narrow it. */
export type FaceRaw =
  | { page: 'orders'; data: OrderAct[] }
  | { page: 'letters'; data: { items: Letter[]; awaiting: number } }
  | { page: 'requests'; data: WorkLeave[] }
  | { page: 'ijro'; data: IjroRow[] }
  | { page: 'chrono'; data: ChronoRow[] }
  | { page: 'zoom'; data: ZoomRow[] }
  | { page: 'support'; data: SupportTicket[] }
  | { page: 'projects'; data: WorkspaceRow[] }
  | { page: 'documents'; data: FileRow[] }
  | { page: 'vehicles'; data: VehicleRequestRow[] }
  | { page: 'guests'; data: Visitor[] }
  | { page: 'duty'; data: DutyRow[] }
  | { page: 'chairman'; data: ChairmanTask[] }
  | { page: 'trainings'; data: { items: TrainingRow[]; expiring: boolean } }
  | { page: 'learning'; data: EnrollmentRow[] }
  | { page: 'sanatorium'; data: SanatoriumData }
  | { page: 'holidays'; data: Holiday[] }
  | { page: 'employees'; data: RosterSummary }
  | { page: 'directory'; data: PhoneDirectoryEntry[] };

async function load(page: FacePage, ctx: FaceCtx): Promise<FaceRaw> {
  switch (page) {
    case 'orders': return { page, data: await fetchOrders() };
    case 'letters': return { page, data: await fetchLetters() };
    case 'requests': return { page, data: await fetchLeaveRequests(ctx.branchId) };
    case 'ijro': return { page, data: await fetchIjro() };
    case 'chrono': return { page, data: await fetchChrono() };
    case 'zoom': return { page, data: await fetchZoom() };
    case 'support': return { page, data: await fetchSupport() };
    case 'projects': return { page, data: await fetchProjects() };
    case 'documents': return { page, data: await fetchDocuments() };
    case 'vehicles': return { page, data: await fetchVehicles() };
    case 'guests': return { page, data: await fetchGuests(ctx.branchId) };
    case 'duty': return { page, data: await fetchDuty(ctx.branchId) };
    case 'chairman': return { page, data: await fetchChairman() };
    case 'trainings': return { page, data: await fetchTrainings() };
    case 'learning': return { page, data: await fetchLearning() };
    case 'sanatorium': return { page, data: await fetchSanatorium() };
    case 'holidays': return { page, data: await fetchHolidays(ctx.branchId) };
    case 'employees': return { page, data: await fetchRoster(ctx.branchId) };
    case 'directory': return { page, data: await fetchDirectory(ctx.search ?? '') };
  }
}

/** Branch only enters the key of the faces that send it. */
const BRANCHED: readonly FacePage[] = ['requests', 'guests', 'duty', 'holidays', 'employees'];

export const faceKeys = {
  all: ['dashboard', 'faces'] as const,
  face: (page: FacePage, ctx: FaceCtx = {}) =>
    [
      ...faceKeys.all,
      page,
      BRANCHED.includes(page) ? (ctx.branchId ?? null) : null,
      page === 'directory' ? (ctx.search ?? '').trim() : null,
    ] as const,
};

export function faceQuery(page: FacePage, ctx: FaceCtx = {}) {
  return queryOptions({
    queryKey: faceKeys.face(page, ctx),
    queryFn: () => load(page, ctx),
    staleTime: STALE_MS,
    // A refusal (403 / 400 for a login the module is not for) is a quiet state, never retried.
    retry: false,
    refetchOnWindowFocus: false,
    meta: { skipErrorToast: true },
    enabled: page !== 'directory' || (ctx.search ?? '').trim().length >= PHONE_MIN_CHARS,
  });
}
