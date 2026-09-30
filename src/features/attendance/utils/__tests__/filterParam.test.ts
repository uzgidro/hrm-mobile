import { filterFromParam } from '../filterParam';

describe('filterFromParam — bosh sahifa tile filtri', () => {
  it.each([
    ['present', 'present'],
    ['late', 'late'],
    ['absent', 'absent'],
    ['all', null],
    [undefined, null],
    ['xyz', null],
    [['late', 'absent'], 'late'], // expo-router massiv bersa — birinchisi
  ])('%j → %j', (p, expected) => expect(filterFromParam(p as never)).toBe(expected));
});
