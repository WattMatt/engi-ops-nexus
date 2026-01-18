import React from "react";
import { cn } from "@/lib/utils";

interface WalkthroughProgressProps {
  currentIndex: number;
  totalSteps: number;
  onGoToStep: (index: number) => void;
  className?: string;
  variant?: "dots" | "bar" | "numbers";
}

export function WalkthroughProgress({
  currentIndex,
  totalSteps,
  onGoToStep,
  className,
  variant = "dots",
}: WalkthroughProgressProps) {
  if (totalSteps <= 1) return null;

  if (variant === "bar") {
    const progress = ((currentIndex + 1) / totalSteps) * 100;
    
    return (
      <div className={cn("w-full", className)}>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Step {currentIndex + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === "numbers") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <button
            key={index}
            onClick={() => onGoToStep(index)}
            disabled={index === currentIndex}
            className={cn(
              "w-6 h-6 rounded text-xs font-medium transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
              index === currentIndex
                ? "bg-primary text-primary-foreground"
                : index < currentIndex
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            aria-label={`Go to step ${index + 1}`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  }

  // Default: dots variant
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <button
          key={index}
          onClick={() => onGoToStep(index)}
          disabled={index === currentIndex}
          className={cn(
            "rounded-full transition-all duration-300 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
            index === currentIndex
              ? "w-6 h-2 bg-primary"
              : index < currentIndex
                ? "w-2 h-2 bg-primary/50 hover:bg-primary/70"
                : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
          )}
          aria-label={`Go to step ${index + 1}${index < currentIndex ? " (completed)" : ""}`}
          aria-current={index === currentIndex ? "step" : undefined}
        />
      ))}
    </div>
  );
}
