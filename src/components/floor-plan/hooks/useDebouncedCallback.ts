import { useCallback, useRef, useEffect } from 'react';

/**
 * Creates a debounced version of a callback that delays invoking until after
 * a specified delay has elapsed since the last time it was invoked.
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @param leading - If true, invoke on the leading edge instead of trailing
 * @returns Debounced callback function with a cancel method
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  leading: boolean = false
): T & { cancel: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const hasInvokedRef = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    hasInvokedRef.current = false;
  }, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      const invoke = () => {
        callbackRef.current(...args);
        hasInvokedRef.current = false;
      };

      if (leading && !hasInvokedRef.current) {
        // Leading edge: invoke immediately on first call
        invoke();
        hasInvokedRef.current = true;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for trailing edge or next leading edge
      timeoutRef.current = setTimeout(() => {
        if (!leading) {
          invoke();
        } else {
          hasInvokedRef.current = false;
        }
        timeoutRef.current = null;
      }, delay);
    },
    [delay, leading, cancel]
  ) as T & { cancel: () => void };

  // Attach cancel method
  debouncedFn.cancel = cancel;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return debouncedFn;
}
