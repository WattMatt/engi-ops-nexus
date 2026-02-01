/**
 * Performance Optimization Hooks
 * Provides memoization utilities to prevent unnecessary re-renders
 */

import { useCallback, useRef, useMemo, DependencyList } from 'react';

/**
 * A stable callback hook that maintains referential equality
 * even when dependencies change, unless the callback logic changes.
 * 
 * Useful for event handlers passed to child components that would
 * otherwise cause unnecessary re-renders.
 * 
 * @example
 * const handleClick = useStableCallback((id: string) => {
 *   setItems(prev => prev.filter(item => item.id !== id));
 * });
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  
  // Update ref on every render
  callbackRef.current = callback;
  
  // Return a stable callback that calls the current ref
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Debounced callback that delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => searchAPI(query),
 *   300
 * );
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef<T>(callback);
  
  callbackRef.current = callback;
  
  const debouncedFn = useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, ...deps]
  );
  
  return debouncedFn;
}

/**
 * Throttled callback that limits execution to once per wait period.
 * 
 * @example
 * const throttledScroll = useThrottledCallback(
 *   () => updateScrollPosition(),
 *   100
 * );
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: DependencyList = []
): T {
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);
  
  callbackRef.current = callback;
  
  const throttledFn = useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRunRef.current >= limit) {
        lastRunRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [limit, ...deps]
  );
  
  return throttledFn;
}

/**
 * Deep comparison memoization hook.
 * Only recomputes when the values actually change (deep equality).
 * 
 * Useful for complex objects where referential equality isn't enough.
 * 
 * @example
 * const memoizedData = useDeepMemo(() => processData(data), [data]);
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; value: T } | null>(null);
  
  const depsChanged = !ref.current || !deepEqual(ref.current.deps, deps);
  
  if (depsChanged) {
    ref.current = {
      deps,
      value: factory()
    };
  }
  
  return ref.current!.value;
}

/**
 * Previous value hook.
 * Returns the previous value of a variable.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  const previous = ref.current;
  ref.current = value;
  
  return previous;
}

/**
 * Memoized array hook.
 * Only returns a new array reference when the contents change.
 */
export function useMemoizedArray<T>(items: T[]): T[] {
  const ref = useRef<T[]>(items);
  
  if (!shallowArrayEqual(ref.current, items)) {
    ref.current = items;
  }
  
  return ref.current;
}

// Utility functions

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}
