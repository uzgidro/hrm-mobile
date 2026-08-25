import { buildLetterCreatePayload, type LetterCreateInput } from '../letterCreatePayload';

const baseTrip: LetterCreateInput = {
  isTrip: true,
  letterType: 'business_trip',
  letterDate: '2026-07-24',
  branchId: 10,
  employeeId: 5,
  shortSummary: '',
  description: 'Trip purpose',
  workPlan: 'Plan',
  mainSignerId: null,
  ordinarySigners: [],
  submitterId: 7,
  rahbariyatIds: [3],
  destinationIds: [1, 2],
  regions: ['Toshkent viloyati', 'Andijon viloyati'],
  departureDate: '2026-08-01',
  arrivalDate: '2026-08-05',
};

describe('buildLetterCreatePayload — business_trip', () => {
  it('includes submitter_id when a submitter is chosen', () => {
    const p = buildLetterCreatePayload({ ...baseTrip, submitterId: 7 });
    expect(p.submitter_id).toBe(7);
  });

  it('OMITS submitter_id entirely when no submitter is chosen (web parity: author self-submits)', () => {
    const p = buildLetterCreatePayload({ ...baseTrip, submitterId: null });
    expect('submitter_id' in p).toBe(false);
  });

  it('assembles the trip fields', () => {
    const p = buildLetterCreatePayload(baseTrip);
    expect(p).toMatchObject({
      letter_type: 'business_trip',
      organization_branch_id: 10,
      employee_id: 5,
      destination_branch_ids: [1, 2],
      // Regression: TANLANGAN viloyat(lar) avval UMUMAN yuborilmasdi — ekran
      // ularni faqat filial ro'yxatini filtrlash uchun ishlatardi, natijada
      // mobilда yaratilgan safar hujjatidagi "hudud" webdagidan farq qilardi.
      destination_regions: ['Toshkent viloyati', 'Andijon viloyati'],
      rahbariyat_ids: [3],
      departure_date: '2026-08-01',
      arrival_date: '2026-08-05',
      work_plan: 'Plan',
      description: 'Trip purpose',
    });
    // trips carry no assigned_signers block
    expect('assigned_signers' in p).toBe(false);
  });

  it('drops empty region entries', () => {
    const p = buildLetterCreatePayload({ ...baseTrip, regions: ['Andijon viloyati', ''] });
    expect(p.destination_regions).toEqual(['Andijon viloyati']);
  });

  it('nulls empty optional trip dates and work_plan', () => {
    const p = buildLetterCreatePayload({ ...baseTrip, departureDate: null, arrivalDate: null, workPlan: '   ' });
    expect(p.departure_date).toBeNull();
    expect(p.arrival_date).toBeNull();
    expect(p.work_plan).toBeNull();
  });
});

describe('buildLetterCreatePayload — non-trip (application/bildirgi)', () => {
  const baseLetter: LetterCreateInput = {
    ...baseTrip,
    isTrip: false,
    letterType: 'application',
    shortSummary: 'Summary',
    description: 'Body',
    mainSignerId: 4,
    ordinarySigners: [4, 6, 8],
  };

  it('joins short summary and body into description', () => {
    const p = buildLetterCreatePayload(baseLetter);
    expect(p.description).toBe('Summary\n\nBody');
  });

  // Backend bildirgi/ariza uchun AYNAN bitta `addressee` (adresat, imzolamaydi)
  // va `agreement` (kelishuvchi) turlarini kutadi — eski `main`/`ordinary`
  // bilan har bir yaratish 400 `addressee_required` bo'lardi.
  it('adresat + kelishuvchilar yuboradi (adresat kelishuvchilardan chiqariladi)', () => {
    const p = buildLetterCreatePayload(baseLetter);
    expect(p.assigned_signers).toEqual([
      { employee_id: 4, signer_type: 'addressee' },
      { employee_id: 6, signer_type: 'agreement' },
      { employee_id: 8, signer_type: 'agreement' },
    ]);
    // non-trip letters never carry trip-only keys
    expect('submitter_id' in p).toBe(false);
    expect('destination_branch_ids' in p).toBe(false);
    expect('destination_regions' in p).toBe(false);
  });

  it('takroriy kelishuvchini bir marta yuboradi', () => {
    const p = buildLetterCreatePayload({ ...baseLetter, ordinarySigners: [6, 6, 8] });
    expect(p.assigned_signers).toEqual([
      { employee_id: 4, signer_type: 'addressee' },
      { employee_id: 6, signer_type: 'agreement' },
      { employee_id: 8, signer_type: 'agreement' },
    ]);
  });

  it('adresat tanlanmasa uning qatori yuborilmaydi', () => {
    const p = buildLetterCreatePayload({ ...baseLetter, mainSignerId: null, ordinarySigners: [6] });
    expect(p.assigned_signers).toEqual([{ employee_id: 6, signer_type: 'agreement' }]);
  });
});


// MUALLIF (creator_employee_id) — mobilда bu maydon umuman yo'q edi, ya'ni
// hujjatni faqat O'Z nomingdan yozish mumkin edi.
describe('buildLetterCreatePayload — hujjat muallifi', () => {
  const baseLetter: LetterCreateInput = {
    ...baseTrip,
    isTrip: false,
    letterType: 'application',
    mainSignerId: 4,
    ordinarySigners: [6],
  };

  it('tanlangan muallifni creator_employee_id sifatida yuboradi', () => {
    const p = buildLetterCreatePayload({ ...baseLetter, creatorId: 77 });
    expect(p.creator_employee_id).toBe(77);
  });

  it("tanlanmasa kalit UMUMAN yuborilmaydi (backend joriy foydalanuvchini qo'yadi)", () => {
    expect('creator_employee_id' in buildLetterCreatePayload({ ...baseLetter, creatorId: null })).toBe(false);
    expect('creator_employee_id' in buildLetterCreatePayload(baseLetter)).toBe(false);
  });

  it('SAFARда muallif maydoni yo\'q (u yerda yuboruvchi/rahbariyat ishlatiladi)', () => {
    const p = buildLetterCreatePayload({ ...baseTrip, creatorId: 77 });
    expect('creator_employee_id' in p).toBe(false);
  });
});
