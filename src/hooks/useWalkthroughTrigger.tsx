import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useWalkthrough } from "@/components/walkthrough/WalkthroughContext";
import { Walkthrough } from "@/components/walkthrough/types";

interface UseWalkthroughTriggerOptions {
  walkthrough: Walkthrough;
  delay?: number;
  condition?: boolean;
}

/**
 * Hook to trigger a walkthrough based on route or conditions
 */
export function useWalkthroughTrigger({
  walkthrough,
  delay = 500,
  condition = true,
}: UseWalkthroughTriggerOptions) {
  const location = useLocation();
  const { startWalkthrough, shouldShowWalkthrough, state } = useWalkthrough();

  const trigger = useCallback(() => {
    if (!condition) return;
    if (!shouldShowWalkthrough(walkthrough.id)) return;
    if (state.activeWalkthrough) return;

    // Check route condition
    if (walkthrough.route && !location.pathname.includes(walkthrough.route)) {
      return;
    }

    startWalkthrough(walkthrough);
  }, [condition, shouldShowWalkthrough, walkthrough, state.activeWalkthrough, location.pathname, startWalkthrough]);

  useEffect(() => {
    if (walkthrough.triggerOnFirstVisit) {
      const timer = setTimeout(trigger, delay);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay, walkthrough.triggerOnFirstVisit]);

  return { trigger };
}

/**
 * Hook to manually control a walkthrough
 */
export function useWalkthroughControl(walkthroughId: string) {
  const {
    state,
    startWalkthrough,
    nextStep,
    prevStep,
    goToStep,
    endWalkthrough,
    skipWalkthrough,
    dontShowAgain,
    hasCompletedWalkthrough,
    shouldShowWalkthrough,
  } = useWalkthrough();

  const isActive = state.activeWalkthrough?.id === walkthroughId;
  const currentStep = isActive ? state.currentStep : 0;
  const totalSteps = state.activeWalkthrough?.steps.length ?? 0;

  return {
    isActive,
    currentStep,
    totalSteps,
    progress: state.progress[walkthroughId],
    start: (walkthrough: Walkthrough) => startWalkthrough(walkthrough),
    next: nextStep,
    prev: prevStep,
    goTo: goToStep,
    end: endWalkthrough,
    skip: skipWalkthrough,
    dontShow: () => dontShowAgain(walkthroughId),
    hasCompleted: hasCompletedWalkthrough(walkthroughId),
    shouldShow: shouldShowWalkthrough(walkthroughId),
  };
}
