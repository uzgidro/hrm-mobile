import i18n from '../i18n';
import type { ThemeColors } from '../theme/palettes';
import type { OrderAct } from '../types';

export type StatusKind = 'pending' | 'info' | 'success' | 'error' | 'neutral';

// i18n note: the order-act status CODES (the Record keys: 'draft',
// 'pending_approval', …) are contract identifiers shared with the backend/web
// dashboard and are NOT translated. Only the human-readable label is localized.
// We store a `labelKey` (dotted path into the `status` namespace) rather than a
// literal, and resolve it via i18n.t() at call time in statusMeta(), so the
// label follows the current language.
//
// Reactivity contract: because the label is computed in a plain function (not
// a hook), a component only re-computes it when it re-renders. i18n.changeLanguage
// does NOT by itself re-render components that merely call this util. Therefore
// any SCREEN that renders these labels must subscribe to language changes by
// calling `useTranslation()` from react-i18next (even if it doesn't use the
// returned `t` directly) — that hook re-renders the component on 'languageChanged',
// which re-runs statusMeta() and refreshes the label. Feature waves add that
// hook per screen. This keeps the util itself pure/React-free.
export const ORDER_STATUS_META: Record<string, { labelKey: string; kind: StatusKind }> = {
  draft:               { labelKey: 'status.orderDraft',              kind: 'neutral' },
  pending_approval:    { labelKey: 'status.orderPendingApproval',    kind: 'pending' },
  pending_leadership:  { labelKey: 'status.orderPendingLeadership',  kind: 'pending' },
  pending_chancellery: { labelKey: 'status.orderPendingChancellery', kind: 'info' },
  approved:            { labelKey: 'status.orderApproved',           kind: 'info' },
  confirmed:           { labelKey: 'status.orderConfirmed',          kind: 'success' },
  applied:             { labelKey: 'status.orderApplied',            kind: 'success' },
  changes_requested:   { labelKey: 'status.orderChangesRequested',   kind: 'error' },
  rejected:            { labelKey: 'status.orderRejected',           kind: 'error' },
  // work-leave style fallbacks
  pending:             { labelKey: 'status.orderPending',            kind: 'pending' },
  signed:              { labelKey: 'status.orderSigned',             kind: 'success' },
};

export function statusMeta(status?: string): { label: string; kind: StatusKind } {
  const meta = ORDER_STATUS_META[status ?? ''];
  if (meta) return { label: i18n.t(meta.labelKey), kind: meta.kind };
  return { label: status || i18n.t('status.unknown'), kind: 'neutral' };
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

// Every action/edit permission the decree detail screen derives from
// (order, employeeId). Extracted verbatim from the old inline OrderDetailScreen
// logic so the web-parity approval chain lives in one tested place. Backend
// permissions remain the final authority; these only decide which buttons and
// which editor mode to offer.
export interface DecreePermissions {
  canApprove: boolean;
  canResubmit: boolean;
  canForward: boolean;
  canRegister: boolean;
  canAcknowledge: boolean;
  hasActions: boolean;
  docLocked: boolean;
  canEditDoc: boolean;
}

export function decreePermissions(o: OrderAct, employeeId?: number): DecreePermissions {
  const stage = currentStageType(o);
  const stageSigners = (o.assigned_signers ?? []).filter((s) => s.signer_type === stage);
  const iAmStageSigner =
    !!stage && stageSigners.some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const iSigned = (o.signers ?? []).some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const canApprove = iAmStageSigner && !iSigned;

  const isCreator = o.created_by_id === employeeId || o.submitter_id === employeeId;
  const canResubmit = o.status === 'changes_requested' && isCreator;
  const canForward = o.status === 'approved' && isCreator;
  const canRegister = o.status === 'pending_chancellery' && isCreator;

  const myFam = (o.familiarizers ?? []).find(
    (f) => (f.employee_id ?? f.employee?.id) === employeeId
  );
  const canAcknowledge =
    !!myFam && !myFam.acknowledged && (o.status === 'confirmed' || o.status === 'applied');

  const hasActions = canApprove || canResubmit || canForward || canRegister || canAcknowledge;

  const docLocked =
    o.status === 'confirmed' || o.status === 'applied' || o.status === 'rejected';
  const canEditDoc = !docLocked && (isCreator || canApprove);

  return {
    canApprove,
    canResubmit,
    canForward,
    canRegister,
    canAcknowledge,
    hasActions,
    docLocked,
    canEditDoc,
  };
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
