import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useWalkthrough } from "@/components/walkthrough/WalkthroughContext";
import { Tour, Walkthrough } from "@/components/walkthrough/types";
import { getToursForRoute, getTourById } from "@/components/walkthrough/walkthroughs";

interface UseWalkthroughTriggerOptions {
  walkthrough?: Walkthrough;
  tourId?: string;
  delay?: number;
  condition?: boolean;
}

/**
 * Hook to trigger a walkthrough/tour based on route or conditions
 */
export function useWalkthroughTrigger({
  walkthrough,
  tourId,
  delay = 500,
  condition = true,
}: UseWalkthroughTriggerOptions = {}) {
  const location = useLocation();
  const { startWalkthrough, shouldShowWalkthrough, state } = useWalkthrough();

  const trigger = useCallback(() => {
    if (!condition) return;
    if (state.activeWalkthrough || state.isActive) return;

    // Get tour from ID or use provided walkthrough
    const tour = tourId ? getTourById(tourId) : walkthrough;
    if (!tour) return;

    if (!shouldShowWalkthrough(tour.id)) return;

    // Check route condition
    if (tour.route && !location.pathname.includes(tour.route)) {
      return;
    }

    setTimeout(() => {
      startWalkthrough(tour);
    }, delay);
  }, [condition, shouldShowWalkthrough, walkthrough, tourId, state.activeWalkthrough, state.isActive, location.pathname, startWalkthrough, delay]);

  const triggerByRoute = useCallback(() => {
    if (state.activeWalkthrough || state.isActive) return;

    const tours = getToursForRoute(location.pathname);
    for (const tour of tours) {
      if ((tour.triggerOnFirstVisit || tour.autoStart) && shouldShowWalkthrough(tour.id)) {
        setTimeout(() => {
          startWalkthrough(tour);
        }, delay);
        break;
      }
    }
  }, [location.pathname, state.activeWalkthrough, state.isActive, shouldShowWalkthrough, startWalkthrough, delay]);

  return { trigger, triggerByRoute };
}

/**
 * Hook to manually control a walkthrough/tour
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
    actions,
  } = useWalkthrough();

  const isActive = state.activeWalkthrough?.id === walkthroughId;
  const currentStep = isActive ? state.currentStep : 0;
  const totalSteps = state.activeWalkthrough?.steps.length ?? 0;

  const start = useCallback(() => {
    const tour = getTourById(walkthroughId);
    if (tour) {
      startWalkthrough(tour);
    }
  }, [walkthroughId, startWalkthrough]);

  return {
    isActive,
    currentStep,
    totalSteps,
    progress: state.progress[walkthroughId],
    start,
    startWithTour: (tour: Tour) => startWalkthrough(tour),
    next: nextStep,
    prev: prevStep,
    goTo: goToStep,
    end: endWalkthrough,
    skip: skipWalkthrough,
    dontShow: () => dontShowAgain(walkthroughId),
    hasCompleted: hasCompletedWalkthrough(walkthroughId),
    shouldShow: shouldShowWalkthrough(walkthroughId),
    reset: () => actions.resetTour(walkthroughId),
  };
}

/**
 * Hook to get all available tours for current route
 */
export function useAvailableTours() {
  const location = useLocation();
  const { shouldShowWalkthrough, hasCompletedWalkthrough } = useWalkthrough();

  const tours = getToursForRoute(location.pathname);
  
  return {
    allTours: tours,
    availableTours: tours.filter(t => shouldShowWalkthrough(t.id)),
    completedTours: tours.filter(t => hasCompletedWalkthrough(t.id)),
    pendingTours: tours.filter(t => !hasCompletedWalkthrough(t.id)),
  };
}
