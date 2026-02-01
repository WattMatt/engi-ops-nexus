import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  score?: number;
}

interface ReviewStreamingProgressProps {
  steps: ReviewStep[];
  currentStep: number;
  overallProgress: number;
}

export function ReviewStreamingProgress({ 
  steps, 
  currentStep, 
  overallProgress 
}: ReviewStreamingProgressProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Analysis Progress</span>
          <span className="font-medium">{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.status === 'completed' 
            ? CheckCircle2 
            : step.status === 'in_progress' 
              ? Loader2 
              : Circle;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                step.status === 'in_progress' && "bg-primary/5",
                step.status === 'completed' && "bg-green-50 dark:bg-green-950/20"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5",
                  step.status === 'completed' && "text-green-600",
                  step.status === 'in_progress' && "text-primary animate-spin",
                  step.status === 'pending' && "text-muted-foreground"
                )} 
              />
              <div className="flex-1">
                <span className={cn(
                  "text-sm font-medium",
                  step.status === 'completed' && "text-green-700 dark:text-green-400",
                  step.status === 'in_progress' && "text-primary",
                  step.status === 'pending' && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {step.status === 'completed' && step.score !== undefined && (
                <span className="text-sm font-bold text-green-600">
                  {step.score}/100
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Default review steps
export const DEFAULT_REVIEW_STEPS: ReviewStep[] = [
  { id: 'init', label: 'Initializing review...', status: 'pending' },
  { id: 'context', label: 'Gathering application context', status: 'pending' },
  { id: 'ux', label: 'Analyzing User Experience', status: 'pending' },
  { id: 'performance', label: 'Analyzing Performance', status: 'pending' },
  { id: 'security', label: 'Analyzing Security', status: 'pending' },
  { id: 'components', label: 'Analyzing Components', status: 'pending' },
  { id: 'operational', label: 'Analyzing Workflows', status: 'pending' },
  { id: 'codeQuality', label: 'Analyzing Code Quality', status: 'pending' },
  { id: 'finalize', label: 'Generating recommendations', status: 'pending' },
];
