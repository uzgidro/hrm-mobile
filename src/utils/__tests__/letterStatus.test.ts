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
  canConfirmTripReturn,
  canSubmitReport,
  canResetReport,
  isReportReturned,
  canChancelleryConfirmRegistration,
  canAgreeLetter,
  canSubmitAgreementDraft,
  canSendAgreementLetter,
  letterNeedsMyAction,
  isMyLetter,
  canEditLetter,
  letterDisplayNumber,
  isLetterUnseen,
} from '../letterStatus';
import { statusColor as orderStatusColor } from '../orderStatus';
import i18n from '../../i18n';
import type { Letter, User } from '../../types';

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
    it('management never signs a trip (they approve via approve-trip/report, not /sign)', () => {
      // The old code compared with a bare 'management_review' status the backend
      // has no such status for trips; the management signer approves, never signs.
      const base = {
        letter_type: 'business_trip',
        assigned_signers: [{ signer_type: 'management', employee_id: 1 }],
      };
      expect(canSignLetter(letter({ ...base, status: 'management_approved' }), 1)).toBe(false);
      expect(canSignLetter(letter({ ...base, status: 'report_management_review' }), 1)).toBe(false);
      expect(canSignLetter(letter({ ...base, status: 'pending' }), 1)).toBe(false);
    });
    it('main signs only an OLD-flow trip at status pending', () => {
      const base = {
        letter_type: 'business_trip',
        assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      };
      expect(canSignLetter(letter({ ...base, status: 'pending' }), 1)).toBe(true);
      // OLD flow with a non-pending status → no sign.
      expect(canSignLetter(letter({ ...base, status: 'management_approved' }), 1)).toBe(false);
    });
    it('main does NOT sign a NEW-flow trip even at pending (backend 400s)', () => {
      const l = letter({
        letter_type: 'business_trip',
        status: 'pending',
        flow_version: 2,
        assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      });
      expect(canSignLetter(l, 1)).toBe(false);
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

  // BILDIRGI/ARIZA IMZOLANMAYDI: backend `/sign` ga 400 `use_agreement_flow`
  // qaytaradi — kelishuv oqimi (agree/disagree) ishlatiladi. Avval bu yerda
  // `true` qulflangan edi va mobil tugmani ko'rsatib, bosilganda xato berardi.
  describe('kelishuv hujjatlari (ariza/bildirgi)', () => {
    it('ariza IMZOLANMAYDI — kelishuv oqimi ishlatiladi', () => {
      const l = letter({
        letter_type: 'application',
        status: 'pending_agreement',
        assigned_signers: [{ signer_type: 'agreement', employee_id: 1 }],
      });
      expect(canSignLetter(l, 1)).toBe(false);
      expect(canAgreeLetter(l, 1)).toBe(true);
    });
  });

  describe('bildirgi', () => {
    it('bildirgi ham IMZOLANMAYDI — u ham kelishuv hujjati', () => {
      // `bildirgi` → 'explanatory'; backend uchun u ham kelishuv oqimida
      // (sign_letter: letter_type in ("application", "explanatory") → 400).
      const main = letter({
        letter_type: 'bildirgi',
        assigned_signers: [{ signer_type: 'main', employee_id: 1 }],
      });
      expect(canSignLetter(main, 1)).toBe(false);
    });
  });

  describe('kelishuv amallari (web helpers.js bilan 1:1)', () => {
    const agreementLetter = (over = {}) =>
      letter({
        letter_type: 'application',
        status: 'pending_agreement',
        creator_employee_id: 5,
        assigned_signers: [
          { signer_type: 'agreement', employee_id: 1, agreed: null },
          { signer_type: 'agreement', employee_id: 2, agreed: true },
        ],
        ...over,
      });

    it('kelishmagan kelishuvchi kelisha oladi, kelishgani — yo\'q', () => {
      const l = agreementLetter();
      expect(canAgreeLetter(l, 1)).toBe(true);
      expect(canAgreeLetter(l, 2)).toBe(false);
      expect(canAgreeLetter(l, 9)).toBe(false); // umuman kelishuvchi emas
    });

    it('devonxona bosqichida kelishuv YOPIQ', () => {
      for (const status of ['registered', 'review', 'returned']) {
        expect(canAgreeLetter(agreementLetter({ status }), 1)).toBe(false);
      }
    });

    it('qoralamani FAQAT muallif kelishuvga yuboradi', () => {
      const draft = agreementLetter({ status: 'draft' });
      expect(canSubmitAgreementDraft(draft, 5)).toBe(true);
      expect(canSubmitAgreementDraft(draft, 1)).toBe(false);
      // Arizada kelishuvchi MAJBURIY
      expect(canSubmitAgreementDraft(agreementLetter({ status: 'draft', assigned_signers: [] }), 5)).toBe(false);
    });

    it('devonxonaga yuborish — HAMMA kelishgach va faqat muallifga', () => {
      const partly = agreementLetter({ status: 'signed' });
      expect(canSendAgreementLetter(partly, 5)).toBe(false); // 1-kelishuvchi kutmoqda
      const all = agreementLetter({
        status: 'signed',
        assigned_signers: [
          { signer_type: 'agreement', employee_id: 1, agreed: true },
          { signer_type: 'agreement', employee_id: 2, agreed: true },
        ],
      });
      expect(canSendAgreementLetter(all, 5)).toBe(true);
      expect(canSendAgreementLetter(all, 1)).toBe(false);
      expect(canSendAgreementLetter(agreementLetter({ status: 'pending_agreement' }), 5)).toBe(false);
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

  // Web parity (helpers.js:294 mgmtApproved): on an OLD-flow trip the management
  // signer's approval is NOT recorded in `signers` — it's derived from the letter
  // reaching a post-registration stage (is_stamped / management_approved …). Mark
  // management "Tasdiqladi" from that signal, not from hasSigned, but NOT while
  // pending_registration (stamped, yet the chancellery hasn't registered it).
  const tripMgmt = (extra: Partial<Letter> = {}): Letter =>
    letter({
      letter_type: 'business_trip',
      assigned_signers: [{ signer_type: 'management', employee_id: 3, employee: { legal_name: 'Mgr' } as any }],
      ...extra,
    });

  it('marks trip management as approved once the trip is registered (management_approved)', () => {
    expect(getSigningTimeline(tripMgmt({ status: 'management_approved' }))[0]).toMatchObject({
      status: 'signed',
      statusText: 'Tasdiqladi',
    });
  });

  it('marks trip management as approved when is_stamped, past pending_registration', () => {
    expect(getSigningTimeline(tripMgmt({ is_stamped: true, status: 'report_submitted' }))[0]).toMatchObject({
      status: 'signed',
    });
  });

  it('does NOT mark trip management approved while pending_registration even if is_stamped', () => {
    expect(getSigningTimeline(tripMgmt({ is_stamped: true, status: 'pending_registration' }))[0]).toMatchObject({
      status: 'pending',
      statusText: 'Kutilmoqda',
    });
  });

  it('marks trip management rejected when that signer rejected (and not yet approved)', () => {
    expect(getSigningTimeline(tripMgmt({ status: 'signed', reject_by_id: 3 }))[0]).toMatchObject({
      status: 'rejected',
    });
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
    // management_approved + TASDIQLANMAGAN qaytish = safar davom etmoqda ('info');
    // KADR/xodim qaytishni tasdiqlagach "hisobot kutilmoqda" ('pending') bo'ladi.
    expect(letterStatusMeta(letter({ status: 'management_approved', is_stamped: true })).kind).toBe('info');
    expect(letterStatusMeta(letter({ status: 'management_approved', is_stamped: true, is_trip_confirmed: true })).kind).toBe('pending');
    expect(letterStatusMeta(letter({ status: 'report_submitted', is_stamped: true })).kind).toBe('info');
    expect(letterStatusMeta(letter({ status: 'report_returned', is_stamped: true })).kind).toBe('error');
    expect(letterStatusMeta(letter({ status: 'report_management_review', is_stamped: true })).kind).toBe('pending');
    expect(letterStatusMeta(letter({ status: 'report_approved', is_stamped: true })).kind).toBe('success');
  });

  // management_approved means two different things: OLD flow = arrived / awaiting
  // report; NEW flow = awaiting the leadership approve-trip. The badge must not
  // say "awaiting report" on a NEW-flow trip the leader has to approve.
  it('management_approved reads by flow: OLD = ongoing/arrived, NEW = awaiting leadership', () => {
    // ESKI oqim, qaytish TASDIQLANMAGAN — xodim hali yo'lda (web parity
    // 2026-08-19: "Safar davom etmoqda"), tasdiqlangach hisobot kutiladi.
    expect(letterStatusMeta(letter({ letter_type: 'business_trip', status: 'management_approved' })).label)
      .toBe('Safar davom etmoqda');
    expect(letterStatusMeta(letter({ letter_type: 'business_trip', status: 'management_approved', is_trip_confirmed: true })).label)
      .toBe('Hisobot kutilmoqda');
    expect(letterStatusMeta(letter({ letter_type: 'business_trip', status: 'management_approved', flow_version: 2 })).label)
      .toBe("Rahbar tasdig'i kutilmoqda");
  });

  it('report_guvohnoma_review is its own guvohnoma-approval badge (web parity)', () => {
    expect(letterStatusMeta(letter({ status: 'report_guvohnoma_review' })))
      .toEqual({ label: "Guvohnoma tasdig'ida", kind: 'pending' });
  });

  it('registered_pending_rahbar gets the leadership-pending badge', () => {
    expect(letterStatusMeta(letter({ status: 'registered_pending_rahbar' })))
      .toEqual({ label: "Rahbar tasdig'i kutilmoqda", kind: 'pending' });
  });

  // pending_registration = send_to_registry AUTO-assigned raqam/sana/muhr
  // (is_stamped becomes true) but devonxona has NOT yet confirmed registration
  // (pending_registration → registered). It must win over the is_stamped→
  // registered fallthrough, else a stamped-but-unconfirmed letter falsely reads
  // "Ro'yxatga olingan / success". Web parity (backend letter.py:5036,5072).
  it('pending_registration is awaiting-devonxona, not a false "registered"', () => {
    expect(letterStatusMeta(letter({ status: 'pending_registration', is_stamped: true })))
      .toEqual({ label: "Ro'yxatga olish kutilmoqda", kind: 'pending' });
  });

  it('letter status "returned" (devonxona qaytardi) → letterReturned label, error kind', () => {
    const meta = letterStatusMeta({ status: 'returned' } as Letter);
    expect(meta.label).toBe(i18n.t('status.letterReturned'));
    expect(meta.kind).toBe('error');
  });

  // cancelled is TERMINAL — web renders it red "Bekor qilingan" (helpers.js:761,
  // LettersTable badge #FF4D4F). Without a case it fell through to the generic
  // "Kutilmoqda / pending" label, wrongly reading as in-progress. Web parity.
  it('cancelled → "Bekor qilingan" terminal error, not generic pending', () => {
    expect(letterStatusMeta(letter({ status: 'cancelled' })))
      .toEqual({ label: 'Bekor qilingan', kind: 'error' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isNewTripFlow — flow_version 2 = NEW (main branch, NO report stage);
// 1 / null / undefined = OLD (report stage exists). Mirrors backend
// _is_new_trip_flow.
// ─────────────────────────────────────────────────────────────────────────────
describe('isNewTripFlow', () => {
  it('true only for a business_trip with flow_version === 2', () => {
    expect(isNewTripFlow(letter({ letter_type: 'business_trip', flow_version: 2 }))).toBe(true);
  });
  it('false for old flow (1) and unset (null/undefined)', () => {
    expect(isNewTripFlow(letter({ letter_type: 'business_trip', flow_version: 1 }))).toBe(false);
    expect(isNewTripFlow(letter({ letter_type: 'business_trip', flow_version: null }))).toBe(false);
    expect(isNewTripFlow(letter({ letter_type: 'business_trip' }))).toBe(false);
  });
  it('false for a non-trip letter even with flow_version 2 (backend guards on type)', () => {
    expect(isNewTripFlow(letter({ letter_type: 'application', flow_version: 2 }))).toBe(false);
  });
});

// ── KADR "Keldi" stage gate (web canConfirmTripReturn parity, helpers.js:504) ──
// OLD-flow trip only; confirm-return is blocked by the backend (400
// trip_not_registered) until the chancellery registers the trip, i.e. while the
// status is still in the pre-registration set. The button must not show then.
describe('canConfirmTripReturn', () => {
  const oldTrip = (status: string, extra: Partial<Letter> = {}): Letter =>
    letter({ letter_type: 'business_trip', flow_version: 1, status, ...extra });

  it('false in every pre-registration / terminal status', () => {
    for (const s of ['draft', 'pending', 'signed', 'pending_registration',
                     'report_approved', 'rejected', 'cancelled']) {
      expect(canConfirmTripReturn(oldTrip(s))).toBe(false);
    }
  });

  it('true once the trip is registered (management_approved) and not yet confirmed', () => {
    expect(canConfirmTripReturn(oldTrip('management_approved'))).toBe(true);
  });

  it('false when the return is already confirmed', () => {
    expect(canConfirmTripReturn(oldTrip('management_approved', { is_trip_confirmed: true }))).toBe(false);
  });

  it('false for a NEW-flow trip (arrival goes through hr-arrive, not confirm-return)', () => {
    expect(canConfirmTripReturn(letter({ letter_type: 'business_trip', flow_version: 2, status: 'management_approved' }))).toBe(false);
  });

  it('false for a non-trip letter', () => {
    expect(canConfirmTripReturn(letter({ letter_type: 'application', status: 'registered' }))).toBe(false);
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

describe('canChancelleryConfirmRegistration', () => {
  const chancellery: User = {
    id: 2, type: 'employee',
    employee: { id: 20, legal_name: 'Dev', is_multi_org_user: true, multi_org_employee_role: 'chancellery' } as User['employee'],
  };
  const branchDevonxona: User = { id: 3, type: 'employee', chancellery_branch_ids: [7], employee: { id: 30, legal_name: 'BL' } as User['employee'] };
  const regular: User = { id: 4, type: 'employee', employee: { id: 40, legal_name: 'Reg' } as User['employee'] };
  const masterAdmin: User = { id: 5, type: 'master-admin' };

  it('true for a bildirgi/ariza/trip at pending_registration when the user may act as devonxona', () => {
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'pending_registration', organization_branch_id: 7 } as Letter, chancellery)).toBe(true);
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'application', status: 'pending_registration', organization_branch_id: 7 } as Letter, chancellery)).toBe(true);
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'business_trip', status: 'pending_registration', organization_branch_id: 7 } as Letter, branchDevonxona)).toBe(true);
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'pending_registration', organization_branch_id: 99 } as Letter, masterAdmin)).toBe(true);
  });

  it('false when not pending_registration', () => {
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'registered', organization_branch_id: 7 } as Letter, chancellery)).toBe(false);
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'review', organization_branch_id: 7 } as Letter, chancellery)).toBe(false);
  });

  it('false for a regular employee or a devonxona of another branch', () => {
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'pending_registration', organization_branch_id: 7 } as Letter, regular)).toBe(false);
    expect(canChancelleryConfirmRegistration({ id: 1, letter_type: 'bildirgi', status: 'pending_registration', organization_branch_id: 8 } as Letter, branchDevonxona)).toBe(false);
  });
});

