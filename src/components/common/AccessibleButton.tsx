/**
 * Accessible Button Component
 * Enhanced button with keyboard navigation and ARIA support
 */

import React, { forwardRef, useCallback, useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AccessibleButtonProps extends ButtonProps {
  /** Accessible label for screen readers (required if children is icon-only) */
  'aria-label'?: string;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Loading text for screen readers */
  loadingText?: string;
  /** Callback when focused via keyboard navigation */
  onKeyboardFocus?: () => void;
  /** Whether to announce changes to screen readers */
  announceChanges?: boolean;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      'aria-label': ariaLabel,
      isLoading = false,
      loadingText = 'Loading',
      disabled,
      onKeyboardFocus,
      onClick,
      onKeyDown,
      className,
      ...props
    },
    ref
  ) => {
    const lastInteractionRef = useRef<'mouse' | 'keyboard'>('mouse');

    const handleMouseDown = useCallback(() => {
      lastInteractionRef.current = 'mouse';
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        lastInteractionRef.current = 'keyboard';
        
        // Handle Enter and Space for activation
        if (e.key === 'Enter' || e.key === ' ') {
          // Prevent space from scrolling
          if (e.key === ' ') {
            e.preventDefault();
          }
        }
        
        onKeyDown?.(e);
      },
      [onKeyDown]
    );

    const handleFocus = useCallback(() => {
      if (lastInteractionRef.current === 'keyboard' && onKeyboardFocus) {
        onKeyboardFocus();
      }
    }, [onKeyboardFocus]);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLoading || disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      },
      [onClick, isLoading, disabled]
    );

    return (
      <Button
        ref={ref}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        disabled={disabled || isLoading}
        className={cn(
          // Focus visible ring for keyboard navigation
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Ensure minimum touch target size (44x44)
          'min-h-[44px] min-w-[44px]',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
