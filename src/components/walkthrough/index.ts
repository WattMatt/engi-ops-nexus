// Core types
export * from "./types";

// Context and hooks
export { 
  WalkthroughProvider, 
  useWalkthrough,
  useWalkthroughState,
  useWalkthroughActions,
} from "./WalkthroughContext";

// Step hook
export { useWalkthroughStep } from "./hooks/useWalkthroughStep";

// Components
export { WalkthroughController } from "./WalkthroughController";
export { WalkthroughOverlay } from "./WalkthroughOverlay";
export { WalkthroughTooltip } from "./WalkthroughTooltip";
export { WalkthroughStepComponent } from "./WalkthroughStep";
export { WalkthroughProgress } from "./WalkthroughProgress";
export { WalkthroughControls } from "./WalkthroughControls";

// Legacy components (for backward compatibility)
export { WalkthroughModal, WalkthroughTriggerButton } from "./WalkthroughModal";
export { TooltipHint, Beacon } from "./TooltipHint";
export { FeatureHighlight, NewFeatureBadge } from "./FeatureHighlight";
export { SpotlightOverlay } from "./SpotlightOverlay";

// Re-export hooks from hooks folder
export { useWalkthroughTrigger, useWalkthroughControl } from "@/hooks/useWalkthroughTrigger";
