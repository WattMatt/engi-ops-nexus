import { ReactNode } from 'react';
import { isNativeIOS } from '@/utils/platform';
import { cn } from '@/lib/utils';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * SafeAreaView component that adds padding for iOS notch and home indicator
 * On web, it just renders children without extra padding
 */
export function SafeAreaView({ children, className, edges = ['top', 'bottom'] }: SafeAreaViewProps) {
  // Only apply safe area on iOS
  const isIOS = isNativeIOS();

  if (!isIOS) {
    return <div className={className}>{children}</div>;
  }

  const safeAreaClasses = cn(
    className,
    edges.includes('top') && 'pt-[env(safe-area-inset-top)]',
    edges.includes('bottom') && 'pb-[env(safe-area-inset-bottom)]',
    edges.includes('left') && 'pl-[env(safe-area-inset-left)]',
    edges.includes('right') && 'pr-[env(safe-area-inset-right)]'
  );

  return <div className={safeAreaClasses}>{children}</div>;
}

/**
 * Hook to get safe area insets as CSS values
 */
export function useSafeAreaInsets() {
  const isIOS = isNativeIOS();

  if (!isIOS) {
    return {
      top: '0px',
      bottom: '0px',
      left: '0px',
      right: '0px',
    };
  }

  return {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  };
}
