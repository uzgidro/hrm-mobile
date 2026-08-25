import i18n from '../i18n';
import type { ThemeColors } from '../theme/palettes';
import type { OrderAct, User } from '../types';
import { canActAsChancellery, isBranchHr, isHR, isSiteMasterAdmin } from './roles';

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
  // Kirituvchi (submitter) tasdig'i — backend `pending_submitter`. Xaritada
  // bo'lmagani uchun mobilда status o'rniga XOM kod chiqardi.
  pending_submitter:   { labelKey: 'status.orderPendingSubmitter',   kind: 'pending' },
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
  /** YARATUVCHI qoralamani oqimga yuboradi (draft → …). Web "Yuborish". */
  canSubmit: boolean;
  /** Buyruq FORMASINI tahrirlash (PATCH) — devonxona ro'yxatiga olgunicha. */
  canEdit: boolean;
  canApprove: boolean;
  /** Kirituvchi shaxs (submitter) tasdig'i — `pending_submitter` bosqichi. */
  canConfirmSubmission: boolean;
  canResubmit: boolean;
  canForward: boolean;
  canRegister: boolean;
  canAcknowledge: boolean;
  hasActions: boolean;
  docLocked: boolean;
  canEditDoc: boolean;
}

/**
 * KADR buyrug'imi (kategoriya `creator_role === 'hr'`). KADR buyrug'ida
 * DEVONXONA QADAMI YO'Q — raqam+sanani KADR yaratishda kiritadi va backend
 * `decree_register` ni 400 `hr_decree_no_chancellery` bilan rad etadi.
 */
export function isHrDecree(o: OrderAct): boolean {
  return o.category_rel?.creator_role === 'hr';
}

/**
 * "Yuborish" tugmasi buyruqni QAYERGA jo'natadi (web `decreeSubmitLabel` 1:1):
 * kirituvchi yaratuvchidan boshqa odam bo'lsa — avval o'sha kirituvchining
 * tasdig'iga; aks holda to'g'ridan kelishuvchilarga.
 */
export function decreeSubmitTarget(o: OrderAct): 'submitter' | 'approvers' {
  const submitterId = o.submitter_id ?? o.submitter?.id ?? null;
  const creatorId = o.created_by_id ?? o.created_by?.id ?? null;
  if (submitterId && creatorId && Number(submitterId) !== Number(creatorId)) return 'submitter';
  return 'approvers';
}

