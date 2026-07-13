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
  // Usually one resolver; a duplicate confirm() (same title+message fired again
  // before the first is answered — e.g. a double-tap) attaches its resolver here
  // instead of stacking a second dialog, so all awaiters settle on one answer.
  resolvers: ((answer: boolean) => void)[];
}

function isSameDialog(a: ConfirmRequest, o: ConfirmOptions): boolean {
  return a.title === o.title && a.message === o.message;
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
// A confirm() identical (same title+message) to the active or a queued request
// is de-duplicated: its promise rides along with the existing one rather than
// opening a second sheet. This collapses a double-tap (the button stays enabled
// during the await-confirm window) into a single dialog and a single answer.
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const existing =
      (active && isSameDialog(active, opts) && active) ||
      queue.find((q) => isSameDialog(q, opts));
    if (existing) {
      existing.resolvers.push(resolve);
      return;
    }
    const req: ConfirmRequest = { ...opts, id: nextId++, resolvers: [resolve] };
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
//
// `requestId` guards against re-entrancy: the sheet wires the same answer to a
// button, the backdrop, and the Android back button, so two can fire in one tick
// — without the guard the second call would answer the NEXT promoted request
// with the wrong answer. Passing the id the handler was rendered for makes a
// stale second call a no-op.
export function answerConfirm(answer: boolean, requestId?: number): void {
  const current = active;
  if (!current) return;
  if (requestId !== undefined && requestId !== current.id) return;
  active = queue.shift() ?? null;
  emit();
  for (const resolve of current.resolvers) resolve(answer);
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
  for (const req of pending) for (const resolve of req.resolvers) resolve(false);
}

// Test-only: clear all state. Resolves any pending promises to false first so a
// test that awaited confirm() never hangs.
export function __resetConfirm(): void {
  dismissAllConfirms();
  nextId = 1;
}
