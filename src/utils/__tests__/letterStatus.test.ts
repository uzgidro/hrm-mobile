import {
  LETTER_TYPE_LABELS,
  letterTypeLabel,
  normalizeLetterType,
  getMainSigner,
  getOrdinarySigners,
  getManagementSigners,
  hasSigned,
  hasRejected,
  isLetterRejected,
  isLetterSigned,
  getAssignedRecord,
  canSignLetter,
  getSigningTimeline,
  letterStatusMeta,
  statusColor,
  isNewTripFlow,
  canSubmitReport,
  canResetReport,
  isReportReturned,
} from '../letterStatus';
import { statusColor as orderStatusColor } from '../orderStatus';
import type { Letter } from '../../types';

const letter = (l: Partial<Letter>): Letter => ({ id: 1, ...l }) as Letter;

describe('re-export', () => {
  it('re-exports statusColor from orderStatus', () => {
    expect(statusColor).toBe(orderStatusColor);
  });
});

describe('LETTER_TYPE_LABELS', () => {
  // Post-i18n: the map holds translation-key paths (labels are resolved via
  // i18n.t() at call time in letterTypeLabel). The letter-type CODES (Record
  // keys) stay as backend contract identifiers; only labels are localized.
  it('locks in the type → labelKey map', () => {
    expect(LETTER_TYPE_LABELS).toEqual({
      bildirgi: 'status.letterTypeNotification',
      explanotary: 'status.letterTypeNotification',
      explanatory: 'status.letterTypeNotification',
      notification: 'status.letterTypeNotification',
      application: 'status.letterTypeApplication',
      business_trip: 'status.letterTypeBusinessTrip',
    });
  });
});

describe('letterTypeLabel', () => {
  it('maps every known type', () => {
    expect(letterTypeLabel('bildirgi')).toBe('Bildirgi');
    expect(letterTypeLabel('explanotary')).toBe('Bildirgi');
    expect(letterTypeLabel('explanatory')).toBe('Bildirgi');
    expect(letterTypeLabel('notification')).toBe('Bildirgi');
    expect(letterTypeLabel('application')).toBe('Ariza');
    expect(letterTypeLabel('business_trip')).toBe('Xizmat safari');
  });
  it('returns the raw type for unknown values', () => {
    expect(letterTypeLabel('foo')).toBe('foo');
  });
  it('returns "Xat" for undefined / empty', () => {
    expect(letterTypeLabel(undefined)).toBe('Xat');
    expect(letterTypeLabel('')).toBe('Xat');
  });
});

describe('normalizeLetterType', () => {
  it('collapses all bildirgi-like types to explanatory', () => {
    expect(normalizeLetterType('bildirgi')).toBe('explanatory');
    expect(normalizeLetterType('explanotary')).toBe('explanatory');
    expect(normalizeLetterType('explanatory')).toBe('explanatory');
    expect(normalizeLetterType('notification')).toBe('explanatory');
  });
  it('keeps application and business_trip', () => {
    expect(normalizeLetterType('application')).toBe('application');
    expect(normalizeLetterType('business_trip')).toBe('business_trip');
  });
  it('returns raw type for unknown and "" for nullish', () => {
    expect(normalizeLetterType('foo')).toBe('foo');
    expect(normalizeLetterType(undefined)).toBe('');
    expect(normalizeLetterType('')).toBe('');
  });
});

describe('signer selectors', () => {
  const l = letter({
    assigned_signers: [
      { signer_type: 'main', employee_id: 1 },
      { signer_type: 'ordinary', employee_id: 2 },
      { signer_type: 'ordinary', employee_id: 3 },
      { signer_type: 'management', employee_id: 4 },
    ],
  });
  it('getMainSigner finds the main signer', () => {
    expect(getMainSigner(l)).toEqual({ signer_type: 'main', employee_id: 1 });
  });
  it('getMainSigner returns undefined when none', () => {
    expect(getMainSigner(letter({ assigned_signers: [] }))).toBeUndefined();
    expect(getMainSigner(letter({}))).toBeUndefined();
  });
  it('getOrdinarySigners returns all ordinary', () => {
    expect(getOrdinarySigners(l)).toHaveLength(2);
  });
  it('getManagementSigners returns all management', () => {
    expect(getManagementSigners(l)).toEqual([{ signer_type: 'management', employee_id: 4 }]);
  });
  it('selectors default to empty array on missing assigned_signers', () => {
    expect(getOrdinarySigners(letter({}))).toEqual([]);
    expect(getManagementSigners(letter({}))).toEqual([]);
  });
});

