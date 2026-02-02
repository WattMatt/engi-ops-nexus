import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const metricCardVariants = cva(
  "rounded-lg border p-4 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        primary: "bg-primary/5 border-primary/20",
        success: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
        warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900",
        muted: "bg-muted/50 border-muted",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface MetricCardProps extends VariantProps<typeof metricCardVariants> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    positive?: boolean;
  };
  suffix?: string;
  prefix?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * MetricCard - Display key metrics with optional trends
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  suffix,
  prefix,
  description,
  variant,
  size,
  className,
  onClick,
}: MetricCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        metricCardVariants({ variant, size }),
        isClickable && "cursor-pointer hover:border-primary/50",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive === true && "text-green-600 dark:text-green-400",
              trend.positive === false && "text-red-600 dark:text-red-400",
              trend.positive === undefined && "text-muted-foreground"
            )}
          >
            {trend.value > 0 && "+"}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}

      {description && (
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}

interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * MetricGrid - Responsive grid layout for MetricCards
 */
export function MetricGrid({ children, columns = 4, className }: MetricGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
