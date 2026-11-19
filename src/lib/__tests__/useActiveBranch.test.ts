// 2026-10-07: «tizim administrator akkauntdan kirsa qotish — barcha filial ma'lumoti yuklanmoqda;
// multi-filial xodimlarda filial tanlash imkoniyati yo'q».
import { resolveActiveBranch } from '../useActiveBranch';

const branches = [
  { id: 7, name: 'Chorvoq GES' },
  { id: 1, name: "\"O'zbekgidroenergo\" AJ" },
  { id: 29, name: 'Binolardan foydalanish direksiyasi' },
];
const none = { userId: null, selected: undefined };

describe('faol filial', () => {
  it("master-admin: tanlanmagan — BOSH filial («Barcha filiallar» emas, qotish yo'q)", () => {
    const admin = { id: 5, type: 'master-admin', employee: null } as never;
    expect(resolveActiveBranch(admin, none, branches)).toBe(1);
    expect(resolveActiveBranch(admin, { userId: 5, selected: 29 }, branches)).toBe(29);
    expect(resolveActiveBranch(admin, { userId: 5, selected: null }, branches)).toBeUndefined(); // «Barcha»
  });

  it("ko'p filialli xodim: faqat o'z filiallari orasidan; begona tanlov e'tiborsiz", () => {
    const emp = {
      id: 9,
      type: 'employee',
      employee: { id: 90, primary_organization_branch_id: 29, department: { organization_branch_id: 29 }, organization_branches: [{ id: 29 }, { id: 1 }] },
    } as never;
    expect(resolveActiveBranch(emp, none, branches)).toBe(29);
    expect(resolveActiveBranch(emp, { userId: 9, selected: 1 }, branches)).toBe(1);
    expect(resolveActiveBranch(emp, { userId: 9, selected: 7 }, branches)).toBe(29); // ruxsat yo'q
    expect(resolveActiveBranch(emp, { userId: 9, selected: null }, branches)).toBe(29); // «Barcha» huquqi yo'q
  });

  it("boshqa hisobning saqlangan tanlovi yangi foydalanuvchiga o'tmaydi", () => {
    const admin = { id: 6, type: 'master-admin', employee: null } as never;
    expect(resolveActiveBranch(admin, { userId: 5, selected: 29 }, branches)).toBe(1);
  });
});
