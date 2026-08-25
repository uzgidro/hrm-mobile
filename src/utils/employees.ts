import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { EMPLOYEES_LIST, EMPLOYEE_OPTIONS } from '../api/urls';
import { Employee } from '../types';
import { mapWithConcurrency } from './concurrency';

interface EmployeePage { items: Employee[]; total: number }

// Max simultaneous page requests when paginating large lists.
const PAGE_CONCURRENCY = 4;

/**
 * Fetches ALL employees for a branch using parallel pagination.
 * API max page size is 100, so 149 employees = 2 parallel pages.
 *
 * `extraParams` — qo'shimcha server filtrlari (`include_multi_org`,
 * `sort_by_razryad`, ...). Ular BARCHA sahifaga bir xil uzatiladi, aks holda
 * 2-sahifadan boshlab boshqa to'plam/ tartib kelib, ro'yxat aralashib ketardi.
 */
export async function fetchAllEmployees(
  orgBranchId?: number,
  extraParams?: Record<string, unknown>,
): Promise<EmployeePage> {
  const base: Record<string, unknown> = {
    size: 100,
    page: 1,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
    ...extraParams,
  };

  const firstRes = await apiClient.get<EmployeePage>(EMPLOYEES_LIST, { params: base });
  const first = firstRes.data;

  if (!first?.items) return { items: [], total: 0 };
  if (first.total <= 100) return first;

  const totalPages = Math.ceil(first.total / 100);
  const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const rest = await mapWithConcurrency(pages, PAGE_CONCURRENCY, (page) =>
    apiClient
      .get<EmployeePage>(EMPLOYEES_LIST, { params: { ...base, page } })
      .then((r) => (r.data?.items ?? []) as Employee[]),
  );

  const items = [...first.items, ...rest.flat()];
  return { items, total: first.total };
}

export function employeesQueryKey(orgBranchId?: number) {
  return ['team-employees-all', orgBranchId] as const;
}

// The employees LIST — wraps the shared, parallel-paginated `fetchAllEmployees`
// helper above and reuses `employeesQueryKey` so the roster cache is shared
// with every other screen that reads it. Do NOT swap this key for a
// feature-local key (e.g. `employeeKeys.list(...)`): that would fork the cache
// and break sharing. Lives here (not in the employees feature) so every
// feature can import it without a cross-feature import
// (`src/features/README.md` forbids importing another feature's `api/`).
export function employeesListQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });
}


// ── XODIM TANLAGICHI (butun tashkilot) ───────────────────────────────────────

/**
 * `GET /employees/options` qatori — PII'siz yengil tanlagich ma'lumoti.
 * `Employee` bilan bir xil emas: `job_position`/`department` bu yerda tayyor
 * NOM (obyekt emas), shu bois alohida tip.
 */
export interface EmployeeOptionRow {
  id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  job_position_name?: string | null;
  department_name?: string | null;
  organization_branch_id?: number | null;
  organization_name?: string | null;
}

/**
 * Butun tashkilot bo'yicha xodim tanlagichi ro'yxati (parallel sahifalash).
 * FAQAT nomzod har qanday filialdan bo'lishi mumkin bo'lgan formalar uchun —
 * xat kelishuvchilari / buyruq imzolovchilari uchun EMAS (ular filialga
 * bog'liq, `fetchAllEmployees` ishlatiladi).
 */
export async function fetchEmployeeOptions(orgBranchId?: number): Promise<EmployeeOptionRow[]> {
  const base: Record<string, unknown> = {
    size: 100,
    page: 1,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
  };
  const first = (await apiClient.get<{ items: EmployeeOptionRow[]; total: number }>(
    EMPLOYEE_OPTIONS, { params: base },
  )).data;
  if (!first?.items) return [];
  if (first.total <= 100) return first.items;

  const totalPages = Math.ceil(first.total / 100);
  const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const rest = await mapWithConcurrency(pages, PAGE_CONCURRENCY, (page) =>
    apiClient
      .get<{ items: EmployeeOptionRow[] }>(EMPLOYEE_OPTIONS, { params: { ...base, page } })
      .then((r) => r.data?.items ?? []),
  );
  return [...first.items, ...rest.flat()];
}

export function employeeOptionsQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: ['employee-options', orgBranchId] as const,
    queryFn: () => fetchEmployeeOptions(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });
}
