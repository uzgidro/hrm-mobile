import { REGISTRATION_STATUSES, registrationStatusTone } from '../registrationStatus';

describe('registrationStatus (v2 STATUS_TONE)', () => {
  it("kutilmoqda — sariq, tasdiqlangan — yashil, rad — qizil; noma'lum — neytral", () => {
    expect(REGISTRATION_STATUSES).toEqual(['pending', 'approved', 'rejected']);
    expect(registrationStatusTone('pending')).toBe('warning');
    expect(registrationStatusTone('approved')).toBe('success');
    expect(registrationStatusTone('rejected')).toBe('danger');
    expect(registrationStatusTone('archived')).toBe('neutral');
    expect(registrationStatusTone(null)).toBe('neutral');
  });
});
