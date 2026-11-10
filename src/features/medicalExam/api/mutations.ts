// Write side of the medical exam day. Bodies are STRICT on the server (an undeclared key → 422).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { MEDICAL_CHECKUP, MEDICAL_CHECKUPS, MEDICAL_ME_QUEUE_JOIN, MEDICAL_QR_RESOLVE, MEDICAL_STATION_STATUS } from '@/api/urls';
import type { CreateCheckupBody, UpdateCheckupBody } from '../utils/checkupForm';
import type { ExamCheckup, ManualStationStatus, PatientCard, Visit } from '../utils/medicalExam';
import { examKeys } from './queries';

/** The employee scanned a cabinet-door code → the updated visit. */
export const joinQueue = (qr: string) =>
  apiClient.post<{ visit: Visit }>(MEDICAL_ME_QUEUE_JOIN, { qr }).then((r) => r.data.visit);

/** The doctor scanned an employee code → the card. POST so the code stays out of URLs and logs. */
export const resolvePatientQr = (qr: string) =>
  apiClient.post<PatientCard>(MEDICAL_QR_RESOLVE, { qr }).then((r) => r.data);

export const setStationStatus = ({ stationId, status }: { stationId: number; status: ManualStationStatus }) =>
  apiClient.post<Visit>(MEDICAL_STATION_STATUS(stationId), { status }).then((r) => r.data);

export const createCheckup = (body: CreateCheckupBody) =>
  apiClient.post<ExamCheckup>(MEDICAL_CHECKUPS, body).then((r) => r.data);

export const updateCheckup = ({ id, body }: { id: number; body: UpdateCheckupBody }) =>
  apiClient.patch<ExamCheckup>(MEDICAL_CHECKUP(id), body).then((r) => r.data);

const meta = { skipErrorToast: true };

/** Everything the doctor sees (card, queue) goes stale after a status change or a record. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: examKeys.all });
}

export function useJoinQueue() {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationFn: joinQueue,
    // The answer is the fresh visit: put it straight into the cache the route sheet reads.
    onSuccess: (visit) => qc.setQueryData(examKeys.myVisit(), visit),
  });
}

export function useResolveQr() {
  return useMutation({ meta, mutationFn: resolvePatientQr });
}

export function useSetStationStatus() {
  const onSuccess = useInvalidateAll();
  return useMutation({ meta, mutationFn: setStationStatus, onSuccess });
}

export function useCreateCheckup() {
  const onSuccess = useInvalidateAll();
  return useMutation({ meta, mutationFn: createCheckup, onSuccess });
}

export function useUpdateCheckup() {
  const onSuccess = useInvalidateAll();
  return useMutation({ meta, mutationFn: updateCheckup, onSuccess });
}
