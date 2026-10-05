// Single confirm host, mounted once in the root layout next to <ToastHost/>.
// Subscribes to the imperative confirm store and renders a ConfirmSheet for the
// active request; the sheet's buttons answer the store, which resolves the
// pending confirm() promise and promotes any queued request.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { subscribeConfirm, getConfirm, answerConfirm } from '@/lib/confirm';

/**
 * react-native-web's Modal creates its portal `<div>` when the component MOUNTS
 * (even while `visible` is false) and appends it to `document.body`. The host is
 * mounted at app start, so its portal sat FIRST in the body and every Sheet opened
 * later covered it: a confirm() fired from inside a sheet was invisible and the
 * action looked dead. On web the sheet is remounted per request so its portal is
 * appended last (on top). Native modals stack in presentation order — keep the
 * stable mount there for the entrance animation.
 */
export function confirmSheetKey(os: string, activeId: number | null | undefined): string {
  return os === 'web' ? `confirm-${activeId ?? 'idle'}` : 'confirm';
}

export function ConfirmHost() {
  const active = useSyncExternalStore(subscribeConfirm, getConfirm, getConfirm);

  return (
    // One stable ConfirmSheet instance: `visible` drives its enter (slide-up +
    // fade) and its reset on close. A prior version keyed it by request id, which
    // remounted the sheet on every open/close and skipped the entrance animation
    // — the stable mount lets `visible` toggling animate as designed.
    <ConfirmSheet
      key={confirmSheetKey(Platform.OS, active?.id)}
      visible={active !== null}
      title={active?.title ?? ''}
      message={active?.message}
      confirmLabel={active?.confirmLabel ?? ''}
      cancelLabel={active?.cancelLabel ?? ''}
      icon={active?.icon}
      destructive={active?.destructive}
      // Pass the request id so a second handler firing in the same tick (button
      // + backdrop + back button) can't answer the next promoted request.
      onConfirm={() => answerConfirm(true, active?.id)}
      onCancel={() => answerConfirm(false, active?.id)}
    />
  );
}
