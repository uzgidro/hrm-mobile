import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  MEDICAL_ANNUAL_INDEX,
  MEDICAL_CHECKUP,
  MEDICAL_CHECKUP_FILES,
  MEDICAL_CHECKUPS,
  MEDICAL_FILE,
} from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import type { AnnualIndex, Checkup, buildCheckupBody, buildIndexBody } from '../utils/medical';
import { medicalKeys } from './queries';

type CheckupBody = ReturnType<typeof buildCheckupBody>;

/** Faqat doktor; muallif avtomatik o'zi. Bitta turli doktorda `specialty_id` ni server qo'yadi. */
export const createCheckup = (body: CheckupBody & { employee_id: number }) =>
  apiClient.post<Checkup>(MEDICAL_CHECKUPS, body).then((r) => r.data);

/** Faqat muallif doktor (yoki bosh admin) — begonada server 404. */
export const updateCheckup = ({ id, body }: { id: number; body: CheckupBody }) =>
  apiClient.patch<Checkup>(MEDICAL_CHECKUP(id), body).then((r) => r.data);

/** Muallif doktor va FAQAT kiritilgan kuni (`can_delete`); keyin — tahrir. */
export const removeCheckup = (id: number) => apiClient.delete(MEDICAL_CHECKUP(id)).then((r) => r.data);

/** Yillik yakuniy indeks — sihatgoh rahbari (bosh shifokor). Shu yilniki bo'lsa almashtiriladi. */
export const setAnnualIndex = (body: ReturnType<typeof buildIndexBody>) =>
  apiClient.post<AnnualIndex>(MEDICAL_ANNUAL_INDEX, body).then((r) => r.data);

/** Ko'rikka ilova (skan, tahlil). Yo'l bitta `file` oladi — har so'rovda bitta fayl (v2). */
export function addCheckupFile({ id, file }: { id: number; file: PickedFile }) {
  const fd = new FormData();
  fd.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as unknown as Blob);
  return apiClient
    .post(MEDICAL_CHECKUP_FILES(id), fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
}

export const removeCheckupFile = (fileId: number) => apiClient.delete(MEDICAL_FILE(fileId)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  // Ro'yxat (oxirgi sana, soni, holat), plitkalar va karta birga eskiradi.
  return () => qc.invalidateQueries({ queryKey: medicalKeys.all });
}

const meta = { skipErrorToast: true };

export function useCreateCheckup() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: createCheckup, onSuccess });
}
export function useUpdateCheckup() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: updateCheckup, onSuccess });
}
export function useRemoveCheckup() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeCheckup, onSuccess });
}
export function useSetAnnualIndex() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: setAnnualIndex, onSuccess });
}
export function useAddCheckupFile() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: addCheckupFile, onSuccess });
}
export function useRemoveCheckupFile() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeCheckupFile, onSuccess });
}
