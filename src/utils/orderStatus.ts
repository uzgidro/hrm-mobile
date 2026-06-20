import type { ThemeColors } from '../theme/palettes';
import type { OrderAct } from '../types';

export type StatusKind = 'pending' | 'info' | 'success' | 'error' | 'neutral';

export const ORDER_STATUS_META: Record<string, { label: string; kind: StatusKind }> = {
  draft:               { label: 'Qoralama',                    kind: 'neutral' },
  pending_approval:    { label: 'Kelishish kutilmoqda',        kind: 'pending' },
  pending_leadership:  { label: 'Rahbariyat imzosi kutilmoqda', kind: 'pending' },
  pending_chancellery: { label: 'Kanselyariya kutilmoqda',     kind: 'info' },
  approved:            { label: 'Kelishildi',                  kind: 'info' },
  confirmed:           { label: "Ro'yxatga olingan",          kind: 'success' },
  applied:             { label: "Qo'llanildi",                 kind: 'success' },
  changes_requested:   { label: "O'zgartirish so'raldi",      kind: 'error' },
  rejected:            { label: 'Rad etildi',                  kind: 'error' },
  // work-leave style fallbacks
  pending:             { label: 'Kutilmoqda',                  kind: 'pending' },
  signed:              { label: 'Imzolandi',                   kind: 'success' },
};

export function statusMeta(status?: string) {
  return ORDER_STATUS_META[status ?? ''] ?? { label: status || 'Noma\'lum', kind: 'neutral' as StatusKind };
}

export function statusColor(kind: StatusKind, c: ThemeColors): { fg: string; bg: string } {
  switch (kind) {
    case 'pending': return { fg: c.warning, bg: c.warningSoft };
    case 'info':    return { fg: c.info,    bg: c.primarySoft };
    case 'success': return { fg: c.success, bg: c.successSoft };
    case 'error':   return { fg: c.error,   bg: c.errorSoft };
    default:        return { fg: c.textSecondary, bg: c.cardBorder };
  }
}

// Which signer_type is acting at the current stage.
export function currentStageType(o: OrderAct): 'approver' | 'leadership' | null {
  if (o.status === 'pending_approval') return 'approver';
  if (o.status === 'pending_leadership') return 'leadership';
  return null;
}

// Does the given employee need to act on this decree right now?
export function needsMyAction(o: OrderAct, employeeId?: number): boolean {
  if (!employeeId) return false;
  const stage = currentStageType(o);
  if (stage) {
    const stageSigners = (o.assigned_signers ?? []).filter((s) => s.signer_type === stage);
    const assigned = stageSigners.some((s) => s.employee_id === employeeId || s.employee?.id === employeeId);
    const alreadySigned = (o.signers ?? []).some((s) => s.employee_id === employeeId || s.employee?.id === employeeId);
    if (assigned && !alreadySigned) return true;
  }
  // creator must resubmit
  if (o.status === 'changes_requested' && (o.created_by_id === employeeId || o.submitter_id === employeeId)) {
    return true;
  }
  // familiarizer must acknowledge
  if ((o.status === 'confirmed' || o.status === 'applied')) {
    const fam = (o.familiarizers ?? []).find((f) => f.employee_id === employeeId || f.employee?.id === employeeId);
    if (fam && !fam.acknowledged) return true;
  }
  return false;
}
