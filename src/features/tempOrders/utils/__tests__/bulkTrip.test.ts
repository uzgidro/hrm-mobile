import { buildBulkTripBody, buildCreateBody, type TempOrderForm } from '../tempOrder';
import { canAccessPage } from '@/utils/roles';

const form = (extra: Partial<TempOrderForm>): TempOrderForm => ({
  employeeId: 5,
  type: 'xizmat_safari',
  start: '2026-10-06',
  end: '2026-10-08',
  startTime: '09:00',
  endTime: '13:00',
  note: '',
  ...extra,
});

describe('xizmat safari manzili (2026-10-06)', () => {
  it('manzil faqat xizmat_safari da yuboriladi (aks holda server 400 destination_only_for_trip)', () => {
    expect(buildCreateBody(form({ destinationBranchId: 9 }))).toMatchObject({ destination_branch_id: 9 });
    expect(buildCreateBody(form({ type: 'kasal', destinationBranchId: 9 }))).not.toHaveProperty('destination_branch_id');
    expect(buildCreateBody(form({}))).not.toHaveProperty('destination_branch_id');
  });

  it('ommaviy tana: bo\'sh izoh/manzil yuborilmaydi (strict body)', () => {
    expect(buildBulkTripBody({ employeeIds: [1, 2], start: '2026-10-06', end: '2026-10-07', note: '  ', destinationBranchId: null })).toEqual({
      employee_ids: [1, 2],
      start_date: '2026-10-06',
      end_date: '2026-10-07',
    });
    expect(
      buildBulkTripBody({ employeeIds: [3], start: '2026-10-06', end: '2026-10-06', note: ' GES ', destinationBranchId: 9 }),
    ).toEqual({ employee_ids: [3], start_date: '2026-10-06', end_date: '2026-10-06', note: 'GES', destination_branch_id: 9 });
  });
});

describe("«Mobil belgilar» moduli (v2 mobileCheckins, ADMIN_HR)", () => {
  const hr = { id: 1, type: 'employee', employee: { id: 5, is_multi_org_user: true, multi_org_employee_role: 'hr' } };
  const emp = { id: 2, type: 'employee', employee: { id: 6 } };
  const master = { id: 3, type: 'master-admin' };
  it('kadr va bosh admin ko\'radi, oddiy xodim yo\'q', () => {
    expect(canAccessPage(hr as never, 'mobileCheckins', {})).toBe(true);
    expect(canAccessPage(master as never, 'mobileCheckins', {})).toBe(true);
    expect(canAccessPage(emp as never, 'mobileCheckins', {})).toBe(false);
  });
  it('bosh admin sozlamasi (nav.modules) o\'chirsa — hech kimga', () => {
    expect(canAccessPage(hr as never, 'mobileCheckins', { mobileCheckins: { enabled: false } })).toBe(false);
  });
});
