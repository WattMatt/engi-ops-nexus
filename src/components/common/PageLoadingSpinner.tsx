/**
 * PageLoadingSpinner
 * Full-page loading indicator for lazy-loaded routes
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoadingSpinnerProps {
  className?: string;
  message?: string;
}

export function PageLoadingSpinner({ 
  className,
  message = "Loading..."
}: PageLoadingSpinnerProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] gap-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Compact loading spinner for smaller sections
 */
export function SectionLoadingSpinner({ 
  className,
  size = "default"
}: { 
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div 
      className={cn("flex items-center justify-center p-8", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
    </div>
  );
}

export default PageLoadingSpinner;
