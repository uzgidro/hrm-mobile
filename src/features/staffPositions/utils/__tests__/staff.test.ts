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
  it("kalit: haqiqiy qator — id, virtual qator — juftlikdan; to'qnashmaydi", () => {
    expect(rowKey({ id: 12, department_id: 4, job_position_id: 7 })).toBe('12');
    const a = rowKey({ id: null, department_id: 4, job_position_id: 7 });
    // Avvalgi formula -(dept*10000 + pos + i) da (4,7,0) va (4,6,1) bir xil kalit berardi.
    const b = rowKey({ id: null, department_id: 4, job_position_id: 6 });
    const c = rowKey({ id: null, department_id: 0, job_position_id: 40007 });
    expect(new Set([a, b, c, rowKey({ id: 40007, department_id: 1, job_position_id: 1 })]).size).toBe(4);
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
