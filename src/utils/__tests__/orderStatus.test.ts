import {
  ORDER_STATUS_META,
  statusMeta,
  statusColor,
  currentStageType,
  needsMyAction,
  type StatusKind,
} from '../orderStatus';
import type { OrderAct } from '../../types';

// Minimal fake theme colors matching only the keys statusColor reads.
const colors: any = {
  warning: '#warning',
  warningSoft: '#warningSoft',
  info: '#info',
  primarySoft: '#primarySoft',
  success: '#success',
  successSoft: '#successSoft',
  error: '#error',
  errorSoft: '#errorSoft',
  textSecondary: '#textSecondary',
  cardBorder: '#cardBorder',
};

const order = (o: Partial<OrderAct>): OrderAct => ({ id: 1, ...o }) as OrderAct;

describe('ORDER_STATUS_META', () => {
  it('locks in every known status label + kind', () => {
    expect(ORDER_STATUS_META).toEqual({
      draft: { label: 'Qoralama', kind: 'neutral' },
      pending_approval: { label: 'Kelishish kutilmoqda', kind: 'pending' },
      pending_leadership: { label: 'Rahbariyat imzosi kutilmoqda', kind: 'pending' },
      pending_chancellery: { label: 'Kanselyariya kutilmoqda', kind: 'info' },
      approved: { label: 'Kelishildi', kind: 'info' },
      confirmed: { label: "Ro'yxatga olingan", kind: 'success' },
      applied: { label: "Qo'llanildi", kind: 'success' },
      changes_requested: { label: "O'zgartirish so'raldi", kind: 'error' },
      rejected: { label: 'Rad etildi', kind: 'error' },
      pending: { label: 'Kutilmoqda', kind: 'pending' },
      signed: { label: 'Imzolandi', kind: 'success' },
    });
  });
});

describe('statusMeta', () => {
  it('returns the meta for each known status', () => {
    for (const key of Object.keys(ORDER_STATUS_META)) {
      expect(statusMeta(key)).toBe(ORDER_STATUS_META[key]);
    }
  });

  it('falls back to the raw status string as label with neutral kind for unknown', () => {
    expect(statusMeta('mystery')).toEqual({ label: 'mystery', kind: 'neutral' });
  });

  it("uses \"Noma'lum\" label when status is undefined", () => {
    expect(statusMeta(undefined)).toEqual({ label: "Noma'lum", kind: 'neutral' });
  });

  it("uses \"Noma'lum\" label when status is empty string", () => {
    expect(statusMeta('')).toEqual({ label: "Noma'lum", kind: 'neutral' });
  });
});

describe('statusColor', () => {
  it('maps pending to warning colors', () => {
    expect(statusColor('pending', colors)).toEqual({ fg: '#warning', bg: '#warningSoft' });
  });
  it('maps info to info/primarySoft colors', () => {
    expect(statusColor('info', colors)).toEqual({ fg: '#info', bg: '#primarySoft' });
  });
  it('maps success to success colors', () => {
    expect(statusColor('success', colors)).toEqual({ fg: '#success', bg: '#successSoft' });
  });
  it('maps error to error colors', () => {
    expect(statusColor('error', colors)).toEqual({ fg: '#error', bg: '#errorSoft' });
  });
  it('maps neutral (default) to textSecondary/cardBorder', () => {
    expect(statusColor('neutral', colors)).toEqual({ fg: '#textSecondary', bg: '#cardBorder' });
  });
  it('maps any unrecognised kind to the default branch', () => {
    expect(statusColor('bogus' as StatusKind, colors)).toEqual({
      fg: '#textSecondary',
      bg: '#cardBorder',
    });
  });
});

describe('currentStageType', () => {
  it('returns approver for pending_approval', () => {
    expect(currentStageType(order({ status: 'pending_approval' }))).toBe('approver');
  });
  it('returns leadership for pending_leadership', () => {
    expect(currentStageType(order({ status: 'pending_leadership' }))).toBe('leadership');
  });
  it('returns null for any other status', () => {
    expect(currentStageType(order({ status: 'approved' }))).toBeNull();
    expect(currentStageType(order({ status: undefined }))).toBeNull();
  });
});

describe('needsMyAction', () => {
  it('returns false when employeeId is missing', () => {
    expect(needsMyAction(order({ status: 'pending_approval' }))).toBe(false);
    expect(needsMyAction(order({ status: 'pending_approval' }), 0)).toBe(false);
  });

  it('returns true when employee is an assigned stage signer and has not signed', () => {
    const o = order({
      status: 'pending_approval',
      assigned_signers: [{ signer_type: 'approver', employee_id: 7 }],
      signers: [],
    });
    expect(needsMyAction(o, 7)).toBe(true);
  });

  it('matches assigned signer via nested employee.id too', () => {
    const o = order({
      status: 'pending_leadership',
      assigned_signers: [{ signer_type: 'leadership', employee: { id: 9, legal_name: 'A' } as any }],
      signers: [],
    });
    expect(needsMyAction(o, 9)).toBe(true);
  });

  it('returns false when assigned signer has already signed', () => {
    const o = order({
      status: 'pending_approval',
      assigned_signers: [{ signer_type: 'approver', employee_id: 7 }],
      signers: [{ employee_id: 7 }],
    });
    expect(needsMyAction(o, 7)).toBe(false);
  });

  it('ignores signers assigned to a different stage type', () => {
    const o = order({
      status: 'pending_approval',
      assigned_signers: [{ signer_type: 'leadership', employee_id: 7 }],
      signers: [],
    });
    expect(needsMyAction(o, 7)).toBe(false);
  });

  it('returns true for the creator when changes_requested', () => {
    expect(needsMyAction(order({ status: 'changes_requested', created_by_id: 5 }), 5)).toBe(true);
  });

  it('returns true for the submitter when changes_requested', () => {
    expect(needsMyAction(order({ status: 'changes_requested', submitter_id: 6 }), 6)).toBe(true);
  });

  it('returns false for an unrelated employee when changes_requested', () => {
    expect(needsMyAction(order({ status: 'changes_requested', created_by_id: 5 }), 99)).toBe(false);
  });

  it('returns true for an unacknowledged familiarizer on confirmed', () => {
    const o = order({
      status: 'confirmed',
      familiarizers: [{ employee_id: 3, acknowledged: false }],
    });
    expect(needsMyAction(o, 3)).toBe(true);
  });

  it('returns true for an unacknowledged familiarizer on applied', () => {
    const o = order({
      status: 'applied',
      familiarizers: [{ employee: { id: 3, legal_name: 'B' } as any, acknowledged: false }],
    });
    expect(needsMyAction(o, 3)).toBe(true);
  });

  it('returns false when familiarizer has already acknowledged', () => {
    const o = order({
      status: 'confirmed',
      familiarizers: [{ employee_id: 3, acknowledged: true }],
    });
    expect(needsMyAction(o, 3)).toBe(false);
  });

  it('returns false for any non-actionable status', () => {
    expect(needsMyAction(order({ status: 'approved' }), 1)).toBe(false);
  });
});
