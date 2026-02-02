import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle, LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const statusCardVariants = cva(
  "rounded-lg border p-4 flex gap-3",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        success: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
        warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900",
        error: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
        info: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconMap: Record<string, LucideIcon> = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const iconColorMap: Record<string, string> = {
  default: "text-muted-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

interface StatusCardProps extends VariantProps<typeof statusCardVariants> {
  title?: string;
  description?: string;
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  action?: ReactNode;
}

/**
 * StatusCard - A flexible card component for displaying status messages
 * 
 * Variants: default, success, warning, error, info
 */
export function StatusCard({
  variant = "default",
  title,
  description,
  children,
  icon,
  className,
  action,
}: StatusCardProps) {
  const Icon = icon || iconMap[variant || "default"];
  const iconColor = iconColorMap[variant || "default"];

  return (
    <div className={cn(statusCardVariants({ variant }), className)} role="status">
      <div className={cn("shrink-0 mt-0.5", iconColor)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium text-sm mb-1">{title}</h4>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
}
