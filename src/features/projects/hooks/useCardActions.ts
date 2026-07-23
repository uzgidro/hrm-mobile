import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { confirm } from '@/lib/confirm';
import { completeCard, uncompleteCard, rejectCard } from '../api/mutations';
import { projectKeys } from '../api/queries';

// Card status workflow for the card-detail screen — mirrors useLetterActions 1:1:
//   setBusy(true) → await fn() → invalidate projectKeys.all + refetch → Alert
//   catch → parse `detail` (string | [{msg}]) → Alert (surfaces the backend's
//           assignee-only 403 message cleanly, no special handling)
//   finally → setBusy(false)
// The backend enforces who may act (assignee/creator/admin); if the client shows
// a button the user can't use, the 403 detail is shown as-is. `reject` confirms
// first (destructive). Invalidating projectKeys.all refreshes the board columns,
// the card list and the open detail via the hierarchical key; `refetch` updates
// the detail immediately.
export function useCardActions(cardId: number, refetch: () => void) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, msg: string) => {
      setBusy(true);
      try {
        await fn();
        qc.invalidateQueries({ queryKey: projectKeys.all });
        refetch();
        Alert.alert(t('projects.actionDoneTitle'), msg);
      } catch (e) {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        const m = Array.isArray(detail) ? (detail[0] as { msg?: unknown })?.msg : (detail ?? t('projects.actionError'));
        Alert.alert(t('projects.actionError'), typeof m === 'string' ? m : t('projects.actionError'));
      } finally {
        setBusy(false);
      }
    },
    [qc, refetch, t]
  );

  const complete = useCallback(() => run(() => completeCard(cardId), t('projects.completed')), [run, cardId, t]);
  const uncomplete = useCallback(() => run(() => uncompleteCard(cardId), t('projects.uncompleted')), [run, cardId, t]);

  const reject = useCallback(async () => {
    const ok = await confirm({
      title: t('projects.rejectConfirmTitle'),
      message: t('projects.rejectConfirmMessage'),
      confirmLabel: t('projects.reject'),
      cancelLabel: t('common.cancel'),
      icon: 'close',
      destructive: true,
    });
    if (!ok) return;
    run(() => rejectCard(cardId), t('projects.rejected'));
  }, [run, cardId, t]);

  return { busy, complete, uncomplete, reject };
}