describe("letterNeedsMyAction (ro'yxatdagi \"amal talab qiladi\")", () => {
  it("backend `action_required` bayrog'iga ISHONADI (imzo/kelishuv bo'lmasa ham)", () => {
    // Devonxona ro'yxatga oladi / KADR \"Keldi\" tasdiqlaydi / muallif qaytarilgan
    // hisobotni tuzatadi — bularda foydalanuvchi imzolovchi EMAS.
    const l = { id: 1, letter_type: 'business_trip', status: 'signed', action_required: true } as Letter;
    expect(letterNeedsMyAction(l, 99)).toBe(true);
  });

  it('KELISHUV kutayotgan bildirgini amal deb belgilaydi (bayroqsiz eski javobda ham)', () => {
    const l = {
      id: 2, letter_type: 'bildirgi', status: 'pending_agreement',
      assigned_signers: [{ employee_id: 7, signer_type: 'agreement', agreed: null }],
    } as Letter;
    // canSignLetter bu yerda DOIM false (bildirgi imzolanmaydi) — eski mantiq
    // aynan shu holatda sariqni ko'rsatmasdi.
    expect(canSignLetter(l, 7)).toBe(false);
    expect(letterNeedsMyAction(l, 7)).toBe(true);
  });

  it("kelishib bo'lgan yoki begona hujjatda false", () => {
    const agreed = {
      id: 3, letter_type: 'bildirgi', status: 'pending_registration',
      assigned_signers: [{ employee_id: 7, signer_type: 'agreement', agreed: true }],
    } as Letter;
    expect(letterNeedsMyAction(agreed, 7)).toBe(false);
    expect(letterNeedsMyAction({ id: 4, letter_type: 'business_trip', status: 'pending' } as Letter, 7)).toBe(false);
  });
});


