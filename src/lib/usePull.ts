import { useCallback, useState } from 'react';

/**
 * The pull-to-refresh spinner, shown for the person's own pull only. Bound to `isRefetching`
 * it would also drop down on every background refresh — on a live screen, all the time.
 */
export function usePull(): { pulling: boolean; pull: (run: () => Promise<unknown>) => Promise<void> } {
  const [pulling, setPulling] = useState(false);
  const pull = useCallback(async (run: () => Promise<unknown>) => {
    setPulling(true);
    try {
      await run();
    } finally {
      setPulling(false);
    }
  }, []);
  return { pulling, pull };
}
