import { selectSplitId } from '../splitView';

const items = [{ id: 10 }, { id: 20 }, { id: 30 }];

describe('selectSplitId', () => {
  it('selects the first row when entering split view with nothing selected', () => {
    expect(selectSplitId(items, null, true)).toBe(10);
  });

  it('keeps a still-valid selection', () => {
    expect(selectSplitId(items, 20, true)).toBe(20);
  });

  it('re-anchors to the first row when the selection is gone from the list', () => {
    expect(selectSplitId(items, 99, true)).toBe(10);
  });

  it('clears the selection when leaving split view', () => {
    expect(selectSplitId(items, 20, false)).toBe(null);
  });

  it('selects nothing when the list is empty', () => {
    expect(selectSplitId([], null, true)).toBe(null);
  });
});