export function decreePermissions(
  o: OrderAct,
  employeeId?: number,
  user?: User | null,
): DecreePermissions {
  const stage = currentStageType(o);
  const stageSigners = (o.assigned_signers ?? []).filter((s) => s.signer_type === stage);
  const iAmStageSigner =
    !!stage && stageSigners.some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const iSigned = (o.signers ?? []).some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const canApprove = iAmStageSigner && !iSigned;

  const isCreator = o.created_by_id === employeeId || o.submitter_id === employeeId;
  // KIRITUVCHI tasdig'i: buyruqni boshqa shaxs nomidan kiritganda oqim
  // `pending_submitter`da to'xtaydi va FAQAT tanlangan kirituvchi uni
  // tasdiqlaydi (backend decree_confirm_submission). Mobilда bu amal yo'q edi —
  // buyruq shu bosqichda tiqilib qolardi.
  const canConfirmSubmission =
    o.status === 'pending_submitter' && !!employeeId && o.submitter_id === employeeId;
  const canResubmit = o.status === 'changes_requested' && isCreator;
  // Kelishuvchilar kelishgach yaratuvchi RAHBARIYATGA yuboradi. KADR buyrug'ida
  // buni buyruqni boshqaruvchi KADR ham qila oladi (backend
  // decree_send_to_leadership: `is_hr_decree && actor_is_hr`).
  const canForward =
    o.status === 'approved' && (isCreator || (isHrDecree(o) && isHR(user)));
  // ⚠️ RO'YXATGA OLISH = DEVONXONA amali, yaratuvchiniki EMAS. Avval bu yerda
  // `isCreator` turardi: yaratuvchi tugmani ko'rib bosardi va backend
  // 403 `not_chancellery` qaytarardi, DEVONXONA esa (yaratuvchi bo'lmagani
  // uchun) tugmani umuman ko'rmasdi — buyruq mobilда `pending_chancellery`da
  // tiqilib qolardi. Backend `_can_act_as_chancellery` bilan 1:1
  // (+ KADR buyrug'ida devonxona qadami YO'Q).
  const canRegister =
    o.status === 'pending_chancellery'
    && !isHrDecree(o)
    && (isSiteMasterAdmin(user) || canActAsChancellery(user, o.organization_branch_id));
  // Qoralamani OQIMGA yuborish — faqat yaratuvchi/kirituvchi (backend
  // `_assert_decree_creator`), KADR buyrug'ida KADR ham.
  const canSubmit =
    o.status === 'draft' && (isCreator || (isHrDecree(o) && isHR(user)));

  // TAHRIRLASH (backend `_assert_can_edit_decree` + `_assert_decree_editable`
  // bilan 1:1): muallif / kirituvchi / KADR (o'z filialida), va FAQAT devonxona
  // ro'yxatga olgunicha (muhrlangan yoki pending_chancellery/confirmed/applied
  // — yopiq). Master-admin har doim. Mobilда bu amal umuman yo'q edi.
  const isLocked =
    o.is_stamped === true
    || ['pending_chancellery', 'confirmed', 'applied'].includes(o.status ?? '');
  const canEdit = isSiteMasterAdmin(user)
    || (!isLocked && (isCreator || (isHR(user) && isBranchHr(user, o.organization_branch_id))));

  const myFam = (o.familiarizers ?? []).find(
    (f) => (f.employee_id ?? f.employee?.id) === employeeId
  );
  const canAcknowledge =
    !!myFam && !myFam.acknowledged && (o.status === 'confirmed' || o.status === 'applied');

  // `canEdit` HISOBGA OLINMAYDI: tahrir tugmasi pastdagi amal panelida emas,
  // tafsilot ichida turadi (web bilan bir xil joylashuv).
  const hasActions =
    canSubmit || canApprove || canConfirmSubmission || canResubmit || canForward
    || canRegister || canAcknowledge;

  const docLocked =
    o.status === 'confirmed' || o.status === 'applied' || o.status === 'rejected';
  const canEditDoc = !docLocked && (isCreator || canApprove);

  return {
    canSubmit,
    canEdit,
    canApprove,
    canConfirmSubmission,
    canResubmit,
    canForward,
    canRegister,
    canAcknowledge,
    hasActions,
    docLocked,
    canEditDoc,
  };
}

/**
 * Buyruq shu foydalanuvchi uchun YANGImi — web `rowIsUnseen` bilan bir xil:
 * amalini kutayotgan (ochib ko'rish o'chirmaydi) YOKI hech ochilmagan /
 * oxirgi ochilishdan keyin o'zgargan.
 */
export function isOrderUnseen(o: OrderAct, employeeId?: number): boolean {
  return needsMyAction(o, employeeId) || o.is_unseen === true;
}

// Does the given employee need to act on this decree right now?
export function needsMyAction(o: OrderAct, employeeId?: number): boolean {
  // Backend har bir qator uchun `action_required` ni JORIY foydalanuvchiga
  // hisoblab beradi (web BuyruqlarTable ham shundan foydalanadi) — u quyidagi
  // mijoz mantiqidan kengroq (masalan devonxona ro'yxatga olishi). Bayroq
  // bo'lmasa (eski javob/kesh) — quyidagi tekshiruvlar ishlaydi.
  if (o.action_required === true) return true;
  if (!employeeId) return false;
  const stage = currentStageType(o);
  if (stage) {
    const stageSigners = (o.assigned_signers ?? []).filter((s) => s.signer_type === stage);
    const assigned = stageSigners.some((s) => s.employee_id === employeeId || s.employee?.id === employeeId);
    const alreadySigned = (o.signers ?? []).some((s) => s.employee_id === employeeId || s.employee?.id === employeeId);
    if (assigned && !alreadySigned) return true;
  }
  // kirituvchi shaxs tasdiqlashi kerak
  if (o.status === 'pending_submitter' && o.submitter_id === employeeId) return true;
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
