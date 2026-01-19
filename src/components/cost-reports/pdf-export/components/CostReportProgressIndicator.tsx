import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Database, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataFetchProgress } from "../hooks/useCostReportData";

interface CostReportProgressIndicatorProps {
  dataProgress: DataFetchProgress;
  generationStep: string;
  generationPercentage: number;
  isGenerating: boolean;
  isFetching: boolean;
}

/**
 * Two-phase progress indicator for Cost Report PDF export
 * Phase 1: Data Fetching (0-50%)
 * Phase 2: PDF Generation (50-100%)
 */
export function CostReportProgressIndicator({
  dataProgress,
  generationStep,
  generationPercentage,
  isGenerating,
  isFetching,
}: CostReportProgressIndicatorProps) {
  const isActive = isFetching || isGenerating;
  
  if (!isActive && !dataProgress.error) return null;

  // Calculate overall progress
  // Phase 1 (data fetch): 0-50%, Phase 2 (generation): 50-100%
  let overallPercentage = 0;
  let currentPhase = 'idle';
  let currentLabel = '';
  let PhaseIcon = Database;

  if (dataProgress.error) {
    currentPhase = 'error';
    currentLabel = dataProgress.error;
    PhaseIcon = AlertCircle;
    overallPercentage = 0;
  } else if (isFetching) {
    currentPhase = 'data';
    currentLabel = dataProgress.step;
    PhaseIcon = Database;
    overallPercentage = Math.round(dataProgress.percentage * 0.5); // 0-50%
  } else if (isGenerating) {
    currentPhase = 'generation';
    currentLabel = generationStep || 'Generating PDF...';
    PhaseIcon = FileText;
    overallPercentage = 50 + Math.round(generationPercentage * 0.5); // 50-100%
  }

  const isComplete = overallPercentage === 100;
  const isError = currentPhase === 'error';

  return (
    <div className={cn(
      "space-y-3 px-4 py-3 rounded-lg border animate-in fade-in slide-in-from-left-2 duration-300",
      isError ? "bg-destructive/10 border-destructive/30" : "bg-muted/50 border-border/50"
    )}>
      {/* Phase indicators */}
      <div className="flex items-center gap-2 text-xs">
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full transition-colors",
          currentPhase === 'data' ? "bg-primary/20 text-primary" : 
          dataProgress.isComplete ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Database className="h-3 w-3" />
          <span>Data</span>
          {dataProgress.isComplete && <CheckCircle2 className="h-3 w-3" />}
        </div>
        <div className="h-px w-4 bg-border" />
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full transition-colors",
          currentPhase === 'generation' ? "bg-primary/20 text-primary" : 
          isComplete ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <FileText className="h-3 w-3" />
          <span>PDF</span>
          {isComplete && <CheckCircle2 className="h-3 w-3" />}
        </div>
      </div>

      {/* Current step with icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-300" />
          ) : isError ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          )}
          <span className={cn(
            "text-sm font-medium",
            isError ? "text-destructive" : "text-foreground"
          )}>
            {currentLabel}
          </span>
        </div>
        <span className={cn(
          "text-sm font-semibold tabular-nums transition-colors",
          isComplete ? "text-primary" : 
          isError ? "text-destructive" : "text-muted-foreground"
        )}>
          {overallPercentage}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress 
        value={overallPercentage} 
        className={cn(
          "h-2 transition-all duration-300",
          isComplete && "bg-primary/20",
          isError && "bg-destructive/20"
        )}
      />

      {/* Phase description */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {currentPhase === 'data' && 'Fetching report data from database...'}
          {currentPhase === 'generation' && 'Building PDF document...'}
          {currentPhase === 'error' && 'Export failed. Please try again.'}
          {isComplete && 'Export complete!'}
        </span>
        {!isComplete && !isError && (
          <span className="opacity-75">
            ~{Math.ceil((100 - overallPercentage) / 10)}s remaining
          </span>
        )}
      </div>
    </div>
  );
}
