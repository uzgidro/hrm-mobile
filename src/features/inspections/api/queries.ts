import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { INSPECTION, INSPECTIONS } from '@/api/urls';

export interface Finding {
  id: number;
  description?: string | null;
  recommendation?: string | null;
  severity?: string | null;
  status?: string | null;
  responsible_name?: string | null;
  due_date?: string | null;
  resolution_note?: string | null;
  /** Server hisoblaydi: ochiq va muddati o'tgan. */
  is_overdue?: boolean;
}

export interface Inspection {
  id: number;
  /** Chaqiruvchining shu qatordagi huquqlari — SERVER hisoblaydi (`_to_read`). */
  can_manage?: boolean;
  can_add_finding?: boolean;
  title: string;
  purpose?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  object_type: string;
  object_label?: string | null;
  status: string;
  conclusion?: string | null;
  cancel_reason?: string | null;
  members?: { id: number; employee_name?: string | null; role?: string | null }[];
  findings?: Finding[];
  findings_open?: number;
  findings_total?: number;
}

export const INSPECTION_PAGE_SIZE = 20;
export const inspectionKeys = {
  all: ['inspections'] as const,
  list: (p: object) => [...inspectionKeys.all, 'list', p] as const,
  detail: (id: number) => [...inspectionKeys.all, 'detail', id] as const,
};

export function inspectionsQuery(f: { search: string; status: string; objectType: string; page: number }) {
  const params: Record<string, string | number> = { page: f.page, size: INSPECTION_PAGE_SIZE };
  if (f.search.trim()) params.search = f.search.trim();
  if (f.status) params.status = f.status;
  if (f.objectType) params.object_type = f.objectType;
  return queryOptions({
    queryKey: inspectionKeys.list(params),
    queryFn: () =>
      apiClient.get(INSPECTIONS, { params }).then((r) => {
        const d = r.data as { items?: Inspection[]; total?: number; pages?: number };
        const items = d.items ?? [];
        return { items, total: d.total ?? items.length, pages: d.pages ?? 1 };
      }),
    placeholderData: keepPreviousData,
  });
}

export function inspectionQuery(id: number) {
  return queryOptions({
    queryKey: inspectionKeys.detail(id),
    queryFn: () => apiClient.get<Inspection>(INSPECTION(id)).then((r) => r.data),
  });
}