describe('hasSigned', () => {
  it('returns false without employeeId', () => {
    expect(hasSigned(letter({ signers: [{ employee_id: 1 }] }))).toBe(false);
    expect(hasSigned(letter({ signers: [{ employee_id: 1 }] }), 0)).toBe(false);
    expect(hasSigned(letter({ signers: [{ employee_id: 1 }] }), null)).toBe(false);
  });
  it('matches by employee_id', () => {
    expect(hasSigned(letter({ signers: [{ employee_id: 5 }] }), 5)).toBe(true);
  });
  it('matches by nested employee.id', () => {
    expect(hasSigned(letter({ signers: [{ employee: { id: 5, legal_name: 'x' } as any }] }), 5)).toBe(true);
  });
  it('returns false when nobody matches', () => {
    expect(hasSigned(letter({ signers: [{ employee_id: 5 }] }), 6)).toBe(false);
    expect(hasSigned(letter({}), 6)).toBe(false);
  });
});

describe('hasRejected', () => {
  it('returns false without employeeId', () => {
    expect(hasRejected(letter({ reject_by_id: 5 }))).toBe(false);
  });
  it('matches reject_by_id', () => {
    expect(hasRejected(letter({ reject_by_id: 5 }), 5)).toBe(true);
  });
  it('matches rejected_by.id', () => {
    expect(hasRejected(letter({ rejected_by: { id: 5, legal_name: 'x' } as any }), 5)).toBe(true);
  });
  it('returns false when no match', () => {
    expect(hasRejected(letter({ reject_by_id: 5 }), 6)).toBe(false);
    expect(hasRejected(letter({}), 6)).toBe(false);
  });
});

describe('isLetterRejected', () => {
  it('application: true when status rejected', () => {
    expect(isLetterRejected(letter({ letter_type: 'application', status: 'rejected' }))).toBe(true);
  });
  it('application: true when rejected_by or reject_by_id set', () => {
    expect(isLetterRejected(letter({ letter_type: 'application', reject_by_id: 9 }))).toBe(true);
    expect(
      isLetterRejected(letter({ letter_type: 'application', rejected_by: { id: 9, legal_name: 'x' } as any })),
    ).toBe(true);
  });
  it('application: false when nothing indicates rejection', () => {
    expect(isLetterRejected(letter({ letter_type: 'application', status: 'pending' }))).toBe(false);
  });
  it('bildirgi: uses main-signer rejection', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      reject_by_id: 1,
    });
    expect(isLetterRejected(l)).toBe(true);
  });
  it('bildirgi: false when rejection is by a non-main signer', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      reject_by_id: 99,
    });
    expect(isLetterRejected(l)).toBe(false);
  });
  it('bildirgi: false when there is no main signer', () => {
    expect(isLetterRejected(letter({ letter_type: 'bildirgi', reject_by_id: 1 }))).toBe(false);
  });
});

describe('isLetterSigned', () => {
  it('false when rejected', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      reject_by_id: 1,
      signers: [{ employee_id: 1 }],
    });
    expect(isLetterSigned(l)).toBe(false);
  });
  it('false when no assigned signers', () => {
    expect(isLetterSigned(letter({ letter_type: 'bildirgi', assigned_signers: [] }))).toBe(false);
  });
  it('application: true only when every assigned signer signed', () => {
    const base = {
      letter_type: 'application',
      assigned_signers: [
        { signer_type: 'ordinary', employee_id: 1 },
        { signer_type: 'main', employee_id: 2 },
      ],
    };
    expect(isLetterSigned(letter({ ...base, signers: [{ employee_id: 1 }] }))).toBe(false);
    expect(
      isLetterSigned(letter({ ...base, signers: [{ employee_id: 1 }, { employee_id: 2 }] })),
    ).toBe(true);
  });
  it('bildirgi: true when the main signer signed', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [
        { signer_type: 'ordinary', employee_id: 1 },
        { signer_type: 'main', employee_id: 2 },
      ],
      signers: [{ employee_id: 2 }],
    });
    expect(isLetterSigned(l)).toBe(true);
  });
  it('bildirgi: false when only an ordinary signer signed', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [
        { signer_type: 'ordinary', employee_id: 1 },
        { signer_type: 'main', employee_id: 2 },
      ],
      signers: [{ employee_id: 1 }],
    });
    expect(isLetterSigned(l)).toBe(false);
  });
  it('bildirgi: false when there is no main signer', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'ordinary', employee_id: 1 }],
      signers: [{ employee_id: 1 }],
    });
    expect(isLetterSigned(l)).toBe(false);
  });
});

