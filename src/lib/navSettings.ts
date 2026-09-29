// The master admin's module matrix (`nav.modules` in system-settings) — web v2
// builds its whole menu from it, so the mobile tabs and module grid do too.
// Fetched once per session for every user (the payload is tiny and rarely
// changes). Until it arrives, or if the call fails, canAccessPage falls back to
// the catalogue defaults — the menu never goes blank because settings were slow.
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SYSTEM_SETTINGS } from '@/api/urls';
import { setNavOverrides, type NavModuleOverrides } from '@/utils/roles';

type SystemSettings = { values?: Record<string, unknown> };

export function readNavOverrides(data: SystemSettings | undefined): NavModuleOverrides | undefined {
  const v = data?.values?.['nav.modules'];
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as NavModuleOverrides) : undefined;
}

export function navSettingsQuery() {
  return queryOptions({
    queryKey: ['system-settings'] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<SystemSettings>(SYSTEM_SETTINGS);
      // Stored before the query settles, so every subscriber re-renders with it.
      setNavOverrides(readNavOverrides(data));
      return data;
    },
    staleTime: 10 * 60_000,
    retry: 1,
    // A settings failure must stay silent — the defaults already apply.
    meta: { skipErrorToast: true },
  });
}

/** Subscribe a screen that calls canAccessPage to the module matrix. */
export function useNavSettings(enabled = true): NavModuleOverrides | undefined {
  const { data } = useQuery({ ...navSettingsQuery(), enabled });
  return readNavOverrides(data);
}
