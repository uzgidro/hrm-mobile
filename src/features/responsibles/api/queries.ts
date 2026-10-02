import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { MODULE_RESPONSIBLES } from '@/api/urls';

/**
 * Modul mas'uli — bo'lim, lavozim yoki aniq xodim (v2 `useResponsibles`).
 * Uchala qamrov bitta ro'yxatda: istalgan qatorga tushgan odam modulni yuritadi.
 * Yangiliklar endi uzgidro.uz dan o'qiladi — faqat «Ijro» qoldi.
 */
export type ResponsibleScope = 'department' | 'job_position' | 'employee';
export const RESPONSIBLE_SCOPES: ResponsibleScope[] = ['department', 'job_position', 'employee'];

export interface Responsible {
  id: number;
  module?: string | null;
  scope_type?: string | null;
  scope_id?: number | null;
  label?: string | null;
  sub_label?: string | null;
}

export const responsibleKeys = {
  all: ['module-responsibles'] as const,
  list: (module: string) => [...responsibleKeys.all, module] as const,
};

export function responsiblesQuery(module: string, enabled = true) {
  return queryOptions({
    queryKey: responsibleKeys.list(module),
    queryFn: () => apiClient.get(MODULE_RESPONSIBLES, { params: { module } }).then((r) => unwrapList<Responsible>(r.data)),
    enabled,
  });
}
