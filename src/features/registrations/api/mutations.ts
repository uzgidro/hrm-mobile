import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { REGISTRATION_APPROVE, REGISTRATION_REJECT } from '@/api/urls';
import type { RegistrationRow } from '../utils/registrations';
import { registrationsKeys } from './queries';

/** Shaxsni tasdiqlash: mehmon xodimga aylanadi, administrator belgilagan filial/bo'lim/lavozim bilan. */
export const approveRegistration = ({
  id,
  body,
}: {
  id: number;
  body: { organization_branch_id: number; department_id: number | null; job_position_id: number | null };
}) => apiClient.post<RegistrationRow>(REGISTRATION_APPROVE(id), body).then((r) => r.data);

export const rejectRegistration = ({ id, reason }: { id: number; reason: string }) =>
  apiClient.post<RegistrationRow>(REGISTRATION_REJECT(id), { reason }).then((r) => r.data);

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: registrationsKeys.all }),
      // Tasdiqlash xodim yaratadi — xodimlar ro'yxati va plitkalari (v2 EMPLOYEE_QUERY_KEYS).
      qc.invalidateQueries({ queryKey: ['employees'] }),
    ]);
}

// `onSettled` — xatoda ham: 409 (ariza allaqachon boshqa administrator tomonidan ko'rib chiqilgan)
// bo'lsa ro'yxatda eskirgan «Kutilmoqda» qatori qolib ketmasin.
export function useApproveRegistration() {
  const onSettled = useInvalidate();
  return useMutation({ meta, mutationFn: approveRegistration, onSettled });
}
export function useRejectRegistration() {
  const onSettled = useInvalidate();
  return useMutation({ meta, mutationFn: rejectRegistration, onSettled });
}
