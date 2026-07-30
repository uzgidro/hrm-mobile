import type { OrganizationBranch } from '@/types';

// "Ijro apparati" = the head company ("O'zbekgidroenergo" AJ) branch. The phone
// directory / employee dashboards split into Ijro apparati vs Tizim tashkilotlari
// around this branch. Mirrors the web shared/utils/branchHelpers.findExecutiveBranchId
// (name match, apostrophe/quote-normalized), falling back to branch id 1.
function norm(s?: string | null): string {
  return (s || '')
    .toLowerCase()
    .replace(/[‘’`']/g, '')
    .replace(/[«»"”“]/g, '');
}

export function findExecutiveBranchId(branches?: OrganizationBranch[] | null): number {
  const match = (branches || []).find((b) => {
    const n = norm(b.name);
    return /\bozbekgidroenergo\b/.test(n) && /\baj\b/.test(n) && !n.includes('filial');
  });
  return match?.id ?? 1;
}
