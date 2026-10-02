import { buildStaffBody, isPastDeadline, rowKey, validateStaff, type StaffForm } from '../staff';

const form = (p: Partial<StaffForm> = {}): StaffForm => ({
  departmentId: 4,
  positionId: 7,
  units: '1',
  note: '',
  reason: '',
  ...p,
});

describe('staff utils (v2 StaffPositionModal / StaffPositionsPage)', () => {
  it('virtual qator (id null) — barqaror manfiy kalit, haqiqiy qator — id', () => {
    expect(rowKey({ id: 12, department_id: 4, job_position_id: 7 }, 0)).toBe(12);
    expect(rowKey({ id: null, department_id: 4, job_position_id: 7 }, 2)).toBe(-(4 * 10000 + 7 + 2));
  });

  it("validatsiya: yaratishda bo'lim/lavozim majburiy, birlik ≥ 0 son", () => {
    expect(validateStaff(form({ departmentId: null }), false)).toBe('departmentRequired');
    expect(validateStaff(form({ positionId: null }), false)).toBe('positionRequired');
    expect(validateStaff(form({ units: '-1' }), false)).toBe('unitsInvalid');
    expect(validateStaff(form({ units: 'abc' }), false)).toBe('unitsInvalid');
    expect(validateStaff(form({ units: '' }), false)).toBe('unitsInvalid');
    expect(validateStaff(form({ units: '0.5' }), false)).toBeNull();
    expect(validateStaff(form({ units: '1,5' }), false)).toBeNull(); // vergul ham
    // Tahrirda juftlik o'zgarmaydi — bo'lim/lavozim tekshirilmaydi.
    expect(validateStaff(form({ departmentId: null, positionId: null }), true)).toBeNull();
  });

  it("tana: yaratishda juftlik bor, tahrirda yo'q; bo'sh matn → null", () => {
    expect(buildStaffBody(form({ units: '1,5', note: '  ' }), false)).toEqual({
      department_id: 4,
      job_position_id: 7,
      planned_units: 1.5,
      note: null,
      reason: null,
    });
    expect(buildStaffBody(form({ units: '2', reason: ' 15-buyruq ' }), true)).toEqual({
      planned_units: 2,
      note: null,
      reason: '15-buyruq',
    });
  });

  it("muddat o'tganmi — kun bo'yicha", () => {
    expect(isPastDeadline('2026-10-01', '2026-10-02')).toBe(true);
    expect(isPastDeadline('2026-10-02', '2026-10-02')).toBe(false);
    expect(isPastDeadline(null, '2026-10-02')).toBe(false);
  });
});