// "Mening" tabi — avval `signer=true` (men IMZOLAGANLARIM) bo'lgani uchun
// o'z bildirgisini yozgan xodim uni ro'yxatda ko'rmasdi.
describe('isMyLetter', () => {
  it('muallif va kirituvchi uchun TRUE (imzolamagan bo\'lsa ham)', () => {
    expect(isMyLetter({ id: 1, letter_type: 'bildirgi', creator_employee_id: 7 } as Letter, 7)).toBe(true);
    expect(isMyLetter({ id: 2, letter_type: 'application', submitter_id: 7 } as Letter, 7)).toBe(true);
  });

  it('biriktirilgan imzolovchi/kelishuvchi va imzolagan uchun ham TRUE', () => {
    expect(isMyLetter({ id: 3, letter_type: 'bildirgi', assigned_signers: [{ employee_id: 7, signer_type: 'agreement' }] } as Letter, 7)).toBe(true);
    expect(isMyLetter({ id: 4, letter_type: 'business_trip', signers: [{ employee_id: 7 }] } as Letter, 7)).toBe(true);
  });

  it('begona hujjatda va xodim id\'siz FALSE', () => {
    expect(isMyLetter({ id: 5, letter_type: 'bildirgi', creator_employee_id: 9 } as Letter, 7)).toBe(false);
    expect(isMyLetter({ id: 6, letter_type: 'bildirgi', creator_employee_id: 7 } as Letter, undefined)).toBe(false);
  });
});


