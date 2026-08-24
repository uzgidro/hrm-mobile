import type { Letter, User } from '@/types';
import {
  canSubmitTrip, canApproveReport, canApproveGuvohnoma, canRejectLetter,
  canReturnLetter, canDeleteLetter, canReturnTripReport, canCancelTrip,
  canExtendTrip, canDecideExtension,
} from '../tripStatus';

const letter = (o: Partial<Letter>): Letter => ({ id: 1, ...o });

// Devonxona/KADR darvozalari ROLga qaraydi (bayroqqa emas) — web
// LetterDetailModal bilan bir xil.
const plainUser = (): User => ({ id: 1, type: 'employee', employee: { id: 3 } }) as unknown as User;
const devonxonaOf = (branchId: number): User =>
  ({ id: 2, type: 'employee', employee: { id: 3 }, chancellery_branch_ids: [branchId] }) as unknown as User;
const hrOf = (branchId: number): User => ({
  id: 4,
  type: 'employee',
  employee: {
    id: 3,
    is_multi_org_user: true,
    multi_org_employee_role: 'hr',
    organization_branches: [{ id: branchId, name: 'B' }],
  },
}) as unknown as User;

// The trip action gates read the server-computed available_actions flags — the
// client does not re-derive trip rights (the backend knows the trip_approver we
// don't). These tests pin that each gate reads its OWN flag (catches a wrong
// flag-name) and degrades to false when available_actions is absent (list /
// pre-deploy backend).
describe('canSubmitTrip', () => {
  it('true when the server flag can_submit_trip is set', () => {
    expect(canSubmitTrip(letter({ available_actions: { can_submit_trip: true } }))).toBe(true);
  });

  it('false when the flag is absent, false, or available_actions is missing', () => {
    expect(canSubmitTrip(letter({ available_actions: { can_submit_trip: false } }))).toBe(false);
    expect(canSubmitTrip(letter({ available_actions: {} }))).toBe(false);
    expect(canSubmitTrip(letter({}))).toBe(false);
  });
});

describe('trip action gates read their own flag and default to false', () => {

  it('canApproveReport reads can_approve_report only', () => {
    expect(canApproveReport(letter({ available_actions: { can_approve_report: true } }))).toBe(true);
    expect(canApproveReport(letter({ available_actions: { can_approve_trip: true } }))).toBe(false);
    expect(canApproveReport(letter({}))).toBe(false);
  });

  it('canApproveGuvohnoma reads can_approve_guvohnoma only', () => {
    expect(canApproveGuvohnoma(letter({ available_actions: { can_approve_guvohnoma: true } }))).toBe(true);
    expect(canApproveGuvohnoma(letter({ available_actions: { can_approve_report: true } }))).toBe(false);
    expect(canApproveGuvohnoma(letter({}))).toBe(false);
  });

  it('canRejectLetter reads can_reject only', () => {
    expect(canRejectLetter(letter({ available_actions: { can_reject: true } }))).toBe(true);
    expect(canRejectLetter(letter({ available_actions: { can_sign: true } }))).toBe(false);
    expect(canRejectLetter(letter({}))).toBe(false);
  });
});


// ── Devonxona / KADR amallari ────────────────────────────────────────────────
// Regression: bu to'rt amal mobilда UMUMAN yo'q edi (webda tugmalari bor), ya'ni
// devonxona hujjatni/hisobotni qaytara ham, o'chira ham olmasdi va KADR safarni
// bekor qila olmasdi — hujjat mobilда shu bosqichlarda tiqilib qolardi.
describe('canReturnLetter (devonxona "Qaytarish")', () => {
  const l = letter({ status: 'pending_registration', organization_branch_id: 7 });

  it('true for the branch devonxona', () => {
    expect(canReturnLetter(l, devonxonaOf(7))).toBe(true);
  });

  it('false for a plain user and for ANOTHER branch devonxona', () => {
    expect(canReturnLetter(l, plainUser())).toBe(false);
    expect(canReturnLetter(l, devonxonaOf(99))).toBe(false);
  });

  it('false on terminal / not-yet-submitted statuses', () => {
    for (const status of ['rejected', 'cancelled', 'draft']) {
      expect(canReturnLetter(letter({ status, organization_branch_id: 7 }), devonxonaOf(7))).toBe(false);
    }
  });
});

