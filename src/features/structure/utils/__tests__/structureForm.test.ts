import {
  buildDepartmentBody,
  buildPositionBody,
  deptFormFrom,
  posFormFrom,
  validateStructure,
  type DeptForm,
} from '../structureForm';

const dept = (p: Partial<DeptForm> = {}): DeptForm => ({ ...deptFormFrom(null, 1), name: "Kadrlar bo'limi", ...p });

describe('structureForm (v2 StructureModal.submit aynan)', () => {
  it('validatsiya: nom, filial, raqam', () => {
    expect(validateStructure({ name: ' ', branchId: 1, num: '' })).toBe('nameRequired');
    expect(validateStructure({ name: 'A', branchId: null, num: '' })).toBe('branchRequired');
    expect(validateStructure({ name: 'A', branchId: 1, num: '1a' })).toBe('numberInvalid');
    expect(validateStructure({ name: 'A', branchId: 1, num: '' })).toBeNull();
    expect(validateStructure({ name: 'A', branchId: 1, num: '12' })).toBeNull();
  });

  it("yangi bo'lim: bo'sh indeks/kod → null, change_reason YUBORILMAYDI", () => {
    expect(buildDepartmentBody(dept({ headIds: [9], secretariat: true }), false)).toEqual({
      name: "Kadrlar bo'limi",
      organization_branch_id: 1,
      index: null,
      head_ids: [9],
      is_secretariat: true,
      is_ijro_manager: false,
      code: null,
    });
  });

  it("tahrir: indeks raqam, kod trim, change_reason bor (bo'sh → null)", () => {
    const body = buildDepartmentBody(dept({ name: '  Moliya ', index: '4', code: ' 04 ', changeReason: '' }), true);
    expect(body).toMatchObject({ name: 'Moliya', index: 4, code: '04', change_reason: null });
    expect(buildDepartmentBody(dept({ changeReason: ' 12-buyruq ' }), true).change_reason).toBe('12-buyruq');
  });

  it('lavozim: razryad, toifa (bo\'sh → null)', () => {
    expect(buildPositionBody({ ...posFormFrom(null, 2), name: 'Muhandis', razryad: '9', category: 'mutaxassis' })).toEqual({
      name: 'Muhandis',
      organization_branch_id: 2,
      razryad: 9,
      category: 'mutaxassis',
    });
    expect(buildPositionBody({ ...posFormFrom(null, 2), name: 'X' })).toEqual({
      name: 'X',
      organization_branch_id: 2,
      razryad: null,
      category: null,
    });
  });

  it("formani mavjud qatordan to'ldirish", () => {
    const f = deptFormFrom(
      { id: 4, name: 'K', index: 3, code: '03', organization_branch_id: 5, heads: [{ id: 9 }], is_ijro_manager: true },
      1,
    );
    expect(f).toMatchObject({ name: 'K', index: '3', code: '03', branchId: 5, headIds: [9], ijro: true, secretariat: false });
    expect(posFormFrom({ id: 7, name: 'P', razryad: 12, category: 'rahbar', organization_branch_id: 3 }, 1)).toEqual({
      name: 'P',
      razryad: '12',
      branchId: 3,
      category: 'rahbar',
    });
  });
});
