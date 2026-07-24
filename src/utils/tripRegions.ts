// Branch↔region parity with the web AddLetterDrawer (business-trip create form).
// A branch may belong to SEVERAL regions via `regions[]`; legacy records carry a
// single `region` string. These pure helpers back the region multi-select →
// destination-branch filter in CreateLetterScreen, matching the web's
// `branchRegions(b)` + `.some()` behaviour. Regions are a UI-only filter — they
// are never part of the submit payload (only destination_branch_ids is sent).

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

/** Branches falling in any of the selected regions; empty selection → all. */
export function branchesInRegions(branches: BranchLite[], selected: string[]): BranchLite[] {
  if (selected.length === 0) return branches;
  return branches.filter((b) => branchRegions(b).some((r) => selected.includes(r)));
}
