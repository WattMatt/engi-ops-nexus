import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { cn } from "@/lib/utils";

interface FeatureHighlightProps {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  isNew?: boolean;
  version?: string;
  learnMoreUrl?: string;
  onLearnMore?: () => void;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
}

export function FeatureHighlight({
  id,
  targetSelector,
  title,
  description,
  isNew = true,
  version,
  learnMoreUrl,
  onLearnMore,
  position = "bottom",
  showOnce = true,
}: FeatureHighlightProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, targetRect: null as DOMRect | null });
  const { isFeatureSeen, markFeatureSeen } = useWalkthrough();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showOnce && isFeatureSeen(id)) {
      return;
    }

    const timer = setTimeout(() => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 140;
        const offset = 16;

        let top = 0;
        let left = 0;

        switch (position) {
          case "top":
            top = rect.top - cardHeight - offset;
            left = rect.left + rect.width / 2 - cardWidth / 2;
            break;
          case "bottom":
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - cardWidth / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - cardHeight / 2;
            left = rect.left - cardWidth - offset;
            break;
          case "right":
            top = rect.top + rect.height / 2 - cardHeight / 2;
            left = rect.right + offset;
            break;
        }

        // Ensure stays within viewport
        left = Math.max(8, Math.min(left, window.innerWidth - cardWidth - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - cardHeight - 8));

        setCoords({ top, left, targetRect: rect });
        setIsVisible(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [id, targetSelector, position, showOnce, isFeatureSeen]);

  const handleDismiss = () => {
    setIsVisible(false);
    markFeatureSeen(id);
  };

  const handleLearnMore = () => {
    if (learnMoreUrl) {
      window.open(learnMoreUrl, "_blank");
    }
    onLearnMore?.();
    handleDismiss();
  };

  if (!isVisible) return null;

  const highlight = (
    <>
      {/* Spotlight overlay */}
      {coords.targetRect && (
        <div 
          className="fixed inset-0 z-[98] pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${coords.targetRect.left + coords.targetRect.width / 2}px ${coords.targetRect.top + coords.targetRect.height / 2}px, transparent 0px, transparent ${Math.max(coords.targetRect.width, coords.targetRect.height) / 2 + 20}px, rgba(0,0,0,0.5) ${Math.max(coords.targetRect.width, coords.targetRect.height) / 2 + 40}px)`,
          }}
        />
      )}

      {/* Feature card */}
      <div
        ref={containerRef}
        className="fixed z-[100] w-[320px] rounded-xl border border-primary/20 bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300"
        style={{
          top: coords.top,
          left: coords.left,
        }}
      >
        {/* Gradient header */}
        <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
          {isNew && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              {version ? `New in ${version}` : "New"}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{title}</h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-2">
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Got it
            </Button>
            {(learnMoreUrl || onLearnMore) && (
              <Button size="sm" onClick={handleLearnMore} className="gap-1">
                Learn more
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </>
  );

  return createPortal(highlight, document.body);
}

// Compact inline badge for new features
interface NewFeatureBadgeProps {
  children: React.ReactNode;
  featureId?: string;
  showOnce?: boolean;
  className?: string;
}

export function NewFeatureBadge({ 
  children, 
  featureId,
  showOnce = true,
  className 
}: NewFeatureBadgeProps) {
  const { isFeatureSeen, markFeatureSeen } = useWalkthrough();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (featureId && showOnce && isFeatureSeen(featureId)) {
      setIsVisible(false);
    }
  }, [featureId, showOnce, isFeatureSeen]);

  const handleClick = () => {
    if (featureId) {
      markFeatureSeen(featureId);
    }
  };

  if (!isVisible) return <>{children}</>;

  return (
    <div className={cn("relative inline-flex", className)} onClick={handleClick}>
      {children}
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
      </span>
    </div>
  );
}
