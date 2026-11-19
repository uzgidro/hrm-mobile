// Sanatorium section switches. The registrar turns whole sections on and off
// (Sihatgoh → Sozlamalar → Bo'limlar); a switched-off section must disappear
// from menus, tabs and buttons, and its API answers 404 `feature_disabled`.
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type SanFeatureKey =
  | 'telegram_bot' | 'public_form' | 'room_choice' | 'kitchen_menu' | 'guest_cabinet'
  | 'journey' | 'location_map' | 'territory_map' | 'info_sections' | 'broadcasts'
  | 'packages' | 'seasonal_pricing' | 'paid_services' | 'documents'
  | 'waitlist' | 'procedure_schedule' | 'housekeeping' | 'transfer' | 'diet' | 'feedback' | 'analytics';

export type SanFeatureMap = Partial<Record<SanFeatureKey, boolean>>;

export const SAN_FEATURES_KEY = ['sanatorium', 'me-features'] as const;

export const fetchSanFeatures = () =>
  apiClient.get<{ features?: SanFeatureMap }>('sanatorium/me').then((r) => r.data?.features ?? {});

/** Unknown until loaded counts as on, so menus do not flicker for the common case. */
export const isSanFeatureOn = (map: SanFeatureMap | undefined, key: SanFeatureKey): boolean =>
  map ? map[key] !== false : true;

/** Section switches of the signed-in staff member (from GET /sanatorium/me). */
export function useSanFeatures() {
  const q = useQuery({ queryKey: SAN_FEATURES_KEY, queryFn: fetchSanFeatures, staleTime: 60_000 });
  return { map: q.data ?? {}, on: (key: SanFeatureKey) => isSanFeatureOn(q.data, key), loaded: q.data !== undefined };
}
