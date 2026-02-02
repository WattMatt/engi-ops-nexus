/**
 * Verification Progress Bar Component
 * Visual progress indicator for cable verification
 */
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationProgressBarProps {
  total: number;
  verified: number;
  issues: number;
  pending: number;
  className?: string;
}

export function VerificationProgressBar({
  total,
  verified,
  issues,
  pending,
  className,
}: VerificationProgressBarProps) {
  const completedPercentage = total > 0 ? ((verified + issues) / total) * 100 : 0;
  const verifiedPercentage = total > 0 ? (verified / total) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stacked Progress Bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-muted">
        {/* Verified (green) */}
        <div 
          className="absolute h-full bg-green-500 transition-all duration-300"
          style={{ width: `${verifiedPercentage}%` }}
        />
        {/* Issues (amber) - starts after verified */}
        <div 
          className="absolute h-full bg-amber-500 transition-all duration-300"
          style={{ 
            left: `${verifiedPercentage}%`,
            width: `${total > 0 ? (issues / total) * 100 : 0}%` 
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Verified</span>
          <span className="font-medium">{verified}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Issues</span>
          <span className="font-medium">{issues}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span className="text-muted-foreground">Pending</span>
          <span className="font-medium">{pending}</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          {Math.round(completedPercentage)}% complete
        </div>
      </div>
    </div>
  );
}
