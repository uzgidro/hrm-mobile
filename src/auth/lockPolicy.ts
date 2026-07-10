// App-lock (PIN) policy — the single source of truth for the lock feature's
// numbers and rules (PIN shape, attempt allowance, background re-lock window).
// Pure constants + functions with zero imports so it stays trivially testable;
// change policy here, never inline in screens or stores.

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
// Re-lock after 1 minute in background.
export const RELOCK_AFTER_MS = 60_000;

const PIN_REGEX = new RegExp(`^\\d{${PIN_LENGTH}}$`);

// True iff the app has been backgrounded (backgroundedAt != null) for at least
// RELOCK_AFTER_MS by `now`.
export function shouldRelock(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt != null && now - backgroundedAt >= RELOCK_AFTER_MS;
}

// How many PIN attempts are left, clamped at 0 (never negative). Callers feed
// this parsed storage values — a non-finite count (NaN from corrupt storage)
// is treated as "no failures" rather than poisoning the UI with NaN.
export function attemptsRemaining(failedAttempts: number): number {
  const n = Number.isFinite(failedAttempts) ? failedAttempts : 0;
  return Math.max(0, MAX_ATTEMPTS - n);
}

// A valid PIN is exactly PIN_LENGTH digits.
export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}
