// Reads of the staff-parity round that no other module owns: the day's arriving / leaving stays.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { SANATORIUM_STAYS } from '@/api/urls';
import type { Stay } from '../types';
import { sanKeys } from './queries';

export type DayFlow = 'arrivals' | 'departures';

/** Stays arriving (`arrivals`) or leaving (`departures`) on `day`; one request, up to 100 rows. */
export const fetchDayStays = (kind: DayFlow, day: string) =>
  apiClient.get(SANATORIUM_STAYS, { params: { [kind]: day, size: 100 } }).then((r) => unwrapList<Stay>(r.data));

export const dayStaysQuery = (kind: DayFlow, day: string, enabled = true) =>
  queryOptions({ queryKey: [...sanKeys.all, 'day-stays', kind, day], queryFn: () => fetchDayStays(kind, day), enabled, retry: false, meta: { skipErrorToast: true } });
