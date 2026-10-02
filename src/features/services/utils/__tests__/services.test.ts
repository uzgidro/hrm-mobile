import {
  TRANSITIONS,
  STATUS_CHAIN,
  buildCreateBody,
  canCancel,
  nextStates,
  validateCreate,
  validateTransition,
  type CreateForm,
} from '../services';

const form = (p: Partial<CreateForm> = {}): CreateForm => ({
  type: 'work_certificate',
  purpose: '',
  branchId: null,
  lastName: '',
  firstName: '',
  middleName: '',
  position: '',
  phone: '',
  note: '',
  ...p,
});

describe('services utils (v2 useServices / ServiceCreateModal / ServiceDetailModal)', () => {
  it("holat o'tishlari v2 bilan aynan; orqaga yo'l yo'q", () => {
    expect(nextStates('accepted')).toEqual(['in_review', 'rejected']);
    expect(nextStates('ready')).toEqual(['issued', 'rejected']);
    for (const s of ['issued', 'rejected', 'cancelled'] as const) expect(nextStates(s)).toEqual([]);
    // Zanjirdagi har holatdan faqat oldinga yoki rad etishga.
    STATUS_CHAIN.forEach((s, i) =>
      TRANSITIONS[s].forEach((to) => expect(to === 'rejected' || STATUS_CHAIN.indexOf(to) === i + 1).toBe(true)),
    );
  });

  it("noma'lum holat — o'tish yo'q", () => expect(nextStates('weird' as never)).toEqual([]));

  it("rad etishda sabab shart; qolgan o'tishlarda izoh ixtiyoriy", () => {
    expect(validateTransition('rejected', '  ')).toBe('rejectReasonRequired');
    expect(validateTransition('rejected', 'Hujjat yetarli emas')).toBeNull();
    expect(validateTransition('in_review', '')).toBeNull();
  });

  it("bekor qilish: faqat o'z so'rovim va faqat «qabul qilindi» holatida", () => {
    expect(canCancel({ status: 'accepted', employee_id: 7 }, 7)).toBe(true);
    expect(canCancel({ status: 'accepted', employee_id: 8 }, 7)).toBe(false);
    expect(canCancel({ status: 'in_review', employee_id: 7 }, 7)).toBe(false);
    expect(canCancel({ status: 'accepted', employee_id: 7 }, undefined)).toBe(false);
  });

  it('yaratish validatsiyasi: tur shart; nomzodlikda familiya shart', () => {
    expect(validateCreate(form({ type: '' }))).toBe('pickService');
    expect(validateCreate(form({ type: 'job_application', lastName: ' ' }))).toBe('lastNameRequired');
    expect(validateCreate(form({ type: 'job_application', lastName: 'Aliyev' }))).toBeNull();
    expect(validateCreate(form())).toBeNull();
  });

  it("tana: ma'lumotnomada payload/filial yo'q; nomzodlikda ikkalasi bor", () => {
    expect(buildCreateBody(form({ purpose: '  Bankka ', branchId: 3 }))).toEqual({
      service_type: 'work_certificate',
      purpose: 'Bankka',
      organization_branch_id: null,
      payload: null,
    });
    expect(
      buildCreateBody(form({ type: 'job_application', lastName: 'Aliyev', position: 'Muhandis', branchId: 3 })),
    ).toEqual({
      service_type: 'job_application',
      purpose: null,
      organization_branch_id: 3,
      payload: { last_name: 'Aliyev', first_name: '', middle_name: '', position: 'Muhandis', phone: '', note: '' },
    });
  });
});
