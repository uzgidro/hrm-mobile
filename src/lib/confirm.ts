// Minimal imperative confirm store — the in-app replacement for a two-button
// OS `Alert.alert(title, msg, [cancel, confirm])`, usable from ANYWHERE:
// components, hooks (useLetterActions), and non-React services (appUpdates.ts,
// which only has the i18n singleton). Modeled on `toast.ts` + `<ToastHost/>`.
//
//   if (await confirm({ title, message, confirmLabel, cancelLabel, destructive }))
//     doTheThing();
//
// The single <ConfirmHost/> mounted in the root layout subscribes and renders a
// ConfirmSheet for the active request. Kept as a tiny external store
// (subscribe/getSnapshot) so it works with useSyncExternalStore and is
// unit-testable without rendering. Only ONE dialog is shown at a time; a confirm
// fired while another is open is queued and shown after the first is answered.
import type { IconName } from '@/components/Icon';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  icon?: IconName;
  destructive?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (answer: boolean) => void;
}

let nextId = 1;
let active: ConfirmRequest | null = null;
const queue: ConfirmRequest[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeConfirm(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The active request as a plain snapshot for the host to render (or null). The
// `resolve` fn is included but the host only needs the display fields + id.
export function getConfirm(): ConfirmRequest | null {
  return active;
}

// Show a confirmation and resolve to the user's choice. Never rejects.
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req: ConfirmRequest = { ...opts, id: nextId++, resolve };
    if (active) {
      queue.push(req);
    } else {
      active = req;
      emit();
    }
  });
}

// Answer the ACTIVE request (true = confirm, false = cancel/dismiss), resolve
// its promise, then promote the next queued request (if any). No-op when idle.
export function answerConfirm(answer: boolean): void {
  const current = active;
  if (!current) return;
  active = queue.shift() ?? null;
  emit();
  current.resolve(answer);
}

// Force-dismiss the active request AND everything queued, resolving each to
// false. Used when the app-lock engages (a confirm must not float over the PIN
// gate) or on teardown — so every awaiting caller settles (as "cancelled")
// rather than hanging. No-op when idle.
export function dismissAllConfirms(): void {
  if (!active && queue.length === 0) return;
  const pending = active ? [active, ...queue] : [...queue];
  active = null;
  queue.length = 0;
  emit();
  for (const req of pending) req.resolve(false);
}

// Test-only: clear all state. Resolves any pending promises to false first so a
// test that awaited confirm() never hangs.
export function __resetConfirm(): void {
  dismissAllConfirms();
  nextId = 1;
}
