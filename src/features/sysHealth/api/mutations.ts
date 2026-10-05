import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SYSTEM_OPS_RECOVERY_ENTER, SYSTEM_OPS_RECOVERY_RUN, SYSTEM_OPS_RESUME, SYSTEM_OPS_SHUTDOWN } from '@/api/urls';
import { recoveryBody, shutdownBody, type TxAction } from '../utils/sysHealth';
import { sysHealthKeys } from './queries';

type Report = Record<string, unknown>;

/** TZ E2 «Аварийное завершение» — server tuzilgan hisobot qaytaradi. */
export const shutdownSystem = (p: { reason: string; force: boolean }) =>
  apiClient.post<Report>(SYSTEM_OPS_SHUTDOWN, shutdownBody(p.reason, p.force)).then((r) => r.data ?? {});

export const enterRecovery = () => apiClient.post<Report>(SYSTEM_OPS_RECOVERY_ENTER).then((r) => r.data ?? {});

/** TZ E3: butunlik + tranzaksiyalar + indeks + modullar sinovi. */
export const runRecovery = (tx: TxAction) =>
  apiClient.post<Report>(SYSTEM_OPS_RECOVERY_RUN, recoveryBody(tx)).then((r) => r.data ?? {});

export const resumeSystem = () => apiClient.post<Report>(SYSTEM_OPS_RESUME).then((r) => r.data ?? {});

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sysHealthKeys.all });
}

export function useShutdownSystem() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: shutdownSystem, onSuccess });
}
export function useEnterRecovery() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: enterRecovery, onSuccess });
}
export function useRunRecovery() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: runRecovery, onSuccess });
}
export function useResumeSystem() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: resumeSystem, onSuccess });
}
