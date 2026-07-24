import { branchRegions, regionLabels, branchesInRegions, type BranchLite } from '../tripRegions';

// A branch may belong to several regions (b.regions[]); legacy records carry a
// single b.region. Mirrors the web AddLetterDrawer branchRegions() + .some()
// filter, which the mobile trip-create form must match (web parity).

const branch = (id: number, name: string, extra: Partial<BranchLite> = {}): BranchLite => ({
  id,
  name,
  ...extra,
});

describe('branchRegions', () => {
  it('returns the multi-region array when regions[] is present', () => {
    expect(branchRegions(branch(1, 'A', { regions: ['Toshkent', 'Sirdaryo'] }))).toEqual([
      'Toshkent',
      'Sirdaryo',
    ]);
  });

  it('falls back to the single region when regions[] is empty or absent', () => {
    expect(branchRegions(branch(1, 'A', { region: 'Buxoro' }))).toEqual(['Buxoro']);
    expect(branchRegions(branch(2, 'B', { region: 'Buxoro', regions: [] }))).toEqual(['Buxoro']);
  });

  it('prefers regions[] over the legacy region when both are present', () => {
    expect(
      branchRegions(branch(1, 'A', { region: 'Old', regions: ['New1', 'New2'] })),
    ).toEqual(['New1', 'New2']);
  });

  it('returns [] and drops falsy values when neither is meaningful', () => {
    expect(branchRegions(branch(1, 'A'))).toEqual([]);
    expect(branchRegions(branch(2, 'B', { region: null }))).toEqual([]);
    expect(branchRegions(branch(3, 'C', { region: '' }))).toEqual([]);
    expect(branchRegions(branch(4, 'D', { regions: ['Ok', '', null as unknown as string] }))).toEqual(['Ok']);
  });
});

describe('regionLabels', () => {
  it('returns the unique set of regions across all branches', () => {
    const branches = [
      branch(1, 'A', { region: 'Toshkent' }),
      branch(2, 'B', { region: 'Sirdaryo' }),
      branch(3, 'C', { region: 'Toshkent' }),
    ];
    expect(regionLabels(branches)).toEqual(['Toshkent', 'Sirdaryo']);
  });

  it('flattens multi-region branches and dedupes across the overlap', () => {
    const branches = [
      branch(1, 'A', { regions: ['Toshkent', 'Sirdaryo'] }),
      branch(2, 'B', { regions: ['Sirdaryo', 'Jizzax'] }),
    ];
    expect(regionLabels(branches)).toEqual(['Toshkent', 'Sirdaryo', 'Jizzax']);
  });

  it('returns [] for an empty branch list', () => {
    expect(regionLabels([])).toEqual([]);
  });
});

describe('branchesInRegions', () => {
  const branches = [
    branch(1, 'Toshkent HQ', { region: 'Toshkent' }),
    branch(2, 'Sirdaryo', { region: 'Sirdaryo' }),
    branch(3, 'Multi', { regions: ['Toshkent', 'Jizzax'] }),
  ];

  it('returns every branch when no region is selected', () => {
    expect(branchesInRegions(branches, [])).toEqual(branches);
  });

  it('filters to branches whose legacy region is in the selection', () => {
    expect(branchesInRegions(branches, ['Sirdaryo']).map((b) => b.id)).toEqual([2]);
  });

  it('matches a multi-region branch when ANY of its regions is selected (.some())', () => {
    expect(branchesInRegions(branches, ['Jizzax']).map((b) => b.id)).toEqual([3]);
    expect(branchesInRegions(branches, ['Toshkent']).map((b) => b.id)).toEqual([1, 3]);
  });

  it('unions across a multi-region selection', () => {
    expect(branchesInRegions(branches, ['Sirdaryo', 'Jizzax']).map((b) => b.id)).toEqual([2, 3]);
  });
});
