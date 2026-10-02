import { buildWorkPlanBody, isPlanOverdue, validateWorkPlan, type WorkPlanForm } from '../workPlan';

const base: WorkPlanForm = {
  title: 'Choraklik reja',
  description: '',
  employeeId: 7,
  departmentId: null,
  period: 'quarter',
  start: '2026-10-01',
  end: '2026-12-31',
  plannedResult: '',
  weight: '',
  status: 'planned',
};

describe('workPlan utils (v2 WorkPlanPage form)', () => {
  it('validatsiya tartibi: nom → sanalar → oraliq → maqsad', () => {
    expect(validateWorkPlan({ ...base, title: ' ' })).toBe('titleRequired');
    expect(validateWorkPlan({ ...base, start: '' })).toBe('datesRequired');
    expect(validateWorkPlan({ ...base, end: '' })).toBe('datesRequired');
    expect(validateWorkPlan({ ...base, start: '2026-12-31', end: '2026-10-01' })).toBe('invalidRange');
    // Xodim ham, bo'lim ham yo'q reja hech kimning ro'yxatida chiqmasdi.
    expect(validateWorkPlan({ ...base, employeeId: null, departmentId: null })).toBe('targetRequired');
    expect(validateWorkPlan({ ...base, employeeId: null, departmentId: 3 })).toBeNull();
    expect(validateWorkPlan(base)).toBeNull();
  });

  it("vazn: bo'sh — null; son bo'lmasa xato", () => {
    expect(validateWorkPlan({ ...base, weight: 'abc' })).toBe('weightInvalid');
    expect(validateWorkPlan({ ...base, weight: '-5' })).toBe('weightInvalid');
    expect(validateWorkPlan({ ...base, weight: '30' })).toBeNull();
  });

  it("tana: bo'sh matn null; vazn son; filial uzatiladi", () => {
    expect(buildWorkPlanBody({ ...base, title: '  Reja ', weight: '30', plannedResult: ' 5 ta hisobot ' }, 2)).toEqual({
      title: 'Reja',
      description: null,
      employee_id: 7,
      department_id: null,
      organization_branch_id: 2,
      period_type: 'quarter',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      planned_result: '5 ta hisobot',
      weight: 30,
      status: 'planned',
    });
    expect(buildWorkPlanBody(base, undefined).organization_branch_id).toBeNull();
    expect(buildWorkPlanBody({ ...base, weight: '' }, 1).weight).toBeNull();
  });

  it("KPI ko'rsatkichi tanasiga kirmaydi (mobil'da tahrirlanmaydi — serverdagisi saqlanadi)", () => {
    expect('kpi_indicator_id' in buildWorkPlanBody(base, 1)).toBe(false);
  });

  it("muddati o'tgan: tugash sanasi bugundan oldin va holat yakunlanmagan", () => {
    expect(isPlanOverdue({ end_date: '2026-10-01', status: 'in_progress' }, '2026-10-02')).toBe(true);
    expect(isPlanOverdue({ end_date: '2026-10-02', status: 'planned' }, '2026-10-02')).toBe(false);
    expect(isPlanOverdue({ end_date: '2026-10-01', status: 'done' }, '2026-10-02')).toBe(false);
    expect(isPlanOverdue({ end_date: '2026-10-01', status: 'cancelled' }, '2026-10-02')).toBe(false);
    expect(isPlanOverdue({ end_date: null, status: 'planned' }, '2026-10-02')).toBe(false);
  });
});
