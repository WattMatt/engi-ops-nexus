import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { WalkthroughStep, TooltipPlacement } from "./types";
import { WalkthroughProgress } from "./WalkthroughProgress";
import { WalkthroughControls } from "./WalkthroughControls";
import { X, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowPosition: { top?: number; left?: number };
}

interface WalkthroughTooltipProps {
  step: WalkthroughStep;
  position: TooltipPosition | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onGoToStep: (index: number) => void;
  isAnimating?: boolean;
}

export function WalkthroughTooltip({
  step,
  position,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onGoToStep,
  isAnimating = false,
}: WalkthroughTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowContent(true), 50);
    return () => {
      setMounted(false);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setShowContent(false);
    const timer = setTimeout(() => setShowContent(true), 50);
    return () => clearTimeout(timer);
  }, [step.id]);

  if (!mounted || !position) return null;

  const getArrowClasses = () => {
    const base = "absolute w-3 h-3 bg-card rotate-45 border-border";
    
    switch (position.placement) {
      case "top":
      case "top-start":
      case "top-end":
        return cn(base, "bottom-[-6px] border-r border-b");
      case "bottom":
      case "bottom-start":
      case "bottom-end":
        return cn(base, "top-[-6px] border-l border-t");
      case "left":
        return cn(base, "right-[-6px] border-t border-r");
      case "right":
        return cn(base, "left-[-6px] border-b border-l");
      default:
        return cn(base, "top-[-6px] border-l border-t");
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (position.arrowPosition.left !== undefined) {
      return { left: position.arrowPosition.left };
    }
    if (position.arrowPosition.top !== undefined) {
      return { top: position.arrowPosition.top };
    }
    return {};
  };

  const renderInfographic = () => {
    if (!step.infographic) return null;

    const { type, src, alt, width, height, autoPlay, loop, poster } = step.infographic;

    switch (type) {
      case "image":
      case "diagram":
        return (
          <div className="relative mb-4 rounded-lg overflow-hidden bg-muted">
            <img
              src={src}
              alt={alt || step.title}
              width={width}
              height={height}
              className="w-full h-auto max-h-48 object-contain"
            />
          </div>
        );

      case "video":
        return (
          <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
            <video
              src={src}
              poster={poster}
              autoPlay={autoPlay}
              loop={loop}
              muted
              playsInline
              className="w-full h-auto max-h-48"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                const video = e.currentTarget.parentElement?.querySelector("video");
                if (video) {
                  isVideoPlaying ? video.pause() : video.play();
                }
              }}
            >
              {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        );

      case "animation":
        return (
          <div className="relative mb-4 rounded-lg overflow-hidden bg-muted">
            <img
              src={src}
              alt={alt || step.title}
              className="w-full h-auto max-h-48"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const tooltipContent = (
    <div
      className={cn(
        "fixed z-[9999] w-80 max-w-[calc(100vw-32px)]",
        "bg-card border border-border rounded-lg shadow-2xl",
        "transform transition-all duration-300 ease-out",
        showContent 
          ? "opacity-100 scale-100 translate-y-0" 
          : "opacity-0 scale-95 translate-y-2",
        isAnimating && "animate-pulse"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      role="dialog"
      aria-labelledby={`walkthrough-title-${step.id}`}
      aria-describedby={`walkthrough-content-${step.id}`}
    >
      <div className={getArrowClasses()} style={getArrowStyle()} />

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onClose}
        aria-label="Close walkthrough"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="p-4 pt-3">
        <WalkthroughProgress
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          onGoToStep={onGoToStep}
          className="mb-3"
        />

        <h3
          id={`walkthrough-title-${step.id}`}
          className="text-base font-semibold text-foreground mb-2 pr-6"
        >
          {step.title}
        </h3>

        {renderInfographic()}

        <div
          id={`walkthrough-content-${step.id}`}
          className="text-sm text-muted-foreground leading-relaxed mb-4"
        >
          {step.content || step.description}
        </div>

        {step.highlightActions && step.highlightActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {step.highlightActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                className="h-8"
              >
                {action.icon && <action.icon className="h-3.5 w-3.5 mr-1.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <WalkthroughControls
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          isFirstStep={currentIndex === 0}
          isLastStep={currentIndex === totalSteps - 1}
        />
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
