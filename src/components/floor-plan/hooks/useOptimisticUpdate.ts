import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing optimistic UI updates during drag operations.
 * Provides immediate visual feedback while batching actual state updates.
 * 
 * @param initialValue - Initial state value
 * @param onCommit - Callback to commit the final value
 * @returns Optimistic state, setter, and commit function
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  onCommit: (value: T) => void
) {
  const [optimisticValue, setOptimisticValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateOptimistic = useCallback((updater: T | ((prev: T) => T)) => {
    setIsPending(true);
    setOptimisticValue(updater);
  }, []);

  const commit = useCallback(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }

    // Debounce commit to reduce state updates
    commitTimeoutRef.current = setTimeout(() => {
      onCommit(optimisticValue);
      setIsPending(false);
      commitTimeoutRef.current = null;
    }, 50); // 50ms debounce for commit
  }, [optimisticValue, onCommit]);

  const commitImmediate = useCallback(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }
    onCommit(optimisticValue);
    setIsPending(false);
  }, [optimisticValue, onCommit]);

  return {
    value: optimisticValue,
    updateOptimistic,
    commit,
    commitImmediate,
    isPending
  };
}
