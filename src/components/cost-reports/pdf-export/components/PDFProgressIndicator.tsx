import { Progress } from "@/components/ui/progress";
import { PDFExportProgress } from "../types";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFProgressIndicatorProps {
  progress: PDFExportProgress;
  isExporting: boolean;
}

export function PDFProgressIndicator({ progress, isExporting }: PDFProgressIndicatorProps) {
  if (!isExporting) return null;

  const isComplete = progress.percentage === 100;

  return (
    <div className="space-y-3 px-4 py-3 bg-muted/50 rounded-lg border border-border/50 animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Header with icon and label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-300" />
          ) : (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          )}
          <span className="text-sm font-medium text-foreground">
            {progress.currentSection}
          </span>
        </div>
        <span className={cn(
          "text-sm font-semibold tabular-nums transition-colors",
          isComplete ? "text-primary" : "text-muted-foreground"
        )}>
          {progress.percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress 
        value={progress.percentage} 
        className={cn(
          "h-2 transition-all duration-300",
          isComplete && "bg-primary/20"
        )}
      />

      {/* Step counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {Math.min(progress.currentStep, progress.totalSteps)} of {progress.totalSteps}
        </span>
        {!isComplete && progress.totalSteps > 0 && (
          <span className="opacity-75">
            ~{Math.ceil((progress.totalSteps - progress.currentStep) * 0.5)}s remaining
          </span>
        )}
      </div>
    </div>
  );
}
