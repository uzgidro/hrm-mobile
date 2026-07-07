// Minimal imperative toast store — no external library, no Reanimated.
//
// `toast.error(msg)` / `toast.success(msg)` can be called from anywhere
// (mutation handlers, the QueryCache/MutationCache onError, catch blocks). The
// single <ToastHost/> mounted in the root layout subscribes and renders the
// queue. Kept as a tiny external store (subscribe/getSnapshot) so it works with
// React's useSyncExternalStore and is unit-testable without rendering.

export type ToastKind = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_DURATION = 3500;

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
// id → timeout handle, so a manual dismiss can cancel the auto-dismiss.
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismissToast(id: number): void {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  const next = toasts.filter((x) => x.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

function push(kind: ToastKind, message: string, duration = DEFAULT_DURATION): number {
  const msg = (message ?? '').toString().trim();
  if (!msg) return -1;
  // Collapse an identical back-to-back message (e.g. two queries failing with
  // the same server error) into the one already on screen instead of stacking.
  const dup = toasts.find((t) => t.kind === kind && t.message === msg);
  if (dup) return dup.id;

  const id = nextId++;
  toasts = [...toasts, { id, kind, message: msg }];
  emit();
  timers.set(
    id,
    setTimeout(() => dismissToast(id), duration)
  );
  return id;
}

export const toast = {
  error: (message: string, duration?: number) => push('error', message, duration),
  success: (message: string, duration?: number) => push('success', message, duration),
  info: (message: string, duration?: number) => push('info', message, duration),
};

// Test-only: reset all state between tests.
export function __resetToasts(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  toasts = [];
  nextId = 1;
  emit();
}