describe('getAssignedRecord', () => {
  const l = letter({ assigned_signers: [{ signer_type: 'main', employee_id: 1 }] });
  it('returns null without employeeId', () => {
    expect(getAssignedRecord(l)).toBeNull();
  });
  it('returns the matching signer', () => {
    expect(getAssignedRecord(l, 1)).toEqual({ signer_type: 'main', employee_id: 1 });
  });
  it('returns null when not assigned', () => {
    expect(getAssignedRecord(l, 2)).toBeNull();
  });
});

describe('canSignLetter', () => {
  it('false without employeeId', () => {
    expect(canSignLetter(letter({}))).toBe(false);
  });
  it('false when letter is rejected', () => {
    const l = letter({
      letter_type: 'application',
      status: 'rejected',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
    });
    expect(canSignLetter(l, 1)).toBe(false);
  });
  it('false when employee is not assigned', () => {
    const l = letter({ letter_type: 'bildirgi', assigned_signers: [{ signer_type: 'main', employee_id: 1 }] });
    expect(canSignLetter(l, 2)).toBe(false);
  });
  it('false when employee already signed', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      signers: [{ employee_id: 1 }],
    });
    expect(canSignLetter(l, 1)).toBe(false);
  });

  describe('business_trip', () => {
    it('management can sign only when management_review', () => {
      const base = {
        letter_type: 'business_trip',
        assigned_signers: [{ signer_type: 'management', employee_id: 1 }],
      };
      expect(canSignLetter(letter({ ...base, status: 'management_review' }), 1)).toBe(true);
      expect(canSignLetter(letter({ ...base, status: 'pending' }), 1)).toBe(false);
    });
    it('main can sign only when status pending', () => {
      const base = {
        letter_type: 'business_trip',
        assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      };
      expect(canSignLetter(letter({ ...base, status: 'pending' }), 1)).toBe(true);
      expect(canSignLetter(letter({ ...base, status: 'management_review' }), 1)).toBe(false);
    });
    it('other signer types can never sign a trip', () => {
      const l = letter({
        letter_type: 'business_trip',
        status: 'pending',
        assigned_signers: [{ signer_type: 'ordinary', employee_id: 1 }],
      });
      expect(canSignLetter(l, 1)).toBe(false);
    });
  });

  describe('application', () => {
    it('any assigned, not-yet-signed signer can sign', () => {
      const l = letter({
        letter_type: 'application',
        status: 'pending',
        assigned_signers: [{ signer_type: 'ordinary', employee_id: 1 }],
      });
      expect(canSignLetter(l, 1)).toBe(true);
    });
  });

  describe('bildirgi', () => {
    it('only the main signer can sign', () => {
      const main = letter({
        letter_type: 'bildirgi',
        assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      });
      expect(canSignLetter(main, 1)).toBe(true);
      const ordinary = letter({
        letter_type: 'bildirgi',
        assigned_signers: [{ signer_type: 'ordinary', employee_id: 1 }],
      });
      expect(canSignLetter(ordinary, 1)).toBe(false);
    });
  });
});

