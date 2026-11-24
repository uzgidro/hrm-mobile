import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs `fn` at most once in `every` ms, `soon` ms after the first call of a quiet spell. Calls
 * in between share one run, and the last of them is never lost.
 */
export function useThrottled(fn: () => void, every: number, soon = Math.min(every, 700)): () => void {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ranAt = useRef(0);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback(() => {
    if (timer.current) return;
    const wait = Math.max(soon, every - (Date.now() - ranAt.current));
    timer.current = setTimeout(() => {
      timer.current = null;
      ranAt.current = Date.now();
      latest.current();
    }, wait);
  }, [every, soon]);
}
