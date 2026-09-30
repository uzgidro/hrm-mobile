// Hujjatlar tabining segmentlari — har biri o'z v2 moduli (canAccessPage) bo'yicha.
import type { User } from '@/types';
import { canAccessPage } from '@/utils/roles';

export type DocSegment = 'orders' | 'letters' | 'documents';

const ORDER: DocSegment[] = ['orders', 'letters', 'documents'];

export function docSegments(user: User | null | undefined): DocSegment[] {
  return ORDER.filter((s) => canAccessPage(user, s));
}

/** URL'dagi `seg` mavjud segmentlardan biri bo'lsa — o'sha, aks holda birinchisi. */
export function pickSegment(requested: string | undefined, available: DocSegment[]): DocSegment {
  return (available as string[]).includes(requested ?? '') ? (requested as DocSegment) : available[0]!;
}
