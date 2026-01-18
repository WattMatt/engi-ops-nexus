import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

// ============================================
// NEW ARCHITECTURE TYPES (Phase 1 Core)
// ============================================

// Infographic types for rich media content
export type InfographicType = "image" | "video" | "diagram" | "animation";

export interface Infographic {
  type: InfographicType;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  poster?: string;
}

export interface HighlightAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "ghost" | "outline";
  icon?: LucideIcon;
}

export type TooltipPlacement = 
  | "top" 
  | "bottom" 
  | "left" 
  | "right" 
  | "top-start" 
  | "top-end" 
  | "bottom-start" 
  | "bottom-end"
  | "auto"
  | "center";

// New WalkthroughStep with full infographic support
export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  targetSelector?: string;
  type?: WalkthroughStepType;
  position?: TooltipPlacement;
  placement?: TooltipPlacement; // Alias for position
  content?: ReactNode;
  spotlightPadding?: number;
  infographic?: Infographic;
  highlightActions?: HighlightAction[];
  action?: {
    label: string;
    onClick: () => void;
  };
  skipCondition?: () => boolean;
  beforeShow?: () => void | Promise<void>;
  afterShow?: () => void | Promise<void>;
  waitForElement?: boolean;
  allowInteraction?: boolean;
}

export type WalkthroughStepType = "modal" | "tooltip" | "spotlight" | "beacon";

// Tour interface (new naming)
export interface Tour {
  id: string;
  name: string;
  description?: string;
  steps: WalkthroughStep[];
  route?: string;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  triggerOnFirstVisit?: boolean; // Alias for autoStart
  showOnce?: boolean;
  priority?: number;
  version?: string;
}

// Walkthrough = Tour (legacy alias)
export type Walkthrough = Tour;

// ============================================
// STATE MANAGEMENT TYPES
// ============================================

export interface WalkthroughProgress {
  walkthroughId: string;
  currentStep: number;
  completed: boolean;
  lastSeenAt: string;
  dontShowAgain: boolean;
}

export interface WalkthroughState {
  // Legacy properties
  activeWalkthrough: Walkthrough | null;
  currentStep: number;
  progress: Record<string, WalkthroughProgress>;
  dismissedHints: string[];
  seenFeatures: string[];
  // New properties
  isActive?: boolean;
  currentTour?: Tour | null;
  currentStepIndex?: number;
  completedTours?: string[];
  skippedTours?: string[];
}

export type WalkthroughAction =
  | { type: "START_WALKTHROUGH"; payload: Walkthrough }
  | { type: "START_TOUR"; payload: Tour }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: number }
  | { type: "END_WALKTHROUGH" }
  | { type: "END_TOUR" }
  | { type: "SKIP_WALKTHROUGH" }
  | { type: "SKIP_TOUR" }
  | { type: "DONT_SHOW_AGAIN"; payload: string }
  | { type: "DISMISS_HINT"; payload: string }
  | { type: "MARK_FEATURE_SEEN"; payload: string }
  | { type: "LOAD_PROGRESS"; payload: Record<string, WalkthroughProgress> }
  | { type: "RESET_ALL" }
  | { type: "RESET_TOUR"; payload: string };

// ============================================
// FEATURE HIGHLIGHT TYPES
// ============================================

export interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  shortcut?: string;
  icon?: LucideIcon;
  learnMoreUrl?: string;
  videoUrl?: string;
  tips?: string[];
  relatedFeatures?: string[];
  infographic?: Infographic;
  targetSelector?: string;
  showOnce?: boolean;
  version?: string;
}

export interface FeatureSpotlight {
  id: string;
  featureKey: string;
  title: string;
  description: string;
  targetSelector?: string;
  isNew?: boolean;
  version?: string;
  expiresAt?: string;
}

// ============================================
// TOOLTIP HINT TYPES
// ============================================

export interface TooltipHint {
  id: string;
  targetSelector: string;
  title?: string;
  content: string;
  position?: TooltipPlacement;
  showOnce?: boolean;
  delay?: number;
  triggerAction?: "hover" | "focus" | "click" | "auto";
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface WalkthroughActions {
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
}

export interface WalkthroughContextType {
  state: WalkthroughState;
  actions: WalkthroughActions;
}

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  COMPLETED_TOURS: "walkthrough-completed-tours",
  SKIPPED_TOURS: "walkthrough-skipped-tours",
  TOUR_PROGRESS: "walkthrough-tour-progress",
  DISMISSED_HINTS: "app-dismissed-hints",
  SEEN_FEATURES: "app-seen-features",
  PROGRESS: "app-walkthrough-state",
} as const;
