/**
 * Focus Trap Component
 * Traps focus within a container for modals and dialogs
 */

import { useEffect, useRef, ReactNode, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface FocusTrapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Whether to auto-focus the first focusable element */
  autoFocus?: boolean;
  /** Whether to restore focus when trap is deactivated */
  restoreFocus?: boolean;
  /** Custom element to focus initially */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Callback when escape key is pressed */
  onEscapeKey?: () => void;
  children: ReactNode;
}

const FOCUSABLE_ELEMENTS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(',');

export const FocusTrap = forwardRef<HTMLDivElement, FocusTrapProps>(
  (
    {
      active = true,
      autoFocus = true,
      restoreFocus = true,
      initialFocusRef,
      onEscapeKey,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    // Get all focusable elements within the container
    const getFocusableElements = useCallback(() => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
      ).filter(el => el.offsetParent !== null); // Filter out hidden elements
    }, []);

    // Handle tab key to trap focus
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!active) return;

        if (e.key === 'Escape' && onEscapeKey) {
          e.preventDefault();
          onEscapeKey();
          return;
        }

        if (e.key !== 'Tab') return;

        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: go backwards
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: go forwards
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      },
      [active, onEscapeKey, getFocusableElements]
    );

    // Set up focus trap
    useEffect(() => {
      if (!active) return;

      // Save current focus to restore later
      previousActiveRef.current = document.activeElement as HTMLElement;

      // Auto focus
      if (autoFocus) {
        const timer = setTimeout(() => {
          if (initialFocusRef?.current) {
            initialFocusRef.current.focus();
          } else {
            const focusable = getFocusableElements();
            if (focusable.length > 0) {
              focusable[0].focus();
            } else {
              // Focus the container itself if no focusable elements
              containerRef.current?.focus();
            }
          }
        }, 0);
        
        return () => clearTimeout(timer);
      }
    }, [active, autoFocus, initialFocusRef, getFocusableElements]);

    // Handle keyboard events
    useEffect(() => {
      if (!active) return;

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [active, handleKeyDown]);

    // Restore focus on deactivation
    useEffect(() => {
      return () => {
        if (restoreFocus && previousActiveRef.current) {
          previousActiveRef.current.focus();
        }
      };
    }, [restoreFocus]);

    // Merge refs
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div
        ref={setRefs}
        tabIndex={-1}
        className={cn('outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusTrap.displayName = 'FocusTrap';
