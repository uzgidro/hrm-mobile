import { groupVisitorsByDay, countPasses, kppBranchId } from '../kpp';
import type { User, Visitor } from '@/types';

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

describe('kppBranchId', () => {
  // REAL `/auth/me` (qa.kpp, 2026-10-05): employee null, filial multi_modal_user da.
  const kiosk = (ids: number[]) =>
    ({ id: 931116, type: 'kpp', employee: null, multi_modal_user: { role: 'kpp', organization_branch_ids: ids } }) as unknown as User;

  it("kiosk: yagona filiali; bir nechta bo'lsa — filialsiz (server o'zi toraytiradi)", () => {
    expect(kppBranchId(kiosk([1]))).toBe(1);
    expect(kppBranchId(kiosk([1, 4]))).toBeUndefined();
    expect(kppBranchId(kiosk([]))).toBeUndefined();
  });

  it("xodim — asosiy filiali; admin — o'z filiali; master — filialsiz", () => {
    const emp = {
      id: 1,
      type: 'employee',
      employee: { id: 2, legal_name: 'X', is_multi_org_user: true, multi_org_employee_role: 'kpp', primary_organization_branch_id: 6, organization_branches: [{ id: 8, name: 'B' }] },
    } as unknown as User;
    expect(kppBranchId(emp)).toBe(6);
    expect(kppBranchId({ id: 3, type: 'admin', employee: null, admin: { organization_branch_id: 4 } } as unknown as User)).toBe(4);
    expect(kppBranchId({ id: 4, type: 'master-admin', employee: null } as unknown as User)).toBeUndefined();
  });
});
