import { letterPermissions } from '../letterPermissions';
import type { Letter, User } from '../../types';

// Xat/safar bo'yicha RUXSATLAR AGREGATORI — buyruqlardagi `decreePermissions`
// ning ekvivalenti.
//
// Nega kerak: `LetterDetailView` da 11 ta bayroq ALOHIDA-ALOHIDA hisoblanardi.
// Predikatlarning O'ZI test bilan qoplangan edi, lekin ularning KOMPOZITSIYASI
// — ya'ni "falon statusda falon rolga QAYSI tugmalar birga ko'rinadi" — hech
// qayerda ifodalanmagan va tekshirilmagan edi. Buyruqlarda bu allaqachon bitta
// sof funksiya (`decreePermissions`), xatlarda esa yo'q edi — assimetriya.
//
// Bu testlar aynan KOMPOZITSIYANI qulflaydi.

const hr = (branchId = 3): User => ({
  id: 1,
  type: 'employee',
  employee: {
    id: 10,
    is_multi_org_user: true,
    multi_org_employee_role: 'hr',
    organization_branches: [{ id: branchId }],
  },
} as unknown as User);

const author = (): User => ({
  id: 2,
  type: 'employee',
  employee: { id: 20 },
} as unknown as User);

const trip = (extra: Partial<Letter> = {}): Letter => ({
  id: 1,
  letter_type: 'business_trip',
  organization_branch_id: 3,
  creator_employee_id: 20,
  ...extra,
} as Letter);

describe('letterPermissions', () => {
  it('qoralama: muallif yuboradi va tahrirlaydi, boshqa amallar yo\'q', () => {
    const p = letterPermissions(trip({ status: 'draft' }), author(), 20);
    expect(p.canDelete).toBe(true);
    expect(p.canReturn).toBe(false);
    expect(p.canReturnReport).toBe(false);
    expect(p.canCancelTrip).toBe(false);
  });

  // Eng muhim invariant: QAYTARISH amallari faqat devonxonada, muallifda EMAS.
  it('muallifda devonxona amallari (qaytarish) YO\'Q', () => {
    const p = letterPermissions(trip({ status: 'pending_registration' }), author(), 20);
    expect(p.canReturn).toBe(false);
    expect(p.canReturnReport).toBe(false);
  });

  // Uchta rahbariyat tasdig'i O'ZARO INKOR: bir vaqtda faqat bittasi.
  it('rahbariyat tasdiqlari o\'zaro inkor — hech qachon ikkitasi birga emas', () => {
    for (const status of ['registered_pending_rahbar', 'report_management_review',
      'report_guvohnoma_review', 'management_approved', 'draft', 'pending']) {
      const p = letterPermissions(trip({ status }), hr(), 10);
      const kinds = [p.approveTripKind].filter(Boolean);
      expect(kinds.length).toBeLessThanOrEqual(1);
    }
  });

  it('hasActions — hech qanday amal bo\'lmasa false', () => {
    // Yakunlangan safar, tashqi kuzatuvchi: hech narsa qila olmaydi.
    const stranger = { id: 9, type: 'employee', employee: { id: 99 } } as unknown as User;
    const p = letterPermissions(trip({ status: 'report_approved' }), stranger, 99);
    expect(p.hasActions).toBe(false);
  });

  it('hasActions — kamida bitta amal bo\'lsa true', () => {
    const p = letterPermissions(trip({ status: 'draft' }), author(), 20);
    expect(p.canDelete).toBe(true);
    expect(p.hasActions).toBe(true);
  });

  // Agregator predikatlar bilan BIR XIL javob berishi kerak — u faqat
  // yig'uvchi, o'z qoidasini o'ylab topmaydi.
  it('KADR asos buyruq kirita oladi (safar + o\'z filiali)', () => {
    expect(letterPermissions(trip({ status: 'management_approved' }), hr(3), 10).canSetBasis).toBe(true);
    // Boshqa filial KADRi — yo'q.
    expect(letterPermissions(trip({ status: 'management_approved' }), hr(7), 10).canSetBasis).toBe(false);
    // Bildirgi uchun asos buyruq tushunchasi yo'q.
    expect(letterPermissions({ ...trip({ status: 'management_approved' }), letter_type: 'explanatory' } as Letter, hr(3), 10).canSetBasis).toBe(false);
  });
});

// SODDALASHTIRILGAN SAFAR (`is_simple_trip`): bunday safarda hisobot,
// "Yuborish" va devonxona bosqichlari UMUMAN YO'Q — backend bu amallarni
// 400 (`not_for_simple_trip` / `report_not_required`) bilan rad etadi
// (`services/letter.py:_assert_not_simple_trip`). Demak mijoz bu tugmalarni
// KO'RSATMASLIGI kerak, aks holda foydalanuvchi bosadi va xato oladi.
describe('letterPermissions — soddalashtirilgan safar', () => {
  const simple = (extra: Partial<Letter> = {}): Letter => ({
    id: 1,
    letter_type: 'business_trip',
    organization_branch_id: 3,
    creator_employee_id: 20,
    is_simple_trip: true,
    ...extra,
  } as Letter);

  it('hisobot va "Yuborish" tugmalari YO\'Q', () => {
    const p = letterPermissions(
      simple({ status: 'management_approved', is_trip_confirmed: true }), author(), 20,
    );
    expect(p.canReport).toBe(false);
    expect(p.canResetReport).toBe(false);
    expect(p.canSend).toBe(false);
  });

  it('devonxona bosqichlari (tasdiqlash/qaytarish) YO\'Q', () => {
    const p = letterPermissions(simple({ status: 'pending_registration' }), hr(), 10);
    expect(p.canConfirmRegistration).toBe(false);
    expect(p.canReturn).toBe(false);
    expect(p.canReturnReport).toBe(false);
  });

  // KADR amallari SAQLANADI — ular soddalashtirilgan safarda ham mavjud.
  it('KADR amallari (bekor qilish, uzaytirish, asos buyruq) SAQLANADI', () => {
    const p = letterPermissions(simple({ status: 'management_approved' }), hr(3), 10);
    expect(p.canSetBasis).toBe(true);
  });
});
