import { apiClient } from '../api/client';
import { EMPLOYEES_LIST } from '../api/urls';
import { Employee } from '../types';

interface EmployeePage { items: Employee[]; total: number }

/**
 * Fetches ALL employees for a branch using parallel pagination.
 * API max page size is 100, so 149 employees = 2 parallel pages.
 */
export async function fetchAllEmployees(orgBranchId?: number): Promise<EmployeePage> {
  const base: Record<string, unknown> = {
    size: 100,
    page: 1,
    ...(orgBranchId ? { organization_branch_id: orgBranchId } : {}),
  };

  const firstRes = await apiClient.get<EmployeePage>(EMPLOYEES_LIST, { params: base });
  const first = firstRes.data;

  if (!first?.items) return { items: [], total: 0 };
  if (first.total <= 100) return first;

  const totalPages = Math.ceil(first.total / 100);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      apiClient
        .get<EmployeePage>(EMPLOYEES_LIST, { params: { ...base, page: i + 2 } })
        .then((r) => (r.data?.items ?? []) as Employee[]),
    ),
  );

  const items = [...first.items, ...rest.flat()];
  return { items, total: first.total };
}

export function employeesQueryKey(orgBranchId?: number) {
  return ['team-employees-all', orgBranchId] as const;
}
