import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWalkthrough } from "./WalkthroughContext";
import { WalkthroughStepComponent } from "./WalkthroughStep";
import { Tour } from "./types";

interface WalkthroughControllerProps {
  tours?: Tour[];
}

/**
 * Global walkthrough controller that:
 * 1. Registers provided tours
 * 2. Auto-triggers route-based tours
 * 3. Renders the active walkthrough step
 */
export function WalkthroughController({ tours = [] }: WalkthroughControllerProps) {
  const location = useLocation();
  const { state, actions } = useWalkthrough();

  // Register tours on mount
  useEffect(() => {
    tours.forEach((tour) => {
      actions.registerTour(tour);
    });

    return () => {
      tours.forEach((tour) => {
        actions.unregisterTour(tour.id);
      });
    };
  }, [tours, actions]);

  // Auto-trigger route-based tours
  useEffect(() => {
    if (state.isActive || state.activeWalkthrough) return;

    const matchingTours = tours
      .filter((tour) => {
        if (tour.route && !location.pathname.includes(tour.route)) {
          return false;
        }
        if (!tour.autoStart && !tour.triggerOnFirstVisit) return false;
        if (tour.showOnce && actions.isCompleted(tour.id)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingTours.length > 0) {
      const timer = setTimeout(() => {
        actions.startTour(matchingTours[0].id);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, state.isActive, state.activeWalkthrough, tours, actions]);

  // Don't render anything if no active tour
  if (!state.activeWalkthrough) {
    return null;
  }

  const currentStep = state.activeWalkthrough.steps[state.currentStep];
  if (!currentStep) {
    return null;
  }

  // Check if current step should be skipped
  if (currentStep.skipCondition?.()) {
    setTimeout(() => actions.nextStep(), 0);
    return null;
  }

  return (
    <WalkthroughStepComponent
      step={currentStep}
      currentIndex={state.currentStep}
      totalSteps={state.activeWalkthrough.steps.length}
      onNext={actions.nextStep}
      onPrev={actions.prevStep}
      onSkip={actions.skipTour}
      onClose={actions.endTour}
      onGoToStep={actions.goToStep}
    />
  );
}
