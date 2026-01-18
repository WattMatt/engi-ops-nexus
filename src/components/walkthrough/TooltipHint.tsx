import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, Lightbulb, Info } from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { cn } from "@/lib/utils";

interface TooltipHintProps {
  id: string;
  targetSelector: string;
  title?: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  delay?: number;
  variant?: "info" | "tip" | "new";
  showCloseButton?: boolean;
  onDismiss?: () => void;
}

export function TooltipHint({
  id,
  targetSelector,
  title,
  content,
  position = "bottom",
  showOnce = true,
  delay = 500,
  variant = "tip",
  showCloseButton = true,
  onDismiss,
}: TooltipHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isHintDismissed, dismissHint } = useWalkthrough();

  useEffect(() => {
    if (showOnce && isHintDismissed(id)) {
      return;
    }

    const timer = setTimeout(() => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const tooltipWidth = 280;
        const tooltipHeight = 100;
        const offset = 12;

        let top = 0;
        let left = 0;

        switch (position) {
          case "top":
            top = rect.top - tooltipHeight - offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "bottom":
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - offset;
            break;
          case "right":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + offset;
            break;
        }

        // Ensure tooltip stays within viewport
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [id, targetSelector, position, delay, showOnce, isHintDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissHint(id);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const variantStyles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/50",
      border: "border-blue-200 dark:border-blue-800",
      icon: <Info className="h-4 w-4 text-blue-600" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
    },
    tip: {
      bg: "bg-amber-50 dark:bg-amber-950/50",
      border: "border-amber-200 dark:border-amber-800",
      icon: <Lightbulb className="h-4 w-4 text-amber-600" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
    },
    new: {
      bg: "bg-green-50 dark:bg-green-950/50",
      border: "border-green-200 dark:border-green-800",
      icon: <span className="text-xs font-bold text-green-600">NEW</span>,
      iconBg: "bg-green-100 dark:bg-green-900/50",
    },
  };

  const styles = variantStyles[variant];

  const tooltip = (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[100] w-[280px] rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95 duration-200",
        styles.bg,
        styles.border
      )}
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      {/* Arrow indicator */}
      <div
        className={cn(
          "absolute w-3 h-3 rotate-45 border",
          styles.bg,
          position === "bottom" && "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t",
          position === "top" && "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b",
          position === "left" && "-right-1.5 top-1/2 -translate-y-1/2 border-t border-r",
          position === "right" && "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l",
          styles.border
        )}
      />

      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center", styles.iconBg)}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-semibold text-sm text-foreground mb-1">{title}</h4>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
          </div>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 -mr-1 -mt-1"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(tooltip, document.body);
}

// Beacon component for drawing attention
interface BeaconProps {
  targetSelector: string;
  onClick?: () => void;
  color?: "primary" | "warning" | "success";
}

export function Beacon({ targetSelector, onClick, color = "primary" }: BeaconProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width / 2,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [targetSelector]);

  if (!coords) return null;

  const colorStyles = {
    primary: "bg-primary",
    warning: "bg-amber-500",
    success: "bg-green-500",
  };

  const beacon = (
    <button
      className="fixed z-[99] transform -translate-x-1/2 -translate-y-1/2"
      style={{
        top: coords.top,
        left: coords.left,
      }}
      onClick={onClick}
    >
      <span className="relative flex h-4 w-4">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          colorStyles[color]
        )} />
        <span className={cn(
          "relative inline-flex rounded-full h-4 w-4",
          colorStyles[color]
        )} />
      </span>
    </button>
  );

  return createPortal(beacon, document.body);
}
