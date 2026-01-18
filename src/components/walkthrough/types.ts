import { LucideIcon } from "lucide-react";

export type WalkthroughStepType = "modal" | "tooltip" | "spotlight" | "beacon";

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  targetSelector?: string; // CSS selector for tooltip/spotlight positioning
  type?: WalkthroughStepType;
  position?: "top" | "bottom" | "left" | "right" | "center";
  content?: React.ReactNode; // Custom content for the step
  action?: {
    label: string;
    onClick: () => void;
  };
  skipCondition?: () => boolean; // Skip this step if returns true
}

export interface Walkthrough {
  id: string;
  name: string;
  description?: string;
  steps: WalkthroughStep[];
  route?: string; // Only show on specific route
  triggerOnFirstVisit?: boolean;
  showOnce?: boolean;
  priority?: number; // Higher priority shows first
}

export interface WalkthroughProgress {
  walkthroughId: string;
  currentStep: number;
  completed: boolean;
  lastSeenAt: string;
  dontShowAgain: boolean;
}

export interface TooltipHint {
  id: string;
  targetSelector: string;
  title?: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  delay?: number;
  triggerAction?: "hover" | "focus" | "click" | "auto";
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

export type WalkthroughState = {
  activeWalkthrough: Walkthrough | null;
  currentStep: number;
  progress: Record<string, WalkthroughProgress>;
  dismissedHints: string[];
  seenFeatures: string[];
};

export type WalkthroughAction =
  | { type: "START_WALKTHROUGH"; payload: Walkthrough }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: number }
  | { type: "END_WALKTHROUGH" }
  | { type: "SKIP_WALKTHROUGH" }
  | { type: "DONT_SHOW_AGAIN"; payload: string }
  | { type: "DISMISS_HINT"; payload: string }
  | { type: "MARK_FEATURE_SEEN"; payload: string }
  | { type: "LOAD_PROGRESS"; payload: Record<string, WalkthroughProgress> }
  | { type: "RESET_ALL" };
