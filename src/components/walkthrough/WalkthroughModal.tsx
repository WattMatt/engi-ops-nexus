import { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, X, HelpCircle } from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { cn } from "@/lib/utils";

interface WalkthroughModalProps {
  className?: string;
}

export function WalkthroughModal({ className }: WalkthroughModalProps) {
  const {
    state,
    nextStep,
    prevStep,
    goToStep,
    endWalkthrough,
    skipWalkthrough,
    dontShowAgain,
  } = useWalkthrough();

  const { activeWalkthrough, currentStep } = state;

  const handleClose = useCallback(() => {
    skipWalkthrough();
  }, [skipWalkthrough]);

  const handleDontShowAgain = useCallback(() => {
    if (activeWalkthrough) {
      dontShowAgain(activeWalkthrough.id);
    }
  }, [activeWalkthrough, dontShowAgain]);

  const handleNext = useCallback(() => {
    if (activeWalkthrough && currentStep === activeWalkthrough.steps.length - 1) {
      endWalkthrough();
    } else {
      nextStep();
    }
  }, [activeWalkthrough, currentStep, endWalkthrough, nextStep]);

  if (!activeWalkthrough) return null;

  const step = activeWalkthrough.steps[currentStep];
  if (!step) return null;

  const Icon = step.icon;
  const progress = ((currentStep + 1) / activeWalkthrough.steps.length) * 100;
  const isLastStep = currentStep === activeWalkthrough.steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{activeWalkthrough.name}</DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {activeWalkthrough.steps.length}
            </span>
          </div>
        </DialogHeader>

        <Progress value={progress} className="h-1.5 mb-4" />

        <div className="py-4">
          {Icon && (
            <div 
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                step.iconBgColor || "bg-primary/10"
              )}
            >
              <Icon className={cn("h-8 w-8", step.iconColor || "text-primary")} />
            </div>
          )}
          
          <h3 className="text-lg font-semibold text-center mb-2">{step.title}</h3>
          <p className="text-center text-muted-foreground">{step.description}</p>

          {/* Custom step content */}
          {step.content && (
            <div className="mt-4">
              {step.content}
            </div>
          )}

          {/* Step action button */}
          {step.action && (
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={step.action.onClick}
              >
                {step.action.label}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Skip
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDontShowAgain}
            >
              Don't show again
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Step dots navigation */}
        <div className="flex justify-center gap-1.5 pt-2">
          {activeWalkthrough.steps.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                idx === currentStep ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => goToStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Trigger button component
interface WalkthroughTriggerButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function WalkthroughTriggerButton({ 
  onClick, 
  label = "How it works",
  className,
  variant = "secondary"
}: WalkthroughTriggerButtonProps) {
  return (
    <Button 
      variant={variant}
      size="sm" 
      onClick={onClick} 
      className={cn("gap-2", className)}
    >
      <HelpCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
