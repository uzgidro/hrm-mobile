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
      rahbariyat_ids: [3],
      departure_date: '2026-08-01',
      arrival_date: '2026-08-05',
      work_plan: 'Plan',
      description: 'Trip purpose',
    });
    // trips carry no assigned_signers block
    expect('assigned_signers' in p).toBe(false);
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

  it('builds assigned_signers (main + ordinaries, main de-duped out of ordinaries)', () => {
    const p = buildLetterCreatePayload(baseLetter);
    expect(p.assigned_signers).toEqual([
      { employee_id: 4, signer_type: 'main' },
      { employee_id: 6, signer_type: 'ordinary' },
      { employee_id: 8, signer_type: 'ordinary' },
    ]);
    // non-trip letters never carry trip-only keys
    expect('submitter_id' in p).toBe(false);
    expect('destination_branch_ids' in p).toBe(false);
  });

  it('omits the main signer entry when none is chosen', () => {
    const p = buildLetterCreatePayload({ ...baseLetter, mainSignerId: null, ordinarySigners: [6] });
    expect(p.assigned_signers).toEqual([{ employee_id: 6, signer_type: 'ordinary' }]);
  });
});
