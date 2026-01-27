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

interface FullPageLayoutProps {
  children: ReactNode;
  /** Sidebar component to render on the left */
  sidebar?: ReactNode;
  /** Header component to render at the top */
  header?: ReactNode;
  /** Additional class names for the main content area */
  contentClassName?: string;
  /** Additional class names for the outer wrapper */
  className?: string;
  /** Background gradient style */
  backgroundStyle?: "default" | "gradient" | "none";
}

/**
 * FullPageLayout - Centralized full-page layout with proper scrolling
 * 
 * Features:
 * - Proper scrolling behavior (no overflow-hidden blocking)
 * - Optional sidebar support
 * - Optional header support
 * - Flexible content area with overflow-auto
 */
export function FullPageLayout({
  children,
  sidebar,
  header,
  contentClassName,
  className,
  backgroundStyle = "default",
}: FullPageLayoutProps) {
  const backgroundClasses = {
    default: "bg-background",
    gradient: "bg-gradient-to-b from-background via-background to-muted/20",
    none: "",
  };

  return (
    <div className={cn("h-screen flex w-full", backgroundClasses[backgroundStyle], className)}>
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        {header}
        <main className={cn("flex-1 overflow-auto", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}

interface PageContentProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * PageContent - Wrapper for page content with consistent spacing
 */
export function PageContent({
  children,
  maxWidth = "full",
  padding = "md",
  className,
}: PageContentProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    full: "w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={cn("mx-auto", maxWidthClasses[maxWidth], paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
  blur?: boolean;
}

/**
 * PageHeader - Consistent header styling for pages
 */
export function PageHeader({ children, className, blur = true }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b shrink-0 z-10",
        blur && "bg-background/80 backdrop-blur-sm",
        !blur && "bg-background",
        className
      )}
    >
      {children}
    </header>
  );
}