describe('getSigningTimeline', () => {
  it('builds ordinary-then-main timeline for a bildirgi', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [
        { signer_type: 'ordinary', employee_id: 2, employee: { legal_name: 'Ord', job_position: { id: 1, name: 'Pos' } } as any },
        { signer_type: 'main', employee_id: 1, employee: { legal_name: 'Main' } as any },
      ],
      signers: [{ employee_id: 1 }],
    });
    const t = getSigningTimeline(l);
    expect(t).toEqual([
      { key: 'ordinary-2', name: 'Ord', role: 'Pos', status: 'pending', statusText: 'Kutilmoqda' },
      { key: 'main-1', name: 'Main', role: 'Imzolovchi', status: 'signed', statusText: 'Imzoladi' },
    ]);
  });

  it('uses "Roziman" for an ordinary signer on a bildirgi and "Imzoladi" on an ariza', () => {
    const build = (letter_type: string) =>
      getSigningTimeline(
        letter({
          letter_type,
          assigned_signers: [{ signer_type: 'ordinary', employee_id: 2, employee: { legal_name: 'Ord' } as any }],
          signers: [{ employee_id: 2 }],
        }),
      )[0];
    expect(build('bildirgi').statusText).toBe('Roziman');
    expect(build('application').statusText).toBe('Imzoladi');
  });

  it('marks rejected signers', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1, employee: { legal_name: 'Main' } as any }],
      reject_by_id: 1,
    });
    const t = getSigningTimeline(l);
    expect(t[0]).toMatchObject({ status: 'rejected', statusText: 'Rad etdi' });
  });

  it('falls back to "Noma\'lum" name and the fallback role', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
    });
    expect(getSigningTimeline(l)[0]).toMatchObject({ name: "Noma'lum", role: 'Imzolovchi' });
  });

  it('builds management-then-main timeline for a business trip', () => {
    const l = letter({
      letter_type: 'business_trip',
      assigned_signers: [
        { signer_type: 'management', employee_id: 3, employee: { legal_name: 'Mgr' } as any },
        { signer_type: 'main', employee_id: 1, employee: { legal_name: 'Boss' } as any },
      ],
    });
    const t = getSigningTimeline(l);
    expect(t).toEqual([
      { key: 'management-3', name: 'Mgr', role: 'Rahbariyat', status: 'pending', statusText: 'Kutilmoqda' },
      { key: 'main-1', name: 'Boss', role: "Boshlig'i", status: 'pending', statusText: 'Kutilmoqda' },
    ]);
  });
});