// ── Tahrirlash / ko'rsatiladigan raqam / "yangi" belgisi ─────────────────────

describe('canEditLetter (backend update_letter bilan 1:1)', () => {
  const masterAdmin = { id: 1, type: 'master-admin' } as unknown as User;
  const hrOf = (branchId: number): User => ({
    id: 2,
    type: 'employee',
    employee: {
      id: 50,
      is_multi_org_user: true,
      multi_org_employee_role: 'hr',
      organization_branches: [{ id: branchId, name: 'B' }],
    },
  }) as unknown as User;

  it('bildirgi/ariza: muallif tahrirlaydi — DEVONXONAGA ketguncha', () => {
    for (const status of ['draft', 'pending', 'pending_agreement', 'returned', 'signed']) {
      expect(canEditLetter(letter({ letter_type: 'application', status, creator_employee_id: 7 }), 7)).toBe(true);
    }
    // Devonxonaga ketgach — faqat master-admin.
    for (const status of ['pending_registration', 'review', 'registered']) {
      const l = letter({ letter_type: 'application', status, creator_employee_id: 7 });
      expect(canEditLetter(l, 7)).toBe(false);
      expect(canEditLetter(l, 7, masterAdmin)).toBe(true);
    }
  });

  it('bildirgi/ariza: begona odam tahrirlay olmaydi', () => {
    expect(canEditLetter(letter({ letter_type: 'application', status: 'draft', creator_employee_id: 7 }), 99)).toBe(false);
  });

  it('xizmat safari: muallif yoki FILIAL KADR\'i, TASDIQLANGUNCHA', () => {
    const base = { letter_type: 'business_trip', creator_employee_id: 7, organization_branch_id: 4 };
    for (const status of ['draft', 'pending', 'signed']) {
      expect(canEditLetter(letter({ ...base, status }), 7)).toBe(true);
      expect(canEditLetter(letter({ ...base, status }), 99, hrOf(4))).toBe(true);
      // Boshqa filial KADR'i — YO'Q.
      expect(canEditLetter(letter({ ...base, status }), 99, hrOf(77))).toBe(false);
    }
    // Tasdiqlangach yopiladi.
    for (const status of ['management_approved', 'report_submitted', 'report_approved']) {
      expect(canEditLetter(letter({ ...base, status }), 7)).toBe(false);
    }
  });
});

