import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import {
  approveDecree,
  rejectDecree,
  resubmitDecree,
  forwardDecree,
  acknowledgeDecree,
  registerDecree,
} from '../api/mutations';
import { orderKeys } from '../api/queries';

// Encapsulates the decree approval chain — the extracted, web-parity workflow.
//
// It mirrors the old order-detail `runAction(fn, successMsg)` helper 1:1:
//   setBusy(true) → await fn() → invalidate + refetch → Alert('Bajarildi', msg)
//   catch → parse `detail` (string | [{msg}]) → Alert('Xatolik', msg)
//   finally → setBusy(false)
// A single `busy` flag gates all six actions. Invalidation hits `orderKeys.all`
// (which the detail + list both live under) AND calls the passed `refetch` so
// the open detail updates immediately — matching the old
// invalidate(['order-detail',id]) + invalidate(['order-acts']) + refetch().
//
// The six Uzbek success strings are preserved verbatim.
export function useDecreeActions(orderId: number, refetch: () => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string) => {
      setBusy(true);
      try {
        await fn();
        qc.invalidateQueries({ queryKey: orderKeys.all });
        refetch();
        Alert.alert(i18n.t('orders.actionDoneTitle'), successMsg);
      } catch (e) {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        const msg = Array.isArray(detail)
          ? (detail[0] as { msg?: unknown })?.msg
          : (detail ?? i18n.t('orders.actionError'));
        Alert.alert(i18n.t('errors.generic'), typeof msg === 'string' ? msg : i18n.t('orders.actionError'));
      } finally {
        setBusy(false);
      }
    },
    [qc, refetch]
  );

  const approve = useCallback(
    () => runAction(() => approveDecree(orderId), i18n.t('orders.approveSuccess')),
    [runAction, orderId]
  );

  // Validates a non-empty reason (Alert 'Sababni kiriting') before firing, then
  // sends the trimmed comment. Returns the runAction promise for the caller.
  const reject = useCallback(
    (reason: string) => {
      const trimmed = reason.trim();
      if (!trimmed) {
        Alert.alert(i18n.t('orders.validationTitle'), i18n.t('orders.reasonRequired'));
        return Promise.resolve();
      }
      return runAction(() => rejectDecree(orderId, trimmed), i18n.t('orders.rejectSuccess'));
    },
    [runAction, orderId]
  );

  const resubmit = useCallback(
    () => runAction(() => resubmitDecree(orderId), i18n.t('orders.resubmitSuccess')),
    [runAction, orderId]
  );

  const forward = useCallback(
    () => runAction(() => forwardDecree(orderId), i18n.t('orders.forwardSuccess')),
    [runAction, orderId]
  );

  const acknowledge = useCallback(
    () => runAction(() => acknowledgeDecree(orderId), i18n.t('orders.acknowledgeSuccess')),
    [runAction, orderId]
  );

  // act_number is optional — an empty/blank string registers with `{}`.
  const register = useCallback(
    (actNumber: string) => {
      const trimmed = actNumber.trim();
      return runAction(
        () => registerDecree(orderId, trimmed ? Number(trimmed) : undefined),
        i18n.t('orders.registerSuccess')
      );
    },
    [runAction, orderId]
  );

  return { busy, approve, reject, resubmit, forward, acknowledge, register };
}