describe('canDeleteLetter (devonxona + MUALLIF, web canDeleteRow parity)', () => {
  it('devonxona o\'z filialining hujjatini HAR bosqichda o\'chiradi', () => {
    const l = letter({ status: 'registered', organization_branch_id: 7 });
    expect(canDeleteLetter(l, devonxonaOf(7))).toBe(true);
    expect(canDeleteLetter(l, devonxonaOf(99))).toBe(false);
    expect(canDeleteLetter(l, plainUser())).toBe(false);
  });

  it('safar MUALLIFI faqat boshlang\'ich holatda o\'chiradi', () => {
    const base = { letter_type: 'business_trip', creator_employee_id: 3, organization_branch_id: 7 };
    for (const status of ['draft', 'pending', 'rejected']) {
      expect(canDeleteLetter(letter({ ...base, status }), plainUser(), 3)).toBe(true);
    }
    for (const status of ['signed', 'management_approved', 'report_approved']) {
      expect(canDeleteLetter(letter({ ...base, status }), plainUser(), 3)).toBe(false);
    }
    // Begona odam — hech qachon.
    expect(canDeleteLetter(letter({ ...base, status: 'draft' }), plainUser(), 99)).toBe(false);
  });

  it('bildirgi/ariza: ro\'yxatga olingan yoki KELISHILGAN hujjat o\'chirilmaydi', () => {
    const base = { letter_type: 'application', creator_employee_id: 3, organization_branch_id: 7 };
    expect(canDeleteLetter(letter({ ...base, status: 'draft' }), plainUser(), 3)).toBe(true);
    expect(canDeleteLetter(letter({ ...base, status: 'registered' }), plainUser(), 3)).toBe(false);
    expect(canDeleteLetter(
      letter({
        ...base,
        status: 'pending_agreement',
        assigned_signers: [{ signer_type: 'agreement', employee_id: 8, agreed: true }],
      }),
      plainUser(),
      3,
    )).toBe(false);
  });
});

// Uzaytirish oqimi mobilда umuman yo'q edi.
describe('canExtendTrip / canDecideExtension', () => {
  it('KADR faol safarni uzaytiradi (tasdiqlangan, hali qaytmagan)', () => {
    const l = letter({ letter_type: 'business_trip', status: 'management_approved', organization_branch_id: 7 });
    expect(canExtendTrip(l, hrOf(7))).toBe(true);
    expect(canExtendTrip(l, hrOf(99))).toBe(false);
    expect(canExtendTrip(l, plainUser())).toBe(false);
    // Qaytgach — yo'q.
    expect(canExtendTrip(letter({ ...l, is_trip_confirmed: true }), hrOf(7))).toBe(false);
    // Boshqa bosqichda — yo'q.
    expect(canExtendTrip(letter({ ...l, status: 'pending' }), hrOf(7))).toBe(false);
  });

  it('so\'rovni XODIM TANLAGAN rahbariyat hal qiladi (extension_review)', () => {
    const l = letter({
      letter_type: 'business_trip',
      status: 'extension_review',
      organization_branch_id: 7,
      assigned_signers: [{ signer_type: 'management', employee_id: 42 }],
    });
    expect(canDecideExtension(l, plainUser(), 42)).toBe(true);
    expect(canDecideExtension(l, plainUser(), 99)).toBe(false);
    // Boshqa bosqichda tugma yo'q.
    expect(canDecideExtension(letter({ ...l, status: 'management_approved' }), plainUser(), 42)).toBe(false);
  });
});

describe('canReturnTripReport (devonxona "Hisobotni qaytarish")', () => {
  it('only for a business trip at report_submitted, for the branch devonxona', () => {
    const ok = letter({ letter_type: 'business_trip', status: 'report_submitted', organization_branch_id: 7 });
    expect(canReturnTripReport(ok, devonxonaOf(7))).toBe(true);
    expect(canReturnTripReport(ok, plainUser())).toBe(false);
    // Boshqa bosqich / boshqa tur — yo'q.
    expect(canReturnTripReport(
      letter({ letter_type: 'business_trip', status: 'report_approved', organization_branch_id: 7 }),
      devonxonaOf(7),
    )).toBe(false);
    expect(canReturnTripReport(
      letter({ letter_type: 'application', status: 'report_submitted', organization_branch_id: 7 }),
      devonxonaOf(7),
    )).toBe(false);
  });
});

describe('canCancelTrip (KADR "Safarni bekor qilish")', () => {
  it('true for the HOME branch HR while the trip is unfinished', () => {
    const l = letter({ letter_type: 'business_trip', status: 'management_approved', organization_branch_id: 7 });
    expect(canCancelTrip(l, hrOf(7))).toBe(true);
    // Boshqa filial KADR'i — YO'Q (borish filiali uy filialining safarini bekor qilmaydi).
    expect(canCancelTrip(l, hrOf(99))).toBe(false);
    expect(canCancelTrip(l, plainUser())).toBe(false);
  });

  it('false once KADR confirmed the arrival, and on terminal statuses', () => {
    expect(canCancelTrip(
      letter({ letter_type: 'business_trip', status: 'management_approved', organization_branch_id: 7, is_trip_confirmed: true }),
      hrOf(7),
    )).toBe(false);
    for (const status of ['report_approved', 'cancelled']) {
      expect(canCancelTrip(
        letter({ letter_type: 'business_trip', status, organization_branch_id: 7 }),
        hrOf(7),
      )).toBe(false);
    }
  });

  it('false for a non-trip letter', () => {
    expect(canCancelTrip(letter({ letter_type: 'application', status: 'pending', organization_branch_id: 7 }), hrOf(7))).toBe(false);
  });
});
