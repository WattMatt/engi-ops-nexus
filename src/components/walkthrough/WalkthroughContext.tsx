import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { 
  Walkthrough, 
  Tour,
  WalkthroughState, 
  WalkthroughAction, 
  WalkthroughProgress,
  STORAGE_KEYS
} from "./types";

const initialState: WalkthroughState = {
  activeWalkthrough: null,
  currentStep: 0,
  progress: {},
  dismissedHints: [],
  seenFeatures: [],
  isActive: false,
  currentTour: null,
  currentStepIndex: 0,
  completedTours: [],
  skippedTours: [],
};

function walkthroughReducer(state: WalkthroughState, action: WalkthroughAction): WalkthroughState {
  switch (action.type) {
    case "START_WALKTHROUGH":
    case "START_TOUR":
      return {
        ...state,
        activeWalkthrough: action.payload,
        currentStep: 0,
        isActive: true,
        currentTour: action.payload,
        currentStepIndex: 0,
      };

    case "NEXT_STEP":
      if (!state.activeWalkthrough) return state;
      const nextStep = state.currentStep + 1;
      if (nextStep >= state.activeWalkthrough.steps.length) {
        // Complete the tour
        const completedTours = [...new Set([...(state.completedTours || []), state.activeWalkthrough.id])];
        return {
          ...state,
          activeWalkthrough: null,
          currentStep: 0,
          isActive: false,
          currentTour: null,
          currentStepIndex: 0,
          completedTours,
          progress: {
            ...state.progress,
            [state.activeWalkthrough.id]: {
              walkthroughId: state.activeWalkthrough.id,
              currentStep: state.activeWalkthrough.steps.length - 1,
              completed: true,
              lastSeenAt: new Date().toISOString(),
              dontShowAgain: false,
            },
          },
        };
      }
      return {
        ...state,
        currentStep: nextStep,
        currentStepIndex: nextStep,
        progress: {
          ...state.progress,
          [state.activeWalkthrough.id]: {
            walkthroughId: state.activeWalkthrough.id,
            currentStep: nextStep,
            completed: false,
            lastSeenAt: new Date().toISOString(),
            dontShowAgain: false,
          },
        },
      };

    case "PREV_STEP":
      const prevStep = Math.max(0, state.currentStep - 1);
      return {
        ...state,
        currentStep: prevStep,
        currentStepIndex: prevStep,
      };

    case "GO_TO_STEP":
      if (!state.activeWalkthrough) return state;
      const targetStep = Math.max(0, Math.min(action.payload, state.activeWalkthrough.steps.length - 1));
      return {
        ...state,
        currentStep: targetStep,
        currentStepIndex: targetStep,
      };

    case "END_WALKTHROUGH":
    case "END_TOUR":
      if (!state.activeWalkthrough) return state;
      const completedToursEnd = [...new Set([...(state.completedTours || []), state.activeWalkthrough.id])];
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        completedTours: completedToursEnd,
        progress: {
          ...state.progress,
          [state.activeWalkthrough.id]: {
            walkthroughId: state.activeWalkthrough.id,
            currentStep: state.currentStep,
            completed: true,
            lastSeenAt: new Date().toISOString(),
            dontShowAgain: false,
          },
        },
      };

    case "SKIP_WALKTHROUGH":
    case "SKIP_TOUR":
      if (!state.activeWalkthrough) return state;
      const skippedTours = [...new Set([...(state.skippedTours || []), state.activeWalkthrough.id])];
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        skippedTours,
      };

    case "DONT_SHOW_AGAIN":
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        progress: {
          ...state.progress,
          [action.payload]: {
            walkthroughId: action.payload,
            currentStep: 0,
            completed: false,
            lastSeenAt: new Date().toISOString(),
            dontShowAgain: true,
          },
        },
      };

    case "RESET_TOUR":
      const newProgress = { ...state.progress };
      delete newProgress[action.payload];
      return {
        ...state,
        completedTours: (state.completedTours || []).filter(id => id !== action.payload),
        skippedTours: (state.skippedTours || []).filter(id => id !== action.payload),
        progress: newProgress,
      };

    case "DISMISS_HINT":
      return {
        ...state,
        dismissedHints: [...new Set([...state.dismissedHints, action.payload])],
      };

    case "MARK_FEATURE_SEEN":
      return {
        ...state,
        seenFeatures: [...new Set([...state.seenFeatures, action.payload])],
      };

    case "LOAD_PROGRESS":
      return {
        ...state,
        progress: action.payload,
      };

    case "RESET_ALL":
      return initialState;

    default:
      return state;
  }
}

interface WalkthroughContextValue {
  state: WalkthroughState;
  // Legacy methods
  startWalkthrough: (walkthrough: Walkthrough) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  endWalkthrough: () => void;
  skipWalkthrough: () => void;
  dontShowAgain: (walkthroughId: string) => void;
  dismissHint: (hintId: string) => void;
  markFeatureSeen: (featureId: string) => void;
  isHintDismissed: (hintId: string) => boolean;
  isFeatureSeen: (featureId: string) => boolean;
  hasCompletedWalkthrough: (walkthroughId: string) => boolean;
  shouldShowWalkthrough: (walkthroughId: string) => boolean;
  resetAll: () => void;
  // New methods
  actions: {
    startTour: (tourId: string) => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (index: number) => void;
    skipTour: () => void;
    resetTour: (tourId: string) => void;
    resetAllTours: () => void;
    registerTour: (tour: Tour) => void;
    unregisterTour: (tourId: string) => void;
    getTour: (tourId: string) => Tour | undefined;
    getAllTours: () => Tour[];
    isCompleted: (tourId: string) => boolean;
  };
}