describe('letterDisplayNumber (web displayNumber parity)', () => {
  it('safarda AVVAL decree_number, bo\'lmasa letter_number', () => {
    expect(letterDisplayNumber(letter({ letter_type: 'business_trip', decree_number: '12-A', letter_number: '99' })))
      .toBe('12-A');
    expect(letterDisplayNumber(letter({ letter_type: 'business_trip', letter_number: '99' }))).toBe('99');
  });

  it('boshqa turlarда letter_number', () => {
    expect(letterDisplayNumber(letter({ letter_type: 'application', decree_number: '12-A', letter_number: '99' })))
      .toBe('99');
    expect(letterDisplayNumber(letter({ letter_type: 'application' }))).toBeNull();
  });
});

describe('isLetterUnseen (web rowIsUnseen parity)', () => {
  it('amal kutayotgan hujjat DOIM yangi', () => {
    expect(isLetterUnseen(letter({ action_required: true }), 7)).toBe(true);
  });

  it('amal talab qilmasa ham O\'ZGARGAN hujjat yangi (avval belgilanmasdi)', () => {
    expect(isLetterUnseen(letter({ is_unseen: true }), 7)).toBe(true);
  });

  it('ko\'rilgan va amal kutmaydigan hujjat — yangi EMAS', () => {
    expect(isLetterUnseen(letter({ action_required: false, is_unseen: false }), 7)).toBe(false);
  });
});
