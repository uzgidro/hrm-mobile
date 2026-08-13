import { unwrapList } from '../response';

describe('unwrapList', () => {
  it('returns a bare array unchanged', () => {
    expect(unwrapList<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('unwraps the paginated { items } envelope', () => {
    expect(unwrapList<number>({ items: [1, 2] })).toEqual([1, 2]);
  });

  it('returns an empty array for null and undefined', () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
  });

  it('returns an empty array when items is missing or not set', () => {
    expect(unwrapList({})).toEqual([]);
    expect(unwrapList({ items: undefined })).toEqual([]);
  });

  it('preserves an empty list rather than treating it as absent', () => {
    expect(unwrapList<number>({ items: [] })).toEqual([]);
    expect(unwrapList<number>([])).toEqual([]);
  });
});
