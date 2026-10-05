import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { CUSTOM_FIELDS_META, CUSTOM_FIELD_GROUPS } from '@/api/urls';
import type { CustomFieldGroup, CustomFieldMeta } from '../utils/customFields';

// v2 kaliti `['custom-fields', ...]`: xodim kartochkasining ta'rif so'rovi (`schema`) ham shu ildiz ostida
// bo'lardi — ta'rif o'zgarsa ildiz bo'yicha yangilanadi.
export const customFieldsKeys = {
  all: ['custom-fields'] as const,
  meta: () => [...customFieldsKeys.all, 'meta'] as const,
  groups: (entityType: string) => [...customFieldsKeys.all, 'groups', entityType] as const,
};

/** Obyekt va maydon turlari (v2: 30 daqiqa yangi hisoblanadi). */
export function customFieldMetaQuery() {
  return queryOptions({
    queryKey: customFieldsKeys.meta(),
    queryFn: () => apiClient.get<CustomFieldMeta>(CUSTOM_FIELDS_META).then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Obyekt turi bo'yicha guruhlar (ichida maydonlari). `only_active=false` ataylab: bu ADMIN ekrani —
 * o'chirilgan guruh/maydon shu yerda ko'rinmasa, uni qayta yoqib bo'lmasdi (v2).
 */
export function customFieldGroupsQuery(entityType: string) {
  return queryOptions({
    queryKey: customFieldsKeys.groups(entityType),
    queryFn: () =>
      apiClient
        .get(CUSTOM_FIELD_GROUPS, { params: { entity_type: entityType, only_active: false } })
        .then((r) => unwrapList<CustomFieldGroup>(r.data)),
  });
}
