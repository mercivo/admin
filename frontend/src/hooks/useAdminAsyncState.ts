import { useCallback, useEffect, useRef, useState } from 'react';

export type AdminAsyncPhase = 'initial-loading' | 'ready' | 'refreshing' | 'error';

export const useAdminAsyncState = (initiallyReady = false) => {
  const [phase, setPhase] = useState<AdminAsyncPhase>(initiallyReady ? 'ready' : 'initial-loading');
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const execute = useCallback(async <T,>(task: () => Promise<T>, options?: { refresh?: boolean }) => {
    const id = ++requestId.current;
    setPhase(current => options?.refresh && current === 'ready' ? 'refreshing' : 'initial-loading');
    try {
      const value = await task();
      if (mounted.current && id === requestId.current) setPhase('ready');
      return { value, current: mounted.current && id === requestId.current } as const;
    } catch (error) {
      if (mounted.current && id === requestId.current) setPhase(current => current === 'refreshing' ? 'ready' : 'error');
      throw error;
    }
  }, []);

  const reset = useCallback(() => setPhase('initial-loading'), []);
  return { phase, execute, reset, isInitialLoading: phase === 'initial-loading', isRefreshing: phase === 'refreshing', isError: phase === 'error' };
};
