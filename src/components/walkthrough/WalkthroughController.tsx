import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { WalkthroughModal } from "./WalkthroughModal";
import { useWalkthrough } from "./WalkthroughContext";
import { getWalkthroughsForRoute } from "./walkthroughs";

/**
 * Global walkthrough controller that renders the active walkthrough modal
 * and auto-triggers route-based walkthroughs
 */
export function WalkthroughController() {
  const location = useLocation();
  const { state, startWalkthrough, shouldShowWalkthrough } = useWalkthrough();

  // Auto-trigger walkthroughs based on route
  useEffect(() => {
    // Don't trigger if a walkthrough is already active
    if (state.activeWalkthrough) return;

    // Get walkthroughs for current route
    const walkthroughs = getWalkthroughsForRoute(location.pathname);

    // Find the first walkthrough that should be shown
    for (const walkthrough of walkthroughs) {
      if (walkthrough.triggerOnFirstVisit && shouldShowWalkthrough(walkthrough.id)) {
        // Delay to allow page to render
        const timer = setTimeout(() => {
          startWalkthrough(walkthrough);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, state.activeWalkthrough, shouldShowWalkthrough, startWalkthrough]);

  return <WalkthroughModal />;
}
