import { useCallback, useEffect, useRef, useState } from 'react';

/** Run an API call on mount / when `deps` change. Ignores results of stale calls. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useRef(0);

  const load = useCallback(() => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    fn().then(
      (d) => { if (id === run.current) { setData(d); setLoading(false); } },
      (e: Error) => { if (id === run.current) { setError(e); setLoading(false); } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(load, [load]);
  return { data, error, loading, reload: load };
}
