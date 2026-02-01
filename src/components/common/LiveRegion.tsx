/**
 * Live Region Component
 * Announces dynamic content changes to screen readers
 */

import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LiveRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to announce - updates trigger announcements */
  message: string;
  /** Politeness level - polite waits, assertive interrupts */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether to announce the entire region or just changes */
  atomic?: boolean;
  /** Delay before clearing the message (ms) */
  clearDelay?: number;
  /** Whether the region should be visible (for debugging) */
  visible?: boolean;
}

export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(
  (
    {
      message,
      politeness = 'polite',
      atomic = true,
      clearDelay = 1000,
      visible = false,
      className,
      ...props
    },
    ref
  ) => {
    const [currentMessage, setCurrentMessage] = useState('');

    useEffect(() => {
      if (message) {
        setCurrentMessage(message);
        
        if (clearDelay > 0) {
          const timer = setTimeout(() => {
            setCurrentMessage('');
          }, clearDelay);
          
          return () => clearTimeout(timer);
        }
      }
    }, [message, clearDelay]);

    return (
      <div
        ref={ref}
        role="status"
        aria-live={politeness}
        aria-atomic={atomic}
        className={cn(
          !visible && 'sr-only',
          visible && 'fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg z-50',
          className
        )}
        {...props}
      >
        {currentMessage}
      </div>
    );
  }
);

LiveRegion.displayName = 'LiveRegion';

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(0);

  const announce = (text: string) => {
    // Increment key to force re-render even with same message
    setKey(k => k + 1);
    setMessage(text);
  };

  const clear = () => setMessage('');

  return {
    message,
    messageKey: key,
    announce,
    clear,
  };
}
