/**
 * Skip Link Component
 * Allows keyboard users to skip to main content
 * 
 * Place at the very beginning of the page, before navigation
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The ID of the main content area to skip to */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
}

export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ targetId = 'main-content', label = 'Skip to main content', className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={cn(
          // Visually hidden by default
          'absolute -top-10 left-4 z-[100]',
          // Show on focus
          'focus:top-4',
          // Styling
          'bg-background border border-border',
          'px-4 py-2 rounded-md',
          'text-sm font-medium text-foreground',
          'shadow-lg',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          // Transition
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        {label}
      </a>
    );
  }
);

SkipLink.displayName = 'SkipLink';

/**
 * Main Content Wrapper
 * Target for skip links with proper focus management
 */
export const MainContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ id = 'main-content', tabIndex = -1, className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        id={id}
        tabIndex={tabIndex}
        className={cn(
          // Remove focus outline when focused via skip link
          'focus:outline-none',
          className
        )}
        role="main"
        aria-label="Main content"
        {...props}
      >
        {children}
      </main>
    );
  }
);

MainContent.displayName = 'MainContent';
