import {
  REGISTRATION_FILTERS,
  REG_PAGE_SIZE,
  buildApproveBody,
  claimText,
  genderKey,
  registrationParams,
  seedApproveForm,
  validateRejectReason,
  type RegistrationRow,
} from '../registrations';

const row = (x: Partial<RegistrationRow> = {}): RegistrationRow => ({
  id: 1,
  status: 'pending',
  is_uge_employee: false,
  ...x,
});

describe('registrations utils (v2 RegistrationsPage)', () => {
  it("«Barchasi» — holatsiz (server faqat uch holatni biladi), qidiruv bo'sh bo'lsa yo'q", () => {
    expect(REGISTRATION_FILTERS).toEqual(['pending', 'approved', 'rejected', 'all']);
    expect(registrationParams('pending', '', 1)).toEqual({ status: 'pending', page: 1, size: REG_PAGE_SIZE });
    expect(registrationParams('all', ' Ali ', 2)).toEqual({ search: 'Ali', page: 2, size: 25 });
  });

  it("da'vo: xodim — filial · bo'lim · lavozim, aks holda mehmon", () => {
    expect(claimText(row(), 'Mehmon')).toBe('Mehmon');
    expect(
      claimText(
        row({ is_uge_employee: true, claimed_branch_name: 'Chorvoq GES', claimed_job_position_name: 'Muhandis' }),
        'Mehmon',
      ),
    ).toBe('Chorvoq GES · Muhandis');
    expect(genderKey(1)).toBe('male');
    expect(genderKey(2)).toBe('female');
    expect(genderKey(null)).toBeNull();
  });

  it("tasdiqlash: arizadagi joy — boshlang'ich taklif; filial majburiy, bo'lim/lavozim ixtiyoriy", () => {
    const f = seedApproveForm(row({ claimed_branch_id: 2, claimed_department_id: 7, claimed_job_position_id: null }));
    expect(f).toEqual({ branchId: 2, departmentId: 7, positionId: null });
    expect(buildApproveBody(f)).toEqual({
      ok: true,
      body: { organization_branch_id: 2, department_id: 7, job_position_id: null },
    });
    expect(buildApproveBody({ ...f, branchId: null })).toEqual({ ok: false, error: 'registrations.errBranchRequired' });
  });

  it('rad etish sababi kamida 3 belgi (qirqilgan)', () => {
    expect(validateRejectReason('  ab ')).toEqual({ ok: false, error: 'registrations.errReasonRequired' });
    expect(validateRejectReason(' Hujjat xira ')).toEqual({ ok: true, reason: 'Hujjat xira' });
  });
});
