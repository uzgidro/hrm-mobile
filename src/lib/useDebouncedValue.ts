import { useEffect, useState } from 'react';

/** Trails `value` by `delayMs`; used to turn a search box into a server
 *  query without a request per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
