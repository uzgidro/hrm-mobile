import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { HEALTH_CHECK, HEALTH_CHECKS, HEALTH_CHECKS_BULK } from '@/api/urls';
import { mergeBulkResults, type BulkResult } from '../utils/health';
import { healthKeys } from './queries';

type Body = Record<string, unknown>;

/** Qayta saqlash eski bahoni ALMASHTIRADI (server: kunning oxirgi yozuvi kuchda). */
export const gradeHealth = (body: Body) => apiClient.post(HEALTH_CHECKS, body).then((r) => r.data);

/**
 * Server har xodimni alohida yozadi va o'tmaganlarini `failed` da qaytaradi.
 * 200 tadan ortiq bo'laklar ketma-ket yuboriladi, natija birlashtiriladi.
 */
export async function bulkGradeHealth(bodies: Body[]): Promise<BulkResult> {
  const parts: Partial<BulkResult>[] = [];
  for (const body of bodies) {
    parts.push((await apiClient.post<Partial<BulkResult>>(HEALTH_CHECKS_BULK, body)).data ?? {});
  }
  return mergeBulkResults(parts);
}

export const removeHealthCheck = (id: number) => apiClient.delete(HEALTH_CHECK(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: healthKeys.all });
}

const meta = { skipErrorToast: true };

export function useGradeHealth() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: gradeHealth, onSuccess });
}
export function useBulkGradeHealth() {
  // Bo'lakdan biri tarmoqda yiqilsa ham oldingilari yozilgan — ro'yxat baribir yangilanadi.
  const onSettled = useInvalidate();
  return useMutation({ meta, mutationFn: bulkGradeHealth, onSettled });
}
export function useRemoveHealthCheck() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeHealthCheck, onSuccess });
}
