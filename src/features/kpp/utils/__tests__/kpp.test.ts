import { groupVisitorsByDay, countPasses } from '../kpp';
import type { Visitor } from '@/types';

const v = (id: number, last_visit_time?: string, created_at?: string) =>
  ({ id, legal_name: `G${id}`, last_visit_time, created_at }) as unknown as Visitor;

describe('groupVisitorsByDay', () => {
  it("kun bo'yicha, yangisi birinchi, tashrifsizlar oxirida", () => {
    const groups = groupVisitorsByDay([
      v(1, '2026-09-29T10:00:00'),
      v(2),
      v(3, '2026-09-30T08:00:00'),
      v(4, undefined, '2026-09-28T09:00:00'),
      v(5, '2026-09-30T12:00:00'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-09-30', '2026-09-29', '2026-09-28', 'none']);
    expect(groups[0].items.map((x) => x.id)).toEqual([3, 5]);
    expect(groups[3].items.map((x) => x.id)).toEqual([2]);
  });

  it("bo'sh ro'yxat", () => expect(groupVisitorsByDay([])).toEqual([]));
});

describe('countPasses', () => {
  it('kirish/chiqish soni', () => {
    expect(
      countPasses([{ direction_type: 'entrance' }, { direction_type: 'exit' }, { direction_type: 'entrance' }, {}]),
    ).toEqual({ entered: 2, exited: 1 });
  });
});
