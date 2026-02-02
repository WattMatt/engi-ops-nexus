import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, FileX, SearchX, AlertCircle, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * EmptyState - Display when no data is available
 */
export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
      aria-label={title}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * LoadingState - Display during data fetching
 */
export function LoadingState({
  message = "Loading...",
  className,
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4",
        className
      )}
      role="status"
      aria-label={message}
    >
      <Loader2 
        className={cn("animate-spin text-primary mb-2", sizeClasses[size])} 
        aria-hidden="true" 
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  className?: string;
}

/**
 * ErrorState - Display when an error occurs
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading. Please try again.",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="alert"
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {retry && (
        <Button onClick={retry} variant="outline">
          Try again
        </Button>
      )}
    </div>
  );
}

interface NoResultsProps {
  query?: string;
  suggestion?: string;
  onClear?: () => void;
  className?: string;
}

/**
 * NoResults - Display when search returns no results
 */
export function NoResults({
  query,
  suggestion = "Try adjusting your search or filters",
  onClear,
  className,
}: NoResultsProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {query ? `No results for "${query}"` : "No results found"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{suggestion}</p>
      {onClear && (
        <Button onClick={onClear} variant="outline" size="sm">
          Clear search
        </Button>
      )}
    </div>
  );
}
