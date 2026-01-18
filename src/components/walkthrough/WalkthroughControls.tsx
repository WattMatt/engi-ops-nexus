import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";

interface WalkthroughControlsProps {
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  className?: string;
  showKeyboardHints?: boolean;
}

export function WalkthroughControls({
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
  className,
  showKeyboardHints = true,
}: WalkthroughControlsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Skip button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <X className="h-4 w-4 mr-1" />
          Skip
        </Button>

        {/* Step counter */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIndex + 1} / {totalSteps}
        </span>

        {/* Prev/Next buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={isFirstStep}
            className="h-8 px-2"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            className="h-8 px-3"
            aria-label={isLastStep ? "Complete tour" : "Next step"}
          >
            {isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Done
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      {showKeyboardHints && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
            <span>Next</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
            <span>Skip</span>
          </span>
        </div>
      )}
    </div>
  );
}