describe('letterStatusMeta', () => {
  it('rejected wins', () => {
    const l = letter({
      letter_type: 'application',
      status: 'rejected',
    });
    expect(letterStatusMeta(l)).toEqual({ label: 'Rad etildi', kind: 'error' });
  });
  it('stamped / registered -> registered success', () => {
    expect(letterStatusMeta(letter({ is_stamped: true }))).toEqual({ label: "Ro'yxatga olingan", kind: 'success' });
    expect(letterStatusMeta(letter({ status: 'registered' }))).toEqual({ label: "Ro'yxatga olingan", kind: 'success' });
    expect(letterStatusMeta(letter({ status: 'stamped' }))).toEqual({ label: "Ro'yxatga olingan", kind: 'success' });
  });
  it('signed letter -> Imzolangan success', () => {
    const l = letter({
      letter_type: 'bildirgi',
      assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      signers: [{ employee_id: 1 }],
    });
    expect(letterStatusMeta(l)).toEqual({ label: 'Imzolangan', kind: 'success' });
  });
  it('review -> Devonxonada info', () => {
    expect(letterStatusMeta(letter({ status: 'review' }))).toEqual({ label: 'Devonxonada', kind: 'info' });
  });
  it('management_review -> Rahbariyatda pending', () => {
    expect(letterStatusMeta(letter({ status: 'management_review' }))).toEqual({ label: 'Rahbariyatda', kind: 'pending' });
  });
  it('default -> Kutilmoqda pending', () => {
    expect(letterStatusMeta(letter({ status: 'whatever' }))).toEqual({ label: 'Kutilmoqda', kind: 'pending' });
    expect(letterStatusMeta(letter({}))).toEqual({ label: 'Kutilmoqda', kind: 'pending' });
  });

  // Report-stage statuses (business_trip, OLD flow). These come AFTER registration
  // (is_stamped becomes true), so they must be checked BEFORE the is_stamped→
  // registered fallthrough — otherwise a report_submitted trip reads "registered".
  it('report statuses win over is_stamped and resolve to distinct kinds', () => {
    expect(letterStatusMeta(letter({ status: 'management_approved', is_stamped: true })).kind).toBe('pending');
    expect(letterStatusMeta(letter({ status: 'report_submitted', is_stamped: true })).kind).toBe('info');
    expect(letterStatusMeta(letter({ status: 'report_returned', is_stamped: true })).kind).toBe('error');
    expect(letterStatusMeta(letter({ status: 'report_management_review', is_stamped: true })).kind).toBe('pending');
    expect(letterStatusMeta(letter({ status: 'report_approved', is_stamped: true })).kind).toBe('success');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isNewTripFlow — flow_version 2 = NEW (main branch, NO report stage);
// 1 / null / undefined = OLD (report stage exists). Mirrors backend
// _is_new_trip_flow.
// ─────────────────────────────────────────────────────────────────────────────
describe('isNewTripFlow', () => {
  it('true only for flow_version === 2', () => {
    expect(isNewTripFlow(letter({ flow_version: 2 }))).toBe(true);
  });
  it('false for old flow (1) and unset (null/undefined)', () => {
    expect(isNewTripFlow(letter({ flow_version: 1 }))).toBe(false);
    expect(isNewTripFlow(letter({ flow_version: null }))).toBe(false);
    expect(isNewTripFlow(letter({}))).toBe(false);
  });
});

// ── Report submission gate (web helpers.js:640 parity) ────────────────────────
const trip = (o: Partial<Letter> = {}): Letter =>
  letter({ letter_type: 'business_trip', creator_employee_id: 10, ...o });
const ME = 10;

describe('canSubmitReport', () => {
  it('true for the creator on a confirmed management_approved trip', () => {
    expect(canSubmitReport(trip({ status: 'management_approved', is_trip_confirmed: true }), ME)).toBe(true);
  });
  it('true for the submitter (not creator)', () => {
    expect(
      canSubmitReport(
        trip({ status: 'management_approved', is_trip_confirmed: true, creator_employee_id: 999, submitter_id: ME }),
        ME
      )
    ).toBe(true);
  });
  it('true while report_submitted (edit) and report_returned (resubmit)', () => {
    expect(canSubmitReport(trip({ status: 'report_submitted' }), ME)).toBe(true);
    expect(canSubmitReport(trip({ status: 'report_returned' }), ME)).toBe(true);
  });
  it('FALSE on management_approved when arrival is not confirmed', () => {
    expect(canSubmitReport(trip({ status: 'management_approved', is_trip_confirmed: false }), ME)).toBe(false);
    expect(canSubmitReport(trip({ status: 'management_approved' }), ME)).toBe(false);
  });
  it('false for the new flow (flow_version 2)', () => {
    expect(
      canSubmitReport(trip({ status: 'management_approved', is_trip_confirmed: true, flow_version: 2 }), ME)
    ).toBe(false);
  });
  it('false for a non-author, past-stage statuses, non-trips and unknown me', () => {
    expect(canSubmitReport(trip({ status: 'report_submitted', creator_employee_id: 999 }), ME)).toBe(false);
    expect(canSubmitReport(trip({ status: 'report_management_review' }), ME)).toBe(false);
    expect(canSubmitReport(trip({ status: 'report_approved' }), ME)).toBe(false);
    expect(canSubmitReport(letter({ letter_type: 'application', status: 'report_submitted' }), ME)).toBe(false);
    expect(canSubmitReport(trip({ status: 'report_submitted' }), undefined)).toBe(false);
  });
});

describe('canResetReport', () => {
  it('true for the author while report_submitted only', () => {
    expect(canResetReport(trip({ status: 'report_submitted' }), ME)).toBe(true);
  });
  it('false otherwise', () => {
    expect(canResetReport(trip({ status: 'report_returned' }), ME)).toBe(false);
    expect(canResetReport(trip({ status: 'management_approved' }), ME)).toBe(false);
    expect(canResetReport(trip({ status: 'report_submitted', creator_employee_id: 999 }), ME)).toBe(false);
  });
});

describe('isReportReturned', () => {
  it('true only for report_returned', () => {
    expect(isReportReturned(trip({ status: 'report_returned' }))).toBe(true);
    expect(isReportReturned(trip({ status: 'report_submitted' }))).toBe(false);
  });
});
