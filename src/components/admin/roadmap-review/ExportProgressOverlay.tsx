import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Image, FileText, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ExportStep = 'capturing' | 'building' | 'generating' | 'saving' | 'complete' | 'error';

interface ExportProgressOverlayProps {
  isVisible: boolean;
  currentStep: ExportStep;
  onCancel?: () => void;
  error?: string;
  chartCount?: number;
  usingPreCaptured?: boolean;
}

const STEPS: { key: ExportStep; label: string; icon: React.ReactNode }[] = [
  { key: 'capturing', label: 'Capturing charts...', icon: <Image className="h-4 w-4" /> },
  { key: 'building', label: 'Building document...', icon: <FileText className="h-4 w-4" /> },
  { key: 'generating', label: 'Generating PDF...', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  { key: 'saving', label: 'Saving & downloading...', icon: <Download className="h-4 w-4" /> },
];

export function ExportProgressOverlay({
  isVisible,
  currentStep,
  onCancel,
  error,
  chartCount = 0,
  usingPreCaptured = false,
}: ExportProgressOverlayProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (!isVisible || currentStep === 'complete' || currentStep === 'error') {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, currentStep]);

  if (!isVisible) return null;

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const progress = currentStep === 'complete' 
    ? 100 
    : currentStep === 'error' 
      ? 0 
      : Math.min(90, ((currentStepIndex + 1) / STEPS.length) * 100);

  // Show a warning if generating is taking too long
  const showSlowWarning = currentStep === 'generating' && elapsedTime > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold">
            {currentStep === 'complete' ? 'Export Complete!' : 
             currentStep === 'error' ? 'Export Failed' : 
             'Generating PDF Report'}
          </h3>
          {usingPreCaptured && currentStep === 'capturing' && (
            <p className="text-xs text-muted-foreground mt-1">
              Using pre-captured charts for instant export
            </p>
          )}
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mb-6" />

        {/* Slow generation warning */}
        {showSlowWarning && (
          <div className="mb-4 p-3 rounded-md bg-amber-500/10 text-amber-600 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Taking longer than expected...</p>
              <p className="text-xs">Complex documents may take up to 2 minutes. If this continues, charts will be skipped automatically.</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {STEPS.map((step, index) => {
            const isActive = step.key === currentStep;
            const isComplete = currentStepIndex > index || currentStep === 'complete';
            const isPending = currentStepIndex < index;

            return (
              <div 
                key={step.key}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md transition-colors",
                  isActive && "bg-primary/10",
                  isComplete && "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && "bg-green-500 text-white",
                  isPending && "bg-muted text-muted-foreground"
                )}>
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "text-sm",
                  isActive && "font-medium",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                  {step.key === 'capturing' && isComplete && chartCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({chartCount} charts)
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {currentStep === 'error' && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive flex items-start gap-2">
            <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Export failed</p>
              <p className="text-xs">{error || 'An unexpected error occurred. Please try again with fewer options selected.'}</p>
            </div>
          </div>
        )}

        {/* Complete state */}
        {currentStep === 'complete' && (
          <div className="mb-4 p-4 rounded-md bg-green-500/10 text-green-600 flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8" />
            <span className="text-base font-semibold">Complete!</span>
            <span className="text-sm text-muted-foreground">Report saved to "Saved Reports"</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep !== 'complete' && currentStep !== 'error' && (
              <>Elapsed: {elapsedTime}s</>
            )}
          </span>
          
          {onCancel && currentStep !== 'complete' && currentStep !== 'error' && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          {(currentStep === 'complete' || currentStep === 'error') && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
