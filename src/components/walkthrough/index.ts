// Core types
export * from "./types";

// Context and hooks
export { WalkthroughProvider, useWalkthrough } from "./WalkthroughContext";

// Components
export { WalkthroughModal, WalkthroughTriggerButton } from "./WalkthroughModal";
export { TooltipHint, Beacon } from "./TooltipHint";
export { FeatureHighlight, NewFeatureBadge } from "./FeatureHighlight";
export { SpotlightOverlay } from "./SpotlightOverlay";

// Re-export hooks from hooks folder
export { useWalkthroughTrigger, useWalkthroughControl } from "@/hooks/useWalkthroughTrigger";
