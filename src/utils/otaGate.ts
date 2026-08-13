// Pure decision core + timeout helper for the synchronous OTA gate. Kept free
// of expo-updates so the async orchestration in src/services/otaUpdates.ts can
// be reasoned about (and this logic unit-tested) without the native module.

// Cold-start OTA apply is bounded: a slow/broken network must never hang the
// splash forever. After this many ms we give up and launch on the current
// bundle.
export const OTA_GATE_TIMEOUT_MS = 10000;

// OTA can only apply on a native production build with updates enabled. Dev
// builds (dev-client / Expo Go) and web never receive OTAs, so the gate is a
// no-op there — launch must not be delayed.
export function shouldRunOtaGate(input: {
  isEnabled: boolean;
  platformOS: string;
  isDev: boolean;
}): boolean {
  if (!input.isEnabled) return false;
  if (input.isDev) return false;
  if (input.platformOS !== 'android' && input.platformOS !== 'ios') return false;
  return true;
}

// Race `promise` against a timer. Resolves to the promise's value if it settles
// first; otherwise (timeout OR rejection) resolves to `fallback`. Never rejects
// — the caller (startup) must always get a value and continue.
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const done = (v: T) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = setTimeout(() => done(fallback), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        done(v);
      })
      .catch(() => {
        clearTimeout(timer);
        done(fallback);
      });
  });
}
