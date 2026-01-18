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
export { WalkthroughSettings } from "./WalkthroughSettings";
export { HelpButton } from "./HelpButton";

// Legacy components (for backward compatibility)
export { WalkthroughModal, WalkthroughTriggerButton } from "./WalkthroughModal";
export { TooltipHint, Beacon } from "./TooltipHint";
export { FeatureHighlight, NewFeatureBadge } from "./FeatureHighlight";
export { SpotlightOverlay } from "./SpotlightOverlay";

// Tours/Walkthroughs
export { 
  allTours,
  allWalkthroughs,
  getTourById,
  getWalkthroughById,
  getToursForRoute,
  getWalkthroughsForRoute,
  getToursByCategory,
  dashboardTour,
  projectSelectTour,
  cableScheduleTour,
  settingsTour,
} from "./walkthroughs";

// Page-specific tours
export {
  projectsTour,
  dashboardTour as dashboardPageTour,
  librariesTour,
  reportsTour,
  generatorTour,
  clientPortalTour,
  floorPlanTour,
  adminPortalTour,
  settingsTour as settingsPageTour,
  cableScheduleTour as cableSchedulePageTour,
  allPageTours,
  getPageTourById,
  getPageToursForRoute,
} from "./tours";

// Rich tooltip components
export {
  InfoTooltip,
  ChartTooltip,
  VideoTooltip,
  ActionTooltip,
  HelpTooltip,
} from "@/components/ui/rich-tooltip";

// Tooltip utilities for UI integration
export { NavTooltip } from "./NavTooltip";
export { FormFieldTooltip, FormLabelWithHelp } from "./FormFieldTooltip";
export { SearchTooltip, FilterTooltip, RefreshTooltip } from "./SearchTooltips";
export { buttonTooltips } from "./tooltipConfig";

// Re-export hooks from hooks folder
export { 
  useWalkthroughTrigger, 
  useWalkthroughControl,
  useAvailableTours,
} from "@/hooks/useWalkthroughTrigger";
