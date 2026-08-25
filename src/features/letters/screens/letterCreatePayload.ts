// Pure assembly of the create-letter POST payload, extracted from
// CreateLetterScreen so it can be unit-tested without rendering the screen
// (RNTL 14 forbids renderHook; see CLAUDE.md). Two shapes share the base fields:
//   - business_trip: destination_branch_ids, rahbariyat_ids, dates, work_plan,
//     and an OPTIONAL submitter_id (web parity — an empty submitter means the
//     author submits and signs their own trip, so the key is omitted, not null).
//   - application/bildirgi: assigned_signers — ADRESAT (`addressee`, imzolamaydi)
//     + KELISHUVCHILAR (`agreement`). Avval bu yerda eski `main`/`ordinary`
//     turlari yuborilardi va backend har bir yaratishni
//     400 `addressee_required` bilan rad etardi (web buildAssignedSigners bilan
//     1:1: aynan bitta adresat + takrorlanmaydigan kelishuvchilar).

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
  /**
   * Bildirgi/ariza MUALLIFI — boshqa xodim nomidan kiritish uchun (static.uz
   * `id_employee` ekvivalenti). Bo'sh bo'lsa backend joriy foydalanuvchini
   * qo'yadi, shu bois kalit umuman YUBORILMAYDI (web ham `null` yuboradi va
   * backend uni default bilan almashtiradi).
   */
  creatorId?: number | null;
  submitterId: number | null;
  rahbariyatIds: number[];
  destinationIds: number[];
  /**
   * Foydalanuvchi TANLAGAN viloyat(lar). Hujjatdagi "hudud" AYNAN shu tanlov
   * bo'yicha yoziladi — filial bir nechta viloyatga qarasa ham. Bu maydon
   * avval umuman YUBORILMASDI (ekran uni faqat filial ro'yxatini filtrlash
   * uchun ishlatardi), shu bois mobilда yaratilgan safar hujjatida hudud
   * filialdan hosil qilinardi va webdagidan farq qilardi.
   */
  regions: string[];
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
    payload.destination_regions = input.regions.filter(Boolean);
    // Optional (web parity): omit the key when no submitter is chosen so the
    // backend makes the author the submitter rather than seeing a null.
    if (input.submitterId) payload.submitter_id = input.submitterId;
    payload.rahbariyat_ids = input.rahbariyatIds;
    payload.departure_date = input.departureDate || null;
    payload.arrival_date = input.arrivalDate || null;
    payload.work_plan = input.workPlan.trim() || null;
  } else {
    const seen = new Set<number>(input.mainSignerId ? [Number(input.mainSignerId)] : []);
    const agreements: { employee_id: number; signer_type: string }[] = [];
    input.ordinarySigners.forEach((id) => {
      const n = Number(id);
      if (!id || seen.has(n)) return;
      seen.add(n);
      agreements.push({ employee_id: n, signer_type: 'agreement' });
    });
    payload.assigned_signers = [
      ...(input.mainSignerId
        ? [{ employee_id: Number(input.mainSignerId), signer_type: 'addressee' }]
        : []),
      ...agreements,
    ];
    if (input.creatorId) payload.creator_employee_id = Number(input.creatorId);
  }

  return payload;
}
