import { useState, useEffect, useCallback, useRef } from "react";
import { WalkthroughStep, TooltipPlacement } from "../types";

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowPosition: { top?: number; left?: number };
}

interface UseWalkthroughStepResult {
  targetElement: HTMLElement | null;
  targetRect: ElementRect | null;
  tooltipPosition: TooltipPosition | null;
  isElementVisible: boolean;
  scrollToTarget: () => void;
  focusTarget: () => void;
  updatePosition: () => void;
}

const TOOLTIP_OFFSET = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT = 200; // Approximate

export function useWalkthroughStep(step: WalkthroughStep | null): UseWalkthroughStepResult {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [isElementVisible, setIsElementVisible] = useState(false);
  const previousElementRef = useRef<HTMLElement | null>(null);

  // Find target element
  const findTargetElement = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetElement(null);
      setTargetRect(null);
      return null;
    }

    try {
      const element = document.querySelector<HTMLElement>(step.targetSelector);
      setTargetElement(element);
      return element;
    } catch (error) {
      console.warn(`Invalid selector: ${step.targetSelector}`, error);
      setTargetElement(null);
      return null;
    }
  }, [step?.targetSelector]);

  // Calculate element rect
  const calculateRect = useCallback((element: HTMLElement): ElementRect => {
    const rect = element.getBoundingClientRect();
    const padding = step?.spotlightPadding || 8;
    
    return {
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding + window.scrollX,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding + window.scrollY,
      right: rect.right + padding + window.scrollX,
    };
  }, [step?.spotlightPadding]);

  // Calculate best tooltip placement
  const calculateTooltipPosition = useCallback((rect: ElementRect, preferredPlacement: TooltipPlacement = "bottom"): TooltipPosition => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Available space in each direction
    const spaceTop = rect.top - scrollY;
    const spaceBottom = viewportHeight - (rect.bottom - scrollY);
    const spaceLeft = rect.left - scrollX;
    const spaceRight = viewportWidth - (rect.right - scrollX);

    let placement = preferredPlacement;
    let top = 0;
    let left = 0;

    // Auto placement logic
    if (placement === "auto") {
      const spaces = [
        { dir: "bottom" as const, space: spaceBottom },
        { dir: "top" as const, space: spaceTop },
        { dir: "right" as const, space: spaceRight },
        { dir: "left" as const, space: spaceLeft },
      ];
      placement = spaces.reduce((a, b) => (a.space > b.space ? a : b)).dir;
    }

    // Calculate position based on placement
    switch (placement) {
      case "top":
      case "top-start":
      case "top-end":
        top = rect.top - TOOLTIP_HEIGHT - TOOLTIP_OFFSET;
        left = placement === "top-start" 
          ? rect.left 
          : placement === "top-end" 
            ? rect.right - TOOLTIP_WIDTH 
            : rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        break;

      case "bottom":
      case "bottom-start":
      case "bottom-end":
        top = rect.bottom + TOOLTIP_OFFSET;
        left = placement === "bottom-start" 
          ? rect.left 
          : placement === "bottom-end" 
            ? rect.right - TOOLTIP_WIDTH 
            : rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
        break;

      case "left":
        top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
        left = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
        break;

      case "right":
        top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
        left = rect.right + TOOLTIP_OFFSET;
        break;
    }

    // Clamp to viewport
    left = Math.max(TOOLTIP_OFFSET, Math.min(left, viewportWidth - TOOLTIP_WIDTH - TOOLTIP_OFFSET + scrollX));
    top = Math.max(TOOLTIP_OFFSET + scrollY, top);

    // Calculate arrow position
    const arrowPosition = {
      left: placement.includes("top") || placement.includes("bottom")
        ? Math.min(Math.max(rect.left + rect.width / 2 - left, 20), TOOLTIP_WIDTH - 20)
        : undefined,
      top: placement === "left" || placement === "right"
        ? rect.top + rect.height / 2 - top
        : undefined,
    };

    return { top, left, placement, arrowPosition };
  }, []);

  // Update position
  const updatePosition = useCallback(() => {
    const element = findTargetElement();
    if (!element) {
      setTargetRect(null);
      setTooltipPosition(null);
      setIsElementVisible(false);
      return;
    }

    const rect = calculateRect(element);
    setTargetRect(rect);
    
    const position = calculateTooltipPosition(rect, step?.placement);
    setTooltipPosition(position);

    // Check visibility
    const elementRect = element.getBoundingClientRect();
    const isVisible = 
      elementRect.top < window.innerHeight &&
      elementRect.bottom > 0 &&
      elementRect.left < window.innerWidth &&
      elementRect.right > 0;
    setIsElementVisible(isVisible);
  }, [findTargetElement, calculateRect, calculateTooltipPosition, step?.placement]);

  // Scroll to target element
  const scrollToTarget = useCallback(() => {
    const element = targetElement || findTargetElement();
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    // Update position after scroll
    setTimeout(updatePosition, 500);
  }, [targetElement, findTargetElement, updatePosition]);

  // Focus target element
  const focusTarget = useCallback(() => {
    const element = targetElement || findTargetElement();
    if (!element) return;

    // Store previous focus
    previousElementRef.current = document.activeElement as HTMLElement;

    // Focus the element if focusable
    if (element.tabIndex >= 0 || 
        element.tagName === "INPUT" || 
        element.tagName === "BUTTON" || 
        element.tagName === "A" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA") {
      element.focus();
    }
  }, [targetElement, findTargetElement]);

  // Set up observers and listeners
  useEffect(() => {
    if (!step) {
      setTargetElement(null);
      setTargetRect(null);
      setTooltipPosition(null);
      return;
    }

    // Initial update
    updatePosition();

    // Handle resize and scroll
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    // Mutation observer for dynamic content
    const observer = new MutationObserver(() => {
      setTimeout(updatePosition, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Wait for element if configured
    let pollInterval: ReturnType<typeof setInterval>;
    if (step.waitForElement && !targetElement) {
      pollInterval = setInterval(() => {
        const element = findTargetElement();
        if (element) {
          clearInterval(pollInterval);
          updatePosition();
          scrollToTarget();
        }
      }, 100);
    }

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      observer.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, targetElement, updatePosition, scrollToTarget, findTargetElement]);

  // Auto scroll to target on step change
  useEffect(() => {
    if (step && !isElementVisible && targetElement) {
      scrollToTarget();
    }
  }, [step, isElementVisible, targetElement, scrollToTarget]);

  return {
    targetElement,
    targetRect,
    tooltipPosition,
    isElementVisible,
    scrollToTarget,
    focusTarget,
    updatePosition,
  };
}
