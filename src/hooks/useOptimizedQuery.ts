/**
 * Optimized Query Hooks
 * Performance-focused hooks with memoization and caching
 */
import { useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";

// ============================================
// Debounced Value Hook
// ============================================

/**
 * Returns a debounced version of a value
 * Useful for search inputs to reduce API calls
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

import { useState } from "react";

// ============================================
// Memoized Callback Hook
// ============================================

/**
 * Creates a stable callback reference that always calls the latest function
 * Prevents unnecessary re-renders while keeping callback up-to-date
 */
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  
  // Update ref on each render
  callbackRef.current = callback;
  
  // Return stable function that calls current ref
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

// ============================================
// Previous Value Hook
// ============================================

/**
 * Returns the previous value of a variable
 * Useful for comparing changes between renders
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// ============================================
// Cached Query Hook
// ============================================

interface CachedQueryOptions<T> extends Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn"> {
  /** Cache duration in minutes (default: 5) */
  cacheDuration?: number;
  /** Whether to refetch on window focus (default: false) */
  refetchOnFocus?: boolean;
}

/**
 * Query hook with optimized caching defaults
 * Reduces unnecessary API calls for stable data
 */
export function useCachedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: CachedQueryOptions<T>
) {
  const {
    cacheDuration = 5,
    refetchOnFocus = false,
    ...queryOptions
  } = options || {};

  return useQuery({
    queryKey,
    queryFn,
    staleTime: cacheDuration * 60 * 1000,
    gcTime: cacheDuration * 2 * 60 * 1000,
    refetchOnWindowFocus: refetchOnFocus,
    ...queryOptions,
  });
}

// ============================================
// Batch Fetching Utilities
// ============================================

interface BatchFetchResult<T> {
  items: T[];
  byId: Map<string, T>;
}

/**
 * Fetch items in batches to avoid large queries
 */
export async function fetchInBatches<T extends { id: string }>(
  ids: string[],
  batchSize: number,
  fetchFn: (batchIds: string[]) => Promise<T[]>
): Promise<BatchFetchResult<T>> {
  const results: T[] = [];
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const batchResults = await fetchFn(batchIds);
    results.push(...batchResults);
  }

  const byId = new Map(results.map(item => [item.id, item]));
  
  return { items: results, byId };
}

// ============================================
// Prefetch Hook
// ============================================

/**
 * Prefetch data on hover/focus for faster navigation
 */
export function usePrefetch<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  enabled: boolean = true
) {
  const prefetchedRef = useRef(false);
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    if (prefetchedRef.current || !enabled) return;
    
    prefetchedRef.current = true;
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryKey, queryFn, enabled, queryClient]);

  return { prefetch };
}

import { useQueryClient } from "@tanstack/react-query";

// ============================================
// Intersection Observer Hook
// ============================================

/**
 * Lazy load content when it enters the viewport
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    
    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting];
}

// ============================================
// Throttled Callback Hook
// ============================================

/**
 * Throttle a callback to run at most once per interval
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay]
  );
}
