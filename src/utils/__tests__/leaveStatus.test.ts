import i18n from '@/i18n';
import {
  leaveStatusGroup,
  leaveStatusKind,
  isPendingCode,
  isApprovedCode,
  isRejectedCode,
  leaveTypeLabel,
  leaveRangeText,
} from '../leaveStatus';

describe('leaveStatusGroup', () => {
  it('groups the English and legacy Uzbek pending codes', () => {
    expect(leaveStatusGroup('pending')).toBe('pending');
    expect(leaveStatusGroup('yuborildi')).toBe('pending');
  });

  it('groups approved codes, including signed and the legacy Uzbek form', () => {
    expect(leaveStatusGroup('approved')).toBe('approved');
    expect(leaveStatusGroup('signed')).toBe('approved');
    expect(leaveStatusGroup('tasdiqlangan')).toBe('approved');
  });

  it('groups rejected codes, including the legacy Uzbek form', () => {
    expect(leaveStatusGroup('rejected')).toBe('rejected');
    expect(leaveStatusGroup('rad_etilgan')).toBe('rejected');
  });

  it('treats a missing status as pending (matches current screens)', () => {
    expect(leaveStatusGroup(undefined)).toBe('pending');
  });

  it('treats an unknown status as pending (matches current screens, which fall through to the pending branch)', () => {
    expect(leaveStatusGroup('something_new')).toBe('pending');
  });
});

describe('isPendingCode / isApprovedCode / isRejectedCode (exact membership, not the display fallback)', () => {
  it('isPendingCode is true only for pending/yuborildi, false for undefined and unknown', () => {
    expect(isPendingCode('pending')).toBe(true);
    expect(isPendingCode('yuborildi')).toBe(true);
    expect(isPendingCode('approved')).toBe(false);
    expect(isPendingCode('rejected')).toBe(false);
    expect(isPendingCode(undefined)).toBe(false);
    expect(isPendingCode('something_new')).toBe(false);
  });

  it('isApprovedCode is true only for approved/tasdiqlangan/signed', () => {
    expect(isApprovedCode('approved')).toBe(true);
    expect(isApprovedCode('tasdiqlangan')).toBe(true);
    expect(isApprovedCode('signed')).toBe(true);
    expect(isApprovedCode('pending')).toBe(false);
    expect(isApprovedCode(undefined)).toBe(false);
  });

  it('isRejectedCode is true only for rejected/rad_etilgan', () => {
    expect(isRejectedCode('rejected')).toBe(true);
    expect(isRejectedCode('rad_etilgan')).toBe(true);
    expect(isRejectedCode('pending')).toBe(false);
    expect(isRejectedCode(undefined)).toBe(false);
  });
});

describe('leaveStatusKind', () => {
  it('maps pending to the "pending" StatusKind', () => {
    expect(leaveStatusKind('pending')).toBe('pending');
    expect(leaveStatusKind('yuborildi')).toBe('pending');
    expect(leaveStatusKind(undefined)).toBe('pending');
  });

  it('maps approved (and its aliases) to the "success" StatusKind', () => {
    expect(leaveStatusKind('approved')).toBe('success');
    expect(leaveStatusKind('signed')).toBe('success');
    expect(leaveStatusKind('tasdiqlangan')).toBe('success');
  });

  it('maps rejected (and its alias) to the "error" StatusKind', () => {
    expect(leaveStatusKind('rejected')).toBe('error');
    expect(leaveStatusKind('rad_etilgan')).toBe('error');
  });
});

describe('leaveTypeLabel', () => {
  afterAll(() => i18n.changeLanguage('uz-Latn'));

  // QA: the Team screen printed the raw untranslated `type` value.
  it('localizes the preset value; dictionary/free text passes through', async () => {
    await i18n.changeLanguage('ru');
    expect(leaveTypeLabel(i18n.t, "Ta'til")).toBe('Отпуск');
    expect(leaveTypeLabel(i18n.t, 'Kasallik')).toBe('Больничный');
    expect(leaveTypeLabel(i18n.t, 'Oilaviy sabab (HR)')).toBe('Oilaviy sabab (HR)');
    await i18n.changeLanguage('uz-Latn');
    expect(leaveTypeLabel(i18n.t, "Ta'til")).toBe("Ta'til");
  });
});

describe('leaveRangeText', () => {
  // Server sanalari — Toshkent devor soati (offsetsiz), shuning uchun TZ'dan mustaqil.
  it('bir kun ichida — sana bir marta, ikki vaqt', () => {
    expect(leaveRangeText('2026-10-04T09:00:00', '2026-10-04T13:00:00', 'D.MM.YYYY')).toBe('4.10.2026, 09:00 – 13:00');
  });

  it('bir necha kun — tugash sanasi ham ko\'rsatiladi', () => {
    expect(leaveRangeText('2026-10-04T09:00:00', '2026-10-06T18:00:00', 'D.MM.YYYY')).toBe(
      '4.10.2026, 09:00 – 6.10.2026, 18:00',
    );
  });

  it('tugash yo\'q — faqat boshlanish', () => {
    expect(leaveRangeText('2026-10-04T09:00:00', null, 'D.MM.YYYY')).toBe('4.10.2026, 09:00');
  });
});
