import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { cn } from "@/lib/utils";

interface SpotlightStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SpotlightOverlayProps {
  steps: SpotlightStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  walkthroughId?: string;
}

export function SpotlightOverlay({
  steps,
  isOpen,
  onClose,
  onComplete,
  walkthroughId,
}: SpotlightOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { dontShowAgain } = useWalkthrough();

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const updatePosition = useCallback(() => {
    if (!step) return;

    const target = document.querySelector(step.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipWidth = 340;
      const tooltipHeight = 150;
      const offset = 16;

      let top = 0;
      let left = 0;
      const position = step.position || "bottom";

      switch (position) {
        case "top":
          top = rect.top - tooltipHeight - offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - offset;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + offset;
          break;
      }

      // Keep within viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

      setTooltipPosition({ top, left });
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      };
    }
  }, [isOpen, currentStep, updatePosition]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleDontShowAgain = () => {
    if (walkthroughId) {
      dontShowAgain(walkthroughId);
    }
    onClose();
  };

  if (!isOpen || !step) return null;

  const overlay = (
    <div className="fixed inset-0 z-[100]">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border/highlight */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)] pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute w-[340px] bg-card rounded-xl shadow-2xl border animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="p-4 border-b bg-muted/30 rounded-t-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

          {step.action && (
            <Button
              variant="outline"
              size="sm"
              className="mb-4 w-full"
              onClick={step.action.onClick}
            >
              {step.action.label}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex items-center justify-between">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDontShowAgain}>
              Don't show again
            </Button>
          </div>

          <Button size="sm" onClick={handleNext}>
            {isLastStep ? "Done" : "Next"}
            {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 pb-3">
          {steps.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                idx === currentStep ? "bg-primary" : "bg-muted-foreground/30"
              )}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>
      </div>

      {/* Click blocker for non-target areas */}
      <div 
        className="absolute inset-0 cursor-not-allowed" 
        onClick={(e) => e.stopPropagation()}
        style={{
          clipPath: targetRect
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${targetRect.left - 8}px 100%, 
                ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                ${targetRect.right + 8}px ${targetRect.top - 8}px, 
                ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
                ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
                ${targetRect.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : undefined,
        }}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
