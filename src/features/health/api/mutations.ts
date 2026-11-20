import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { HEALTH_CHECK, HEALTH_CHECKS, HEALTH_CHECKS_BULK } from '@/api/urls';
import {
  applyGrade,
  gradeCoversDay,
  mergeBulkResults,
  type BulkResult,
  type GradeBody,
  type HealthRosterRow,
} from '../utils/health';
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

const GRADE_KEY = ['health-checks', 'grade'] as const;
const rosterPrefix = [...healthKeys.all, 'roster'] as const;

type Snapshot = [readonly unknown[], HealthRosterRow[] | undefined][];

/**
 * Optimistic roster update for a grade: every cached roster whose day the grade
 * covers shows the new status at once, so a one-tap «Sog'lom» never waits for the
 * network. Returns the previous data for rollback.
 */
export async function optimisticGrade(qc: QueryClient, body: GradeBody): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: rosterPrefix });
  const snapshot = qc.getQueriesData<HealthRosterRow[]>({ queryKey: rosterPrefix });
  for (const [key, rows] of snapshot) {
    const day = (key[2] as { day?: string } | undefined)?.day;
    if (rows && day && gradeCoversDay(body, day)) qc.setQueryData(key, applyGrade(rows, body));
  }
  return snapshot;
}

export function useGradeHealth() {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationKey: GRADE_KEY,
    mutationFn: (body: GradeBody) => gradeHealth(body as unknown as Body),
    onMutate: (body: GradeBody) => optimisticGrade(qc, body),
    onError: (_e, _body, snapshot) => {
      for (const [key, rows] of snapshot ?? []) qc.setQueryData(key, rows);
    },
    // A nurse taps through the queue quickly: refetch only once the LAST grade in a
    // burst settles, otherwise an early refetch would bring back a row that a later,
    // still in-flight grade already moved.
    onSettled: () => {
      if (qc.isMutating({ mutationKey: GRADE_KEY }) <= 1) void qc.invalidateQueries({ queryKey: healthKeys.all });
    },
  });
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
