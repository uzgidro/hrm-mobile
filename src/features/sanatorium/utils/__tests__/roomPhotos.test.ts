import type { RoomPhoto } from '../../types';
import { coverFirst, downscaleAction, movedIds } from '../roomPhotos';

const photo = (id: number): RoomPhoto => ({ id, url: '', thumb_url: '', width: 1, height: 1, sort_order: id });
const list = [1, 2, 3, 4].map(photo);

describe('downscaleAction', () => {
  it('leaves small pictures alone', () => {
    expect(downscaleAction(1600, 1200)).toEqual([]);
    expect(downscaleAction(0, 0)).toEqual([]);
  });
  it('shrinks the long side to 2000 px', () => {
    expect(downscaleAction(4000, 3000)).toEqual([{ resize: { width: 2000 } }]);
    expect(downscaleAction(3000, 4000)).toEqual([{ resize: { height: 2000 } }]);
  });
});

describe('photo order', () => {
  it('moves a photo by one place and clamps at the ends', () => {
    expect(movedIds(list, 2, -1)).toEqual([2, 1, 3, 4]);
    expect(movedIds(list, 3, 1)).toEqual([1, 2, 4, 3]);
    expect(movedIds(list, 1, -1)).toEqual([1, 2, 3, 4]);
    expect(movedIds(list, 4, 1)).toEqual([1, 2, 3, 4]);
  });
  it('makes a photo the cover', () => {
    expect(coverFirst(list, 3)).toEqual([3, 1, 2, 4]);
  });
  it('ignores an unknown id', () => {
    expect(movedIds(list, 99, 1)).toEqual([1, 2, 3, 4]);
  });
});
