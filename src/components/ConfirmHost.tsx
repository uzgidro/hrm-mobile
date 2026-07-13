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
    <ConfirmSheet
      // Keep the sheet mounted; `visible` toggles so the exit/enter animation
      // runs. The key resets internal animation state per distinct request.
      key={active?.id ?? 'none'}
      visible={active !== null}
      title={active?.title ?? ''}
      message={active?.message}
      confirmLabel={active?.confirmLabel ?? ''}
      cancelLabel={active?.cancelLabel ?? ''}
      icon={active?.icon}
      destructive={active?.destructive}
      onConfirm={() => answerConfirm(true)}
      onCancel={() => answerConfirm(false)}
    />
  );
}
