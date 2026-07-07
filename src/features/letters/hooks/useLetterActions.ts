import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { signLetter, rejectLetter } from '../api/mutations';
import { letterKeys } from '../api/queries';

// Encapsulates the letter sign/reject workflow — the extracted, web-parity flow.
//
// It mirrors the old letter-detail `run(fn, msg)` helper 1:1:
//   setBusy(true) → await fn() → invalidate + refetch → Alert('Bajarildi', msg)
//   catch → parse `detail` (string | [{msg}]) → Alert('Xatolik', msg)
//   finally → setBusy(false)
// A single `busy` flag gates both actions. Invalidation hits `letterKeys.all`
// (which the detail + list both live under) AND calls the passed `refetch` so
// the open detail updates immediately — matching the old
// invalidate(['letter-detail',id]) + invalidate(['letters']) + refetch().
//
// `reject` shows the destructive confirmation Alert before firing, exactly like
// the old onReject. The two Uzbek success strings are preserved verbatim.
export function useLetterActions(letterId: number, refetch: () => void) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, msg: string) => {
      setBusy(true);
      try {
        await fn();
        qc.invalidateQueries({ queryKey: letterKeys.all });
        refetch();
        Alert.alert('Bajarildi', msg);
      } catch (e) {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        const m = Array.isArray(detail) ? (detail[0] as { msg?: unknown })?.msg : (detail ?? 'Xatolik');
        Alert.alert('Xatolik', typeof m === 'string' ? m : 'Xatolik');
      } finally {
        setBusy(false);
      }
    },
    [qc, refetch]
  );

  const sign = useCallback(() => run(() => signLetter(letterId), 'Imzolandi'), [run, letterId]);

  const reject = useCallback(() => {
    Alert.alert('Rad etish', 'Xatni rad etishni tasdiqlaysizmi?', [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Rad etish', style: 'destructive', onPress: () => run(() => rejectLetter(letterId), 'Rad etildi') },
    ]);
  }, [run, letterId]);

  return { busy, sign, reject };
}
