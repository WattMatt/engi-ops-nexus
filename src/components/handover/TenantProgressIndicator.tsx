/**
 * Compact progress indicator for tenant handover completion
 */

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantProgressIndicatorProps {
  completedCount: number;
  totalCount: number;
  percentage: number;
  compact?: boolean;
}

export const TenantProgressIndicator = ({
  completedCount,
  totalCount,
  percentage,
  compact = false,
}: TenantProgressIndicatorProps) => {
  const isComplete = percentage === 100;
  const hasProgress = percentage > 0;

  // Determine color based on progress
  const getProgressColor = () => {
    if (isComplete) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    if (percentage > 0) return "bg-blue-500";
    return "bg-muted";
  };

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    }
    if (hasProgress) {
      return <Clock className="h-3.5 w-3.5 text-amber-600" />;
    }
    return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getBadgeVariant = () => {
    if (isComplete) return "default";
    if (hasProgress) return "secondary";
    return "outline";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <Badge 
                variant={getBadgeVariant()}
                className={cn(
                  "text-xs font-medium h-5 px-1.5",
                  isComplete && "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
                  hasProgress && !isComplete && "bg-amber-100 text-amber-700 border-amber-200"
                )}
              >
                {completedCount}/{totalCount}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{percentage}% Complete</p>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} documents
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      {getStatusIcon()}
      <div className="flex-1">
        <Progress 
          value={percentage} 
          className={cn("h-2", getProgressColor())}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-10 text-right">
        {percentage}%
      </span>
    </div>
  );
};
