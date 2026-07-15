// Single confirm host, mounted once in the root layout next to <ToastHost/>.
// Subscribes to the imperative confirm store and renders a ConfirmSheet for the
// active request; the sheet's buttons answer the store, which resolves the
// pending confirm() promise and promotes any queued request.
import { useSyncExternalStore } from 'react';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { subscribeConfirm, getConfirm, answerConfirm } from '@/lib/confirm';

export function ConfirmHost() {
  const active = useSyncExternalStore(subscribeConfirm, getConfirm, getConfirm);

  return (
    // One stable ConfirmSheet instance: `visible` drives its enter (slide-up +
    // fade) and its reset on close. A prior version keyed it by request id, which
    // remounted the sheet on every open/close and skipped the entrance animation
    // — the stable mount lets `visible` toggling animate as designed.
    <ConfirmSheet
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
