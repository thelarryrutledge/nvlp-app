import { useEffect, useState } from 'react';
import { hydrateApp, getHydrationStatus } from '@/stores/hydration';

interface HydrationHookState {
  isHydrated: boolean;
  isHydrating: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

/**
 * Hook to manage app hydration state
 * Use this in your root component to ensure stores are hydrated before rendering
 */
export const useHydration = (): HydrationHookState => {
  const [state, setState] = useState<HydrationHookState>({
    isHydrated: false,
    isHydrating: false,
    error: null,
    retry: async () => {},
  });

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      if (!mounted) return;

      setState(prev => ({ ...prev, isHydrating: true, error: null }));

      try {
        await hydrateApp();
        
        if (mounted) {
          const status = getHydrationStatus();
          setState({
            isHydrated: status.isHydrated,
            isHydrating: false,
            error: null,
            retry: hydrate,
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            isHydrated: false,
            isHydrating: false,
            error: error as Error,
            retry: hydrate,
          });
        }
      }
    };

    // Start hydration
    hydrate();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, []);

  return state;
};

/**
 * Hook to ensure hydration is complete before using stores
 * Throws an error if hydration fails
 */
export const useRequireHydration = (): boolean => {
  const { isHydrated, error } = useHydration();

  if (error) {
    throw error;
  }

  return isHydrated;
};

/**
 * Hook to get hydration progress information
 */
export const useHydrationProgress = () => {
  const [progress, setProgress] = useState({
    phase: 'initializing' as 'initializing' | 'persistence' | 'stores' | 'auth' | 'data' | 'complete' | 'error',
    percentage: 0,
  });

  useEffect(() => {
    // This is a simplified progress tracker
    // In a real implementation, you might emit events from the hydration process
    const phases = [
      { phase: 'initializing' as const, percentage: 0, delay: 0 },
      { phase: 'persistence' as const, percentage: 20, delay: 100 },
      { phase: 'stores' as const, percentage: 40, delay: 200 },
      { phase: 'auth' as const, percentage: 60, delay: 300 },
      { phase: 'data' as const, percentage: 80, delay: 400 },
      { phase: 'complete' as const, percentage: 100, delay: 500 },
    ];

    const timers: NodeJS.Timeout[] = [];

    phases.forEach(({ phase, percentage, delay }) => {
      const timer = setTimeout(() => {
        setProgress({ phase, percentage });
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return progress;
};