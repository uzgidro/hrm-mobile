// Pure form rules of the create/edit-order screen. These lock the four web-v1
// parity fixes that could not be seen from the UI: the familiarizer seeding
// (silent data loss), the submitter-vs-approver pre-check, the create-only KADR
// number/date fields, and the existing-attachment list.
import {
  seedFamiliarizerDeptIds,
  existingOrderDocuments,
  validateOrderForm,
  buildCreateOrderPayload,
  buildUpdateOrderPayload,
  type OrderFormValues,
} from '../utils/orderForm';
import type { OrderAct } from '@/types';

const values = (over: Partial<OrderFormValues> = {}): OrderFormValues => ({
  categoryId: 7,
  summary: '  Qisqacha  ',
  description: '  Matn  ',
  submitterId: null,
  leadershipId: 20,
  familiarizerDeptIds: [3, 40],
  approvers: [{ employee_id: 11, can_edit_document: true }],
  actNumber: '',
  actDate: null,
  ...over,
});

const ctx = { branchId: 5, numberFieldShown: false, numberTaken: false };

describe('seedFamiliarizerDeptIds', () => {
  it('reads `familiarizer_departments` — the field the form writes back', () => {
    const order = {
      id: 1,
      familiarizer_departments: [{ id: 3, name: 'Kadr' }, { id: 40, name: 'IT' }],
    } as OrderAct;
    expect(seedFamiliarizerDeptIds(order)).toEqual([3, 40]);
  });

  it("draft buyruqda bo'limlar YO'QOLMAYDI (familiarizers hali yaratilmagan)", () => {
    // The regression: `familiarizers` rows only exist once the decree is
    // `confirmed`, so a draft seeded from them opened EMPTY and the following
    // PATCH sent `familiarizer_department_ids: []` — a full replace that erased
    // the saved departments.
    const draft = {
      id: 1,
      status: 'draft',
      familiarizer_departments: [{ id: 3 }, { id: 40 }],
      familiarizers: [],
    } as unknown as OrderAct;
    expect(seedFamiliarizerDeptIds(draft)).toEqual([3, 40]);
    expect(buildUpdateOrderPayload(values({ familiarizerDeptIds: seedFamiliarizerDeptIds(draft) })))
      .toMatchObject({ familiarizer_department_ids: [3, 40] });
  });

  it('an EMPTY array is authoritative — it never falls back to familiarizers', () => {
    // Familiarizers assigned by employee id (assign-familiarizers) carry no
    // departments; injecting theirs would widen the acknowledgement list.
    const order = {
      id: 1,
      familiarizer_departments: [],
      familiarizers: [{ employee: { id: 9, department: { id: 77 } } }],
    } as unknown as OrderAct;
    expect(seedFamiliarizerDeptIds(order)).toEqual([]);
  });

  it('falls back to familiarizer employees only when the field is absent, de-duplicated', () => {
    const legacy = {
      id: 1,
      familiarizers: [
        { employee: { id: 1, department: { id: 3 } } },
        { employee: { id: 2, department: { id: 3 } } },
        { employee: { id: 3 } },
      ],
    } as unknown as OrderAct;
    expect(seedFamiliarizerDeptIds(legacy)).toEqual([3]);
  });

  it('returns an empty list for a brand-new order', () => {
    expect(seedFamiliarizerDeptIds(null)).toEqual([]);
    expect(seedFamiliarizerDeptIds(undefined)).toEqual([]);
  });
});

describe('existingOrderDocuments', () => {
  it('lists uploaded attachments and hides the generated decree document', () => {
    const order = {
      id: 1,
      documents: [
        { id: 1, document_objectname: 'ariza.pdf' },
        { id: 2, document_objectname: 'decree_12.docx' },
        { id: 3 },
      ],
    } as never;
    expect(existingOrderDocuments(order).map((d) => d.id)).toEqual([1, 3]);
  });

  it('is empty when the order has no documents at all', () => {
    expect(existingOrderDocuments({ id: 1 } as never)).toEqual([]);
    expect(existingOrderDocuments(null)).toEqual([]);
  });
});

