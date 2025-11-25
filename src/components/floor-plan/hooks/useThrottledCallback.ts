import { useCallback, useRef, useEffect } from 'react';

/**
 * Creates a throttled version of a callback that only invokes at most once
 * per specified time period.
 * 
 * @param callback - The function to throttle
 * @param limit - The time period in milliseconds
 * @returns Throttled callback function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef(false);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        // First call - invoke immediately
        callbackRef.current(...args);
        inThrottle.current = true;
        
        setTimeout(() => {
          inThrottle.current = false;
          // If there were calls during throttle period, invoke with last args
          if (lastArgs.current) {
            callbackRef.current(...lastArgs.current);
            lastArgs.current = null;
          }
        }, limit);
      } else {
        // Store last args for deferred invocation
        lastArgs.current = args;
      }
    },
    [limit]
  ) as T;
}
