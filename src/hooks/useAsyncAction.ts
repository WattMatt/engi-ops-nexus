/**
 * useAsyncAction Hook
 * Standardized hook for handling async operations with loading/error states
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getErrorMessage, tryCatch } from '@/lib/errorHandling';

interface AsyncActionOptions<T> {
  /** Show success toast on completion */
  successMessage?: string | ((result: T) => string);
  /** Show error toast on failure */
  showErrorToast?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Callback on success */
  onSuccess?: (result: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on completion (success or error) */
  onSettled?: () => void;
  /** Abort previous request when new one starts */
  abortPrevious?: boolean;
}

interface AsyncActionState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface AsyncActionReturn<T, Args extends unknown[]> {
  /** Current state */
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Execute the action */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset state to initial */
  reset: () => void;
}

/**
 * Hook for handling async operations with consistent loading/error states
 */
export function useAsyncAction<T, Args extends unknown[] = []>(
  action: (...args: Args) => Promise<T>,
  options: AsyncActionOptions<T> = {}
): AsyncActionReturn<T, Args> {
  const {
    successMessage,
    showErrorToast = true,
    errorMessage,
    onSuccess,
    onError,
    onSettled,
    abortPrevious = false,
  } = options;

  const [state, setState] = useState<AsyncActionState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const executionIdRef = useRef(0);

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    // Abort previous request if configured
    if (abortPrevious && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentExecutionId = ++executionIdRef.current;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }));

    try {
      const result = await action(...args);

      // Check if this execution is still current
      if (currentExecutionId !== executionIdRef.current) {
        return null;
      }

      setState({
        data: result,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      if (successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(result)
          : successMessage;
        toast.success(message);
      }

      onSuccess?.(result);
      return result;

    } catch (err) {
      // Check if this execution is still current
      if (currentExecutionId !== executionIdRef.current) {
        return null;
      }

      const error = err instanceof Error ? err : new Error(getErrorMessage(err));

      setState(prev => ({
        ...prev,
        error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      }));

      if (showErrorToast) {
        toast.error(errorMessage || error.message);
      }

      onError?.(error);
      return null;

    } finally {
      if (currentExecutionId === executionIdRef.current) {
        onSettled?.();
      }
    }
  }, [action, successMessage, showErrorToast, errorMessage, onSuccess, onError, onSettled, abortPrevious]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Simplified hook for mutations with optimistic updates
 */
export function useMutationAction<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: AsyncActionOptions<TData>
) {
  return useAsyncAction(mutationFn, {
    showErrorToast: true,
    ...options,
  });
}

/**
 * Hook for handling form submissions
 */
export function useFormSubmit<T extends Record<string, unknown>>(
  submitFn: (data: T) => Promise<void>,
  options?: AsyncActionOptions<void> & {
    resetOnSuccess?: boolean;
  }
) {
  const { resetOnSuccess = false, ...asyncOptions } = options || {};
  
  const action = useAsyncAction(submitFn, asyncOptions);

  const handleSubmit = useCallback(async (data: T) => {
    const result = await action.execute(data);
    
    if (result !== null && resetOnSuccess) {
      action.reset();
    }
    
    return result;
  }, [action, resetOnSuccess]);

  return {
    ...action,
    handleSubmit,
  };
}

export default useAsyncAction;
