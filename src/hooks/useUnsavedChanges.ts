import { useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  /** Whether the form currently has unsaved changes */
  hasUnsavedChanges: boolean;
  /** Custom message for the browser's beforeunload prompt */
  message?: string;
}

/**
 * Hook that warns users before navigating away from forms with unsaved data.
 * Uses both the browser's beforeunload event (for tab close/refresh)
 * and React Router's useBlocker (for in-app navigation).
 *
 * Usage:
 * ```tsx
 * const { confirmNavigation, cancelNavigation, isBlocked } = useUnsavedChanges({
 *   hasUnsavedChanges: isDirty,
 * });
 * ```
 */
export const useUnsavedChanges = ({ hasUnsavedChanges, message }: UseUnsavedChangesOptions) => {
  const defaultMessage = message ?? 'You have unsaved changes. Are you sure you want to leave?';

  // Browser beforeunload (tab close / refresh)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show the prompt
      e.returnValue = defaultMessage;
      return defaultMessage;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges, defaultMessage]);

  // React Router navigation blocking
  const blocker = useBlocker(
    useCallback(
      () => hasUnsavedChanges,
      [hasUnsavedChanges]
    )
  );

  const isBlocked = blocker.state === 'blocked';

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    isBlocked,
    confirmNavigation,
    cancelNavigation,
    blockerMessage: defaultMessage,
  };
};
