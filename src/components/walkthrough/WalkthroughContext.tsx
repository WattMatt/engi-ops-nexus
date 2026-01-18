import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { 
  Walkthrough, 
  WalkthroughState, 
  WalkthroughAction, 
  WalkthroughProgress,
  TooltipHint,
  FeatureSpotlight
} from "./types";

const STORAGE_KEY = "app-walkthrough-state";
const HINTS_STORAGE_KEY = "app-dismissed-hints";
const FEATURES_STORAGE_KEY = "app-seen-features";

const initialState: WalkthroughState = {
  activeWalkthrough: null,
  currentStep: 0,
  progress: {},
  dismissedHints: [],
  seenFeatures: [],
};

function walkthroughReducer(state: WalkthroughState, action: WalkthroughAction): WalkthroughState {
  switch (action.type) {
    case "START_WALKTHROUGH":
      return {
        ...state,
        activeWalkthrough: action.payload,
        currentStep: 0,
      };

    case "NEXT_STEP":
      if (!state.activeWalkthrough) return state;
      const nextStep = state.currentStep + 1;
      if (nextStep >= state.activeWalkthrough.steps.length) {
        return {
          ...state,
          activeWalkthrough: null,
          currentStep: 0,
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
      return {
        ...state,
        currentStep: Math.max(0, state.currentStep - 1),
      };

    case "GO_TO_STEP":
      if (!state.activeWalkthrough) return state;
      const targetStep = Math.max(0, Math.min(action.payload, state.activeWalkthrough.steps.length - 1));
      return {
        ...state,
        currentStep: targetStep,
      };

    case "END_WALKTHROUGH":
      if (!state.activeWalkthrough) return state;
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
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
      if (!state.activeWalkthrough) return state;
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
      };

    case "DONT_SHOW_AGAIN":
      return {
        ...state,
        activeWalkthrough: null,
        currentStep: 0,
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
}

const WalkthroughContext = createContext<WalkthroughContextValue | undefined>(undefined);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(walkthroughReducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(STORAGE_KEY);
      const savedHints = localStorage.getItem(HINTS_STORAGE_KEY);
      const savedFeatures = localStorage.getItem(FEATURES_STORAGE_KEY);

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
      localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(state.dismissedHints));
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(state.seenFeatures));
    } catch (error) {
      console.error("Failed to save walkthrough state:", error);
    }
  }, [state.progress, state.dismissedHints, state.seenFeatures]);

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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HINTS_STORAGE_KEY);
    localStorage.removeItem(FEATURES_STORAGE_KEY);
  }, []);

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
