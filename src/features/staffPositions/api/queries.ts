import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { STAFF_POSITIONS, STAFF_POSITIONS_ISSUES, STAFF_POSITIONS_SUMMARY, STAFF_POSITION_CHANGES } from '@/api/urls';

/** v2 `useStaffPositions.ts` `StaffPosition` (mobil ko'rsatadigan qismi). */
export interface StaffPosition {
  /** Virtual qatorda null: xodimlar bor, tasdiqlangan shtat yo'q. */
  id?: number | null;
  has_staff_row: boolean;
  organization_branch_id: number;
  department_id: number;
  job_position_id: number;
  planned_units: number | string;
  occupied_units: number | string;
  vacant_units: number | string;
  vacancy_open_date?: string | null;
  is_closed: boolean;
  closed_at?: string | null;
  note?: string | null;
  department_name?: string | null;
  job_position_name?: string | null;
  category?: string | null;
  razryad?: number | null;
  candidate_requirements?: string | null;
  salary_from?: number | string | null;
  salary_to?: number | string | null;
  application_deadline?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface StaffSummary {
  planned_units: number | string;
  occupied_units: number | string;
  vacant_units: number | string;
  rows: number;
  vacant_rows: number;
}

export interface IssueGroup {
  code: string;
  total: number;
  rows: { id?: number | null; name?: string | null; detail?: string | null; count?: number | null }[];
}

export interface StaffChange {
  id: number;
  action: string;
  old_planned_units?: number | string | null;
  new_planned_units?: number | string | null;
  reason?: string | null;
  created_at?: string | null;
  changed_by_name?: string | null;
}

export type StaffTab = 'shtat' | 'vakansiya' | 'muammo';
export const STAFF_PAGE_SIZE = 30;

export const staffKeys = {
  all: ['staff-positions'] as const,
  summary: () => [...staffKeys.all, 'summary'] as const,
  list: (p: object) => [...staffKeys.all, 'list', p] as const,
  issues: () => [...staffKeys.all, 'issues'] as const,
  changes: (id: number) => [...staffKeys.all, 'changes', id] as const,
};

export function staffSummaryQuery() {
  return queryOptions({
    queryKey: staffKeys.summary(),
    queryFn: () => apiClient.get<StaffSummary>(STAFF_POSITIONS_SUMMARY).then((r) => r.data),
    retry: false,
  });
}

export function staffListParams(f: {
  tab: StaffTab;
  search: string;
  category: string;
  includeClosed: boolean;
  page: number;
}) {
  const p: Record<string, string | number | boolean> = { page: f.page, size: STAFF_PAGE_SIZE };
  if (f.search.trim()) p.search = f.search.trim();
  if (f.tab === 'vakansiya') p.only_vacant = true;
  if (f.category) p.category = f.category;
  if (f.includeClosed) p.include_closed = true;
  return p;
}

export function staffListQuery(f: Parameters<typeof staffListParams>[0], enabled = true) {
  const params = staffListParams(f);
  return queryOptions({
    queryKey: staffKeys.list(params),
    queryFn: () =>
      apiClient.get(STAFF_POSITIONS, { params }).then((r) => {
        const d = r.data as { items?: StaffPosition[]; total?: number; pages?: number };
        return { items: d.items ?? [], total: d.total ?? 0, pages: d.pages ?? 1 };
      }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Faqat HR / bosh admin (`require_structure_manager`); 403 — «hammasi joyida» EMAS. */
export function staffIssuesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: staffKeys.issues(),
    queryFn: () => apiClient.get<{ groups?: IssueGroup[] }>(STAFF_POSITIONS_ISSUES).then((r) => r.data.groups ?? []),
    enabled,
    retry: false,
  });
}

export function staffChangesQuery(id: number | null | undefined) {
  return queryOptions({
    queryKey: staffKeys.changes(id ?? 0),
    queryFn: () => apiClient.get(STAFF_POSITION_CHANGES(id as number)).then((r) => unwrapList<StaffChange>(r.data)),
    enabled: !!id,
  });
}
