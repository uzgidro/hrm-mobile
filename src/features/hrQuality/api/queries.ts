import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { EMPLOYEES_QUALITY } from '@/api/urls';
import type { QualityRow } from '../utils/groupByPerson';

/** v2 `HrQualityPage` `Protocol` — kartalarda nima YETISHMAYOTGANI hisoboti. */
export interface QualityProtocol {
  checked: number;
  issues: number;
  errors: number;
  warnings: number;
  clean: number;
  by_rule?: { rule: string; rule_title?: string; severity?: string; count: number }[];
  items?: QualityRow[];
  /** Ro'yxat serverda 2 000 qator bilan cheklangan. */
  truncated?: boolean;
  generated_at?: string;
}

export interface QualityFilters {
  severity?: '' | 'error' | 'warning';
  departmentId?: number | null;
  rule?: string;
}

export const qualityKeys = { all: ['employee-quality'] as const };

export function qualityParams(f: QualityFilters): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (f.departmentId) p.department_id = f.departmentId;
  if (f.severity) p.severity = f.severity;
  // Qoida SERVERDA toraytiriladi — ro'yxat 2 000 qatorda kesiladi.
  if (f.rule) p.rule = f.rule;
  return p;
}

export function qualityQuery(f: QualityFilters, enabled = true) {
  const params = qualityParams(f);
  return queryOptions({
    queryKey: [...qualityKeys.all, params] as const,
    queryFn: () => apiClient.get<QualityProtocol>(EMPLOYEES_QUALITY, { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled,
  });
}
