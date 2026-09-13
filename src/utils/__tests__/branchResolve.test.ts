// Foydalanuvchi filialini aniqlash tartibi — shikoyat 2026-08-26 ning ildizi.
import { resolveEmployeeBranchId } from '../branch';

describe('resolveEmployeeBranchId', () => {
  it('asosiy filial (primary) birinchi o‘rinda turadi', () => {
    expect(
      resolveEmployeeBranchId({
        primary_organization_branch_id: 5,
        department: { id: 1, name: 'Bo‘lim', organization_branch_id: 1 },
        organization_branches: [{ id: 22, name: 'Boshqa' }],
      } as never),
    ).toBe(5);
  });

  it('primary yo‘q bo‘lsa BO‘LIM filialini oladi (M2M birinchisini EMAS)', () => {
    // Aynan shu holat buzilgan edi: rais bo'limi 1-filialda, M2M ning
    // birinchisi esa 22 — mobil 22-filial ro'yxatini so'rardi.
    expect(
      resolveEmployeeBranchId({
        department: { id: 1, name: 'Ijro apparati', organization_branch_id: 1 },
        organization_branches: [{ id: 22, name: "O'zsuvloyiha" }, { id: 25, name: 'Yana' }],
      } as never),
    ).toBe(1);
  });

  it('bo‘limi yo‘q hisob uchun M2M birinchisiga tushadi (ekran ishlab tursin)', () => {
    expect(
      resolveEmployeeBranchId({
        organization_branches: [{ id: 22, name: "O'zsuvloyiha" }],
      } as never),
    ).toBe(22);
  });

  it('xodim yo‘q yoki bo‘sh bo‘lsa undefined', () => {
    expect(resolveEmployeeBranchId(null)).toBeUndefined();
    expect(resolveEmployeeBranchId({} as never)).toBeUndefined();
  });
});
