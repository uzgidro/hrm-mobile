// Pure assembly of the create-letter POST payload, extracted from
// CreateLetterScreen so it can be unit-tested without rendering the screen
// (RNTL 14 forbids renderHook; see CLAUDE.md). Two shapes share the base fields:
//   - business_trip: destination_branch_ids, rahbariyat_ids, dates, work_plan,
//     and an OPTIONAL submitter_id (web parity — an empty submitter means the
//     author submits and signs their own trip, so the key is omitted, not null).
//   - application/bildirgi: assigned_signers (main + ordinaries).

export interface LetterCreateInput {
  isTrip: boolean;
  letterType: string;
  letterDate: string | null;
  branchId: number | undefined;
  employeeId: number | undefined;
  shortSummary: string;
  description: string;
  workPlan: string;
  mainSignerId: number | null;
  ordinarySigners: number[];
  submitterId: number | null;
  rahbariyatIds: number[];
  destinationIds: number[];
  departureDate: string | null;
  arrivalDate: string | null;
}

export function buildLetterCreatePayload(input: LetterCreateInput): Record<string, unknown> {
  const description = input.isTrip
    ? (input.description.trim() || null)
    : ([input.shortSummary.trim(), input.description.trim()].filter(Boolean).join('\n\n') || null);

  const payload: Record<string, unknown> = {
    letter_type: input.letterType,
    letter_date: input.letterDate || null,
    description,
    organization_branch_id: input.branchId,
    employee_id: input.employeeId,
  };

  if (input.isTrip) {
    payload.destination_branch_ids = input.destinationIds;
    // Optional (web parity): omit the key when no submitter is chosen so the
    // backend makes the author the submitter rather than seeing a null.
    if (input.submitterId) payload.submitter_id = input.submitterId;
    payload.rahbariyat_ids = input.rahbariyatIds;
    payload.departure_date = input.departureDate || null;
    payload.arrival_date = input.arrivalDate || null;
    payload.work_plan = input.workPlan.trim() || null;
  } else {
    payload.assigned_signers = [
      ...(input.mainSignerId ? [{ employee_id: input.mainSignerId, signer_type: 'main' }] : []),
      ...input.ordinarySigners
        .filter((id) => id && id !== input.mainSignerId)
        .map((id) => ({ employee_id: id, signer_type: 'ordinary' })),
    ];
  }

  return payload;
}
