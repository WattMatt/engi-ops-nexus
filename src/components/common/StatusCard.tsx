import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle, LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const statusCardVariants = cva(
  "rounded-lg border p-4 flex gap-3 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border-border text-card-foreground shadow-sm hover:shadow-md",
        success: "bg-green-50/50 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-900 dark:text-green-100",
        warning: "bg-yellow-50/50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-100",
        error: "bg-red-50/50 border-red-200 text-red-900 dark:bg-red-950/20 dark:border-red-900 dark:text-red-100",
        info: "bg-blue-50/50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-100",
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

export interface StatusCardProps extends VariantProps<typeof statusCardVariants> {
  title?: string;
  description?: string;
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  action?: ReactNode;
  onClick?: () => void;
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
  onClick,
}: StatusCardProps) {
  const Icon = icon || iconMap[variant || "default"];
  const iconColor = iconColorMap[variant || "default"];

  return (
    <div 
      className={cn(
        statusCardVariants({ variant }), 
        onClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )} 
      role={onClick ? "button" : "status"}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className={cn("shrink-0 mt-0.5", iconColor)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium text-sm mb-1 leading-none tracking-tight">{title}</h4>
        )}
        {description && (
          <p className="text-sm text-muted-foreground/90">{description}</p>
        )}
        {children && <div className="mt-2 text-sm">{children}</div>}
      </div>
      {action && (
        <div className="shrink-0 self-center">{action}</div>
      )}
    </div>
  );
}