describe('validateOrderForm', () => {
  it('accepts a complete form', () => {
    expect(validateOrderForm(values(), ctx)).toBeNull();
  });

  it('requires category, description, an approver and leadership, in that order', () => {
    expect(validateOrderForm(values({ categoryId: null }), ctx))
      .toEqual({ field: 'category', messageKey: 'categoryRequired' });
    expect(validateOrderForm(values({ description: '   ' }), ctx))
      .toEqual({ field: 'description', messageKey: 'descriptionRequired' });
    expect(validateOrderForm(values({ approvers: [{ employee_id: 0, can_edit_document: false }] }), ctx))
      .toEqual({ field: 'approvers', messageKey: 'approverRequired' });
    expect(validateOrderForm(values({ leadershipId: null }), ctx))
      .toEqual({ field: 'leadership', messageKey: 'leadershipRequired' });
  });

  it('KIRITUVCHI kelishuvchi bo\'la olmaydi — backend 400 idan oldin tutiladi', () => {
    // Backend answers `submitter_cannot_be_approver`; catching it locally saves
    // a round trip on an otherwise complete form.
    expect(validateOrderForm(values({ submitterId: 11 }), ctx))
      .toEqual({ field: 'approvers', messageKey: 'submitterCannotBeApprover' });
    // A submitter who is NOT among the approvers stays valid.
    expect(validateOrderForm(values({ submitterId: 12 }), ctx)).toBeNull();
  });

  it('blocks a taken decree number only while the KADR field is on screen', () => {
    const taken = values({ actNumber: '125/2026-QQ' });
    expect(validateOrderForm(taken, { ...ctx, numberFieldShown: true, numberTaken: true }))
      .toEqual({ field: 'actNumber', messageKey: 'actNumberTaken' });
    // Empty number = backend assigns one later; nothing to block.
    expect(validateOrderForm(values(), { ...ctx, numberFieldShown: true, numberTaken: true })).toBeNull();
    // Edit mode / employee decree: the field is not rendered at all.
    expect(validateOrderForm(taken, { ...ctx, numberTaken: true })).toBeNull();
  });

  it('reports a missing branch last, once the form itself is valid', () => {
    expect(validateOrderForm(values(), { ...ctx, branchId: undefined }))
      .toEqual({ field: 'form', messageKey: 'branchNotFound' });
  });
});

describe('buildCreateOrderPayload', () => {
  it('trims text, drops empty approver rows and appends leadership last', () => {
    const payload = buildCreateOrderPayload(
      values({ approvers: [{ employee_id: 11, can_edit_document: true }, { employee_id: 0, can_edit_document: false }] }),
      { branchId: 5, creatorRole: 'employee' },
    );
    expect(payload).toEqual({
      category_id: 7,
      summary: 'Qisqacha',
      description: 'Matn',
      submitter_id: null,
      familiarizer_department_ids: [3, 40],
      assigned_signers: [
        { employee_id: 11, signer_type: 'approver', can_edit_document: true },
        { employee_id: 20, signer_type: 'leadership', can_edit_document: false },
      ],
      organization_branch_id: 5,
    });
  });

  it('sends act_number/act_date only for KADR, as a STRING (never Number())', () => {
    const hr = buildCreateOrderPayload(
      values({ actNumber: ' 125/2026-QQ ', actDate: '2026-09-08' }),
      { branchId: 5, creatorRole: 'hr' },
    );
    expect(hr.act_number).toBe('125/2026-QQ');
    expect(hr.act_date).toBe('2026-09-08');

    // Empty inputs become null so the backend keeps assigning the number itself.
    const blank = buildCreateOrderPayload(values(), { branchId: 5, creatorRole: 'hr' });
    expect(blank).toMatchObject({ act_number: null, act_date: null });
  });

  it("xodim buyrug'ida raqam/sana maydonlari umuman yuborilmaydi", () => {
    const employee = buildCreateOrderPayload(
      values({ actNumber: '125', actDate: '2026-09-08' }),
      { branchId: 5, creatorRole: 'employee' },
    );
    expect(employee).not.toHaveProperty('act_number');
    expect(employee).not.toHaveProperty('act_date');
  });

  it('summary bo\'sh bo\'lsa null yuboriladi', () => {
    expect(buildCreateOrderPayload(values({ summary: '   ' }), { branchId: 5, creatorRole: 'hr' }).summary)
      .toBeNull();
  });
});

describe('buildUpdateOrderPayload', () => {
  it('omits the branch and the KADR number/date (PATCH ignores them)', () => {
    const payload = buildUpdateOrderPayload(values({ actNumber: '125', actDate: '2026-09-08' }));
    expect(payload).not.toHaveProperty('organization_branch_id');
    expect(payload).not.toHaveProperty('act_number');
    expect(payload).not.toHaveProperty('act_date');
  });

  it('always carries familiarizer_department_ids (the backend full-replaces it)', () => {
    expect(buildUpdateOrderPayload(values()).familiarizer_department_ids).toEqual([3, 40]);
  });
});
