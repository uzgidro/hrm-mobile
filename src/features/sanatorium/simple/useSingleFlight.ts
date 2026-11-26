// Runs an async action at most once at a time: a second tap while the first one is still in flight
// is ignored (a state flag alone is one render late, so a ref guards the gap).
import { useCallback, useRef, useState } from 'react';

export function useSingleFlight() {
  const flying = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (flying.current) return undefined;
    flying.current = true;
    setPending(true);
    try {
      return await fn();
    } finally {
      flying.current = false;
      setPending(false);
    }
  }, []);
  return { run, pending };
}
