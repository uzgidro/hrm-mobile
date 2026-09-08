// Branch↔region parity with the web AddLetterDrawer (business-trip create form).
// A branch may belong to SEVERAL regions via `regions[]`; legacy records carry a
// single `region` string. These pure helpers back the region multi-select →
// destination-branch filter in CreateLetterScreen, matching the web's
// `branchRegions(b)` + `.some()` behaviour. The selection is BOTH a filter for
// the destination-branch list AND part of the create payload
// (`destination_regions`) — the trip document's "hudud" is written from it.

export interface BranchLite {
  id: number;
  name: string;
  region?: string | null;
  regions?: string[] | null;
}

/** All regions a branch belongs to: prefer `regions[]`, fall back to `region`. */
export function branchRegions(b: BranchLite): string[] {
  return (b.regions?.length ? b.regions : [b.region]).filter(Boolean) as string[];
}

/** Unique set of region labels across every branch (region-picker options). */
export function regionLabels(branches: BranchLite[]): string[] {
  return Array.from(new Set(branches.flatMap(branchRegions)));
}

/**
 * Every region of Uzbekistan, in the web's exact spelling
 * (`hrm-frontend/src/shared/utils/constants.js` UZ_REGIONS) so the strings match
 * the region values already stored on branch records. NOT translated: these are
 * DATA the backend writes into the trip document's "hudud" line, not UI labels.
 */
export const UZ_REGIONS: string[] = [
  "Qoraqalpog'iston Respublikasi",
  'Andijon viloyati',
  'Buxoro viloyati',
  "Farg'ona viloyati",
  'Jizzax viloyati',
  'Xorazm viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati',
  'Toshkent viloyati',
  'Toshkent shahri',
];

/**
 * Region options for the trip form: the full country list UNION whatever the
 * branch records carry (legacy/non-standard spellings included).
 *
 * WHY the union rather than just branch regions: we have offices in only a
 * handful of regions, so deriving the list from branches alone made a trip to a
 * region where the company has no office impossible to file — even though the
 * backend explicitly supports it (`services/letter.py` allows a trip with
 * regions and no destination branch). Web v1 has always unioned the two
 * (AddLetterDrawer.jsx:167-169); mobile derived options from branches only.
 */
export function regionOptionLabels(branches: BranchLite[]): string[] {
  return Array.from(new Set([...UZ_REGIONS, ...branches.flatMap(branchRegions)]));
}

/** Branches falling in any of the selected regions; empty selection → all. */
export function branchesInRegions(branches: BranchLite[], selected: string[]): BranchLite[] {
  if (selected.length === 0) return branches;
  return branches.filter((b) => branchRegions(b).some((r) => selected.includes(r)));
}
