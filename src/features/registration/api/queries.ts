import { queryOptions } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { apiClient } from '@/api/client';
import { REGISTRATION_ME } from '@/api/urls';

/** v2 `features/registration/useRegistration.ts` `RegistrationRow` (ko'rsatiladigan qismi). */
export interface Registration {
  id: number;
  status: string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
  birth_date?: string | null;
  pinfl?: string | null;
  passport_number?: string | null;
  nationality_name?: string | null;
  citizenship_name?: string | null;
  address?: string | null;
  is_uge_employee: boolean;
  claimed_branch_name?: string | null;
  claimed_department_name?: string | null;
  claimed_job_position_name?: string | null;
  photo_url?: string | null;
  reject_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
}

export const registrationKeys = { all: ['registration-me'] as const };

/** O'z arizam. 404 — ariza yo'q (masalan oddiy xodim): xato emas, `null`. */
export function fetchMyRegistration(): Promise<Registration | null> {
  return apiClient
    .get<Registration>(REGISTRATION_ME)
    .then((r) => r.data ?? null)
    .catch((e: unknown) => {
      if (isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    });
}

export function myRegistrationQuery() {
  return queryOptions({ queryKey: registrationKeys.all, queryFn: fetchMyRegistration, retry: false });
}
