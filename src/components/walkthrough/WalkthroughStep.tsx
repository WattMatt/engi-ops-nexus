import React, { useEffect, useCallback } from "react";
import { WalkthroughStep as WalkthroughStepType } from "./types";
import { WalkthroughOverlay } from "./WalkthroughOverlay";
import { WalkthroughTooltip } from "./WalkthroughTooltip";
import { useWalkthroughStep } from "./hooks/useWalkthroughStep";

interface WalkthroughStepProps {
  step: WalkthroughStepType;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onGoToStep: (index: number) => void;
}

export function WalkthroughStepComponent({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onGoToStep,
}: WalkthroughStepProps) {
  const {
    targetRect,
    tooltipPosition,
    isElementVisible,
    scrollToTarget,
    focusTarget,
  } = useWalkthroughStep(step);

  // Call beforeShow callback when step mounts
  useEffect(() => {
    if (step.beforeShow) {
      const result = step.beforeShow();
      if (result instanceof Promise) {
        result.catch(console.error);
      }
    }
    
    return () => {
      if (step.afterShow) {
        const result = step.afterShow();
        if (result instanceof Promise) {
          result.catch(console.error);
        }
      }
    };
  }, [step]);

  // Scroll to target if not visible
  useEffect(() => {
    if (!isElementVisible && targetRect) {
      scrollToTarget();
    }
  }, [isElementVisible, targetRect, scrollToTarget]);

  // Focus management
  useEffect(() => {
    if (step.allowInteraction) {
      focusTarget();
    }
  }, [step.allowInteraction, focusTarget]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onSkip();
          break;
        case "Enter":
          e.preventDefault();
          onNext();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrev();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) onGoToStep(currentIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < totalSteps - 1) onGoToStep(currentIndex + 1);
          break;
      }
    },
    [onSkip, onNext, onPrev, onGoToStep, currentIndex, totalSteps]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when walkthrough is active
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <>
      <WalkthroughOverlay
        targetRect={targetRect}
        isActive={true}
        allowInteraction={step.allowInteraction}
        onOverlayClick={onSkip}
      />
      
      <WalkthroughTooltip
        step={step}
        position={tooltipPosition}
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onClose={onClose}
        onGoToStep={onGoToStep}
      />
    </>
  );
}