const WalkthroughContext = createContext<WalkthroughContextValue | undefined>(undefined);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(walkthroughReducer, initialState);
  const registeredTours = useRef<Map<string, Tour>>(new Map());

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const savedHints = localStorage.getItem(STORAGE_KEYS.DISMISSED_HINTS);
      const savedFeatures = localStorage.getItem(STORAGE_KEYS.SEEN_FEATURES);

      if (savedProgress) {
        dispatch({ type: "LOAD_PROGRESS", payload: JSON.parse(savedProgress) });
      }
      if (savedHints) {
        const hints = JSON.parse(savedHints) as string[];
        hints.forEach((hint) => dispatch({ type: "DISMISS_HINT", payload: hint }));
      }
      if (savedFeatures) {
        const features = JSON.parse(savedFeatures) as string[];
        features.forEach((feature) => dispatch({ type: "MARK_FEATURE_SEEN", payload: feature }));
      }
    } catch (error) {
      console.error("Failed to load walkthrough state:", error);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(state.progress));
      localStorage.setItem(STORAGE_KEYS.DISMISSED_HINTS, JSON.stringify(state.dismissedHints));
      localStorage.setItem(STORAGE_KEYS.SEEN_FEATURES, JSON.stringify(state.seenFeatures));
    } catch (error) {
      console.error("Failed to save walkthrough state:", error);
    }
  }, [state.progress, state.dismissedHints, state.seenFeatures]);

  // Legacy methods
  const startWalkthrough = useCallback((walkthrough: Walkthrough) => {
    dispatch({ type: "START_WALKTHROUGH", payload: walkthrough });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "GO_TO_STEP", payload: step });
  }, []);

  const endWalkthrough = useCallback(() => {
    dispatch({ type: "END_WALKTHROUGH" });
  }, []);

  const skipWalkthrough = useCallback(() => {
    dispatch({ type: "SKIP_WALKTHROUGH" });
  }, []);

  const dontShowAgain = useCallback((walkthroughId: string) => {
    dispatch({ type: "DONT_SHOW_AGAIN", payload: walkthroughId });
  }, []);

  const dismissHint = useCallback((hintId: string) => {
    dispatch({ type: "DISMISS_HINT", payload: hintId });
  }, []);

  const markFeatureSeen = useCallback((featureId: string) => {
    dispatch({ type: "MARK_FEATURE_SEEN", payload: featureId });
  }, []);

  const isHintDismissed = useCallback((hintId: string) => {
    return state.dismissedHints.includes(hintId);
  }, [state.dismissedHints]);

  const isFeatureSeen = useCallback((featureId: string) => {
    return state.seenFeatures.includes(featureId);
  }, [state.seenFeatures]);

  const hasCompletedWalkthrough = useCallback((walkthroughId: string) => {
    return state.progress[walkthroughId]?.completed ?? false;
  }, [state.progress]);

  const shouldShowWalkthrough = useCallback((walkthroughId: string) => {
    const progress = state.progress[walkthroughId];
    if (!progress) return true;
    if (progress.dontShowAgain) return false;
    return !progress.completed;
  }, [state.progress]);

  const resetAll = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_HINTS);
    localStorage.removeItem(STORAGE_KEYS.SEEN_FEATURES);
  }, []);

  // New action methods
  const startTour = useCallback((tourId: string) => {
    const tour = registeredTours.current.get(tourId);
    if (tour) {
      dispatch({ type: "START_TOUR", payload: tour });
    }
  }, []);

  const endTour = useCallback(() => {
    dispatch({ type: "END_TOUR" });
  }, []);

  const skipTour = useCallback(() => {
    dispatch({ type: "SKIP_TOUR" });
  }, []);

  const resetTour = useCallback((tourId: string) => {
    dispatch({ type: "RESET_TOUR", payload: tourId });
  }, []);

  const resetAllTours = useCallback(() => {
    dispatch({ type: "RESET_ALL" });
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_HINTS);
    localStorage.removeItem(STORAGE_KEYS.SEEN_FEATURES);
  }, []);

  const registerTour = useCallback((tour: Tour) => {
    registeredTours.current.set(tour.id, tour);
  }, []);

  const unregisterTour = useCallback((tourId: string) => {
    registeredTours.current.delete(tourId);
  }, []);

  const getTour = useCallback((tourId: string) => {
    return registeredTours.current.get(tourId);
  }, []);

  const getAllTours = useCallback(() => {
    return Array.from(registeredTours.current.values());
  }, []);

  const isCompleted = useCallback((tourId: string) => {
    return state.progress[tourId]?.completed ?? false;
  }, [state.progress]);

  const value: WalkthroughContextValue = {
    state,
    startWalkthrough,
    nextStep,
    prevStep,
    goToStep,
    endWalkthrough,
    skipWalkthrough,
    dontShowAgain,
    dismissHint,
    markFeatureSeen,
    isHintDismissed,
    isFeatureSeen,
    hasCompletedWalkthrough,
    shouldShowWalkthrough,
    resetAll,
    actions: {
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
      skipTour,
      resetTour,
      resetAllTours,
      registerTour,
      unregisterTour,
      getTour,
      getAllTours,
      isCompleted,
    },
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error("useWalkthrough must be used within a WalkthroughProvider");
  }
  return context;
}

// Convenience hooks for new architecture
export function useWalkthroughState() {
  const { state } = useWalkthrough();
  return state;
}

export function useWalkthroughActions() {
  const { actions } = useWalkthrough();
  return actions;
}
