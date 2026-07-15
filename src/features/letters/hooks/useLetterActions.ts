import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { confirm } from '@/lib/confirm';
import { signLetter, rejectLetter } from '../api/mutations';
import { letterKeys } from '../api/queries';

// Encapsulates the letter sign/reject workflow — the extracted, web-parity flow.
//
// It mirrors the old letter-detail `run(fn, msg)` helper 1:1:
//   setBusy(true) → await fn() → invalidate + refetch → Alert(done, msg)
//   catch → parse `detail` (string | [{msg}]) → Alert(error, msg)
//   finally → setBusy(false)
// A single `busy` flag gates both actions. Invalidation hits `letterKeys.all`
// (which the detail + list both live under) AND calls the passed `refetch` so
// the open detail updates immediately — matching the old
// invalidate(['letter-detail',id]) + invalidate(['letters']) + refetch().
//
// `reject` awaits the global confirm() sheet before firing (destructive) —
// replacing the old OS confirmation Alert. The done/error notices stay as
// Alert. Copy is localized via t().
export function useLetterActions(letterId: number, refetch: () => void) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, msg: string) => {
      setBusy(true);
      try {
        await fn();
        qc.invalidateQueries({ queryKey: letterKeys.all });
        refetch();
        Alert.alert(t('letters.actionDoneTitle'), msg);
      } catch (e) {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        const m = Array.isArray(detail) ? (detail[0] as { msg?: unknown })?.msg : (detail ?? t('letters.actionError'));
        Alert.alert(t('letters.actionError'), typeof m === 'string' ? m : t('letters.actionError'));
      } finally {
        setBusy(false);
      }
    },
    [qc, refetch, t]
  );

  const sign = useCallback(() => run(() => signLetter(letterId), t('letters.signed')), [run, letterId, t]);

  const reject = useCallback(async () => {
    const ok = await confirm({
      title: t('letters.rejectConfirmTitle'),
      message: t('letters.rejectConfirmMessage'),
      confirmLabel: t('letters.reject'),
      cancelLabel: t('common.cancel'),
      icon: 'close',
      destructive: true,
    });
    if (!ok) return;
    run(() => rejectLetter(letterId), t('letters.rejected'));
  }, [run, letterId, t]);

  return { busy, sign, reject };
}
