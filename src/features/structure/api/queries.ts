import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { DEPARTMENTS_LIST, HIERARCHIES, JOB_POSITIONS_LIST, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { OrganizationBranch } from '@/types';

/** v2 `features/structure/useStructure.ts` `Department`. */
export interface Department {
  id: number;
  name?: string | null;
  index?: number | null;
  /** TZ S1 «код подразделения» — filial ichida noyob. */
  code?: string | null;
  organization_branch_id?: number | null;
  is_secretariat?: boolean;
  is_ijro_manager?: boolean;
  heads?: { id: number; legal_name?: string | null; photo_path?: string | null; photo_thumb_path?: string | null }[] | null;
  /** Qisqartirilgan (o'chirilmagan) bo'lim — tarixda qoladi, yangi tayinlashda taklif qilinmaydi. */
  closed_at?: string | null;
  closed_reason?: string | null;
  created_at?: string | null;
}

export interface JobPosition {
  id: number;
  name?: string | null;
  short_name?: string | null;
  razryad?: number | null;
  /** rahbar | mutaxassis | xizmatchi | ishchi */
  category?: string | null;
  organization_branch_id?: number | null;
}

export interface HierarchyConnection {
  id: number;
  source_id: number;
  target_id: number;
}

/** v2 `useHierarchy` tuguni — sxema kartasi. */
export interface HierarchyNode {
  id: number;
  name?: string | null;
  description?: string | null;
  employee_count?: number | null;
  department_id?: number | null;
  department_name?: string | null;
  occupied_units?: number | string | null;
  planned_units?: number | string | null;
  vacant_units?: number | string | null;
  outgoing_connections?: HierarchyConnection[] | null;
  incoming_connections?: HierarchyConnection[] | null;
}

export const JOB_CATEGORIES = ['rahbar', 'mutaxassis', 'xizmatchi', 'ishchi'] as const;
export const STRUCTURE_PAGE_SIZE = 25;

export interface Page<T> {
  items: T[];
  total: number;
  pages: number;
}

/** Backend konverti (`items/total/pages`) yoki yalang massiv → bitta shakl. */
export function toPage<T>(data: unknown, size: number): Page<T> {
  if (Array.isArray(data)) return { items: data as T[], total: data.length, pages: Math.max(1, Math.ceil(data.length / size)) };
  const d = (data ?? {}) as { items?: T[]; total?: number; count?: number; pages?: number };
  const items = d.items ?? [];
  const total = d.total ?? d.count ?? items.length;
  return { items, total, pages: d.pages ?? Math.max(1, Math.ceil(total / size)) };
}

export const structureKeys = {
  all: ['structure'] as const,
  departments: (p: object) => [...structureKeys.all, 'departments', p] as const,
  positions: (p: object) => [...structureKeys.all, 'positions', p] as const,
  hierarchy: (branchId: number | null) => [...structureKeys.all, 'hierarchy', branchId] as const,
  branches: () => [...structureKeys.all, 'branches'] as const,
};

/** Qidiruv SERVERDA (v2: mijoz filtri faqat birinchi 200 qatorni ko'rardi). */
export function departmentsPageQuery(f: { search: string; page: number; includeClosed: boolean }) {
  const params: Record<string, string | number | boolean> = { page: f.page, size: STRUCTURE_PAGE_SIZE };
  if (f.search.trim()) params.search = f.search.trim();
  if (f.includeClosed) params.include_closed = true;
  return queryOptions({
    queryKey: structureKeys.departments(params),
    queryFn: () => apiClient.get(DEPARTMENTS_LIST, { params }).then((r) => toPage<Department>(r.data, STRUCTURE_PAGE_SIZE)),
    placeholderData: keepPreviousData,
  });
}

export function positionsPageQuery(f: { search: string; page: number; category: string }) {
  const params: Record<string, string | number> = { page: f.page, size: STRUCTURE_PAGE_SIZE };
  if (f.search.trim()) params.search = f.search.trim();
  if (f.category) params.category = f.category;
  return queryOptions({
    queryKey: structureKeys.positions(params),
    queryFn: () => apiClient.get(JOB_POSITIONS_LIST, { params }).then((r) => toPage<JobPosition>(r.data, STRUCTURE_PAGE_SIZE)),
    placeholderData: keepPreviousData,
  });
}

export function hierarchyQuery(branchId: number | null) {
  return queryOptions({
    queryKey: structureKeys.hierarchy(branchId),
    queryFn: () =>
      apiClient
        .get(HIERARCHIES, { params: { organization_branch_id: branchId } })
        .then((r) => unwrapList<HierarchyNode>(r.data)),
    enabled: !!branchId,
  });
}

export function branchesQuery() {
  return queryOptions({
    queryKey: structureKeys.branches(),
    queryFn: () => apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<OrganizationBranch>(r.data)),
    staleTime: 30 * 60 * 1000,
  });
}
