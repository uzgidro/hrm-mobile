// Ro'yxatdan o'tish arizasi holati — bitta manba: mehmonning «Arizam holati» ekrani va administrator
// navbati (web v2 RegistrationStatusPage + RegistrationsPage `STATUS_TONE`). Holat KODLARI
// (`pending|approved|rejected`) tarjima qilinmaydi — faqat nishon toni shu yerda.
import type { Tone } from '@/ui';

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

const TONE: Record<string, Tone> = { pending: 'warning', approved: 'success', rejected: 'danger' };

export function registrationStatusTone(status?: string | null): Tone {
  return (status && TONE[status]) || 'neutral';
}
