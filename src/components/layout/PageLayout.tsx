import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  headerActions?: ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * Standardized page layout wrapper for consistent spacing and structure
 * across all application pages.
 */
export function PageLayout({
  children,
  title,
  description,
  headerActions,
  className,
  containerClassName,
}: PageLayoutProps) {
  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <div className={cn("mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6", containerClassName)}>
        {(title || headerActions) && (
          <div className="flex items-start justify-between gap-4 pb-2">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
