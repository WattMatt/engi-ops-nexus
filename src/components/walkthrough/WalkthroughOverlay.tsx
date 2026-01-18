import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface WalkthroughOverlayProps {
  targetRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  isActive: boolean;
  allowInteraction?: boolean;
  onOverlayClick?: () => void;
  className?: string;
}

export function WalkthroughOverlay({
  targetRect,
  isActive,
  allowInteraction = false,
  onOverlayClick,
  className,
}: WalkthroughOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isActive) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, targetRect?.top, targetRect?.left]);

  if (!mounted || !isActive) return null;

  const handleClick = (e: React.MouseEvent) => {
    // Check if click is inside the cutout
    if (targetRect && allowInteraction) {
      const { clientX, clientY } = e;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      const isInsideCutout = 
        clientX + scrollX >= targetRect.left &&
        clientX + scrollX <= targetRect.left + targetRect.width &&
        clientY + scrollY >= targetRect.top &&
        clientY + scrollY <= targetRect.top + targetRect.height;
      
      if (isInsideCutout) {
        // Allow the click to pass through
        return;
      }
    }
    
    e.preventDefault();
    e.stopPropagation();
    onOverlayClick?.();
  };

  const overlayContent = (
    <div
      className={cn(
        "fixed inset-0 z-[9998] transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-0",
        className
      )}
      onClick={handleClick}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ 
          minHeight: Math.max(document.documentElement.scrollHeight, window.innerHeight),
          minWidth: Math.max(document.documentElement.scrollWidth, window.innerWidth),
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White background = visible overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* Black rectangle = transparent cutout */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                ry="8"
                fill="black"
                className={cn(
                  "transition-all duration-300 ease-out",
                  animating && "animate-pulse"
                )}
              />
            )}
          </mask>
        </defs>
        
        {/* Semi-transparent overlay with cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          className="dark:fill-black/80"
        />
        
        {/* Spotlight border/glow effect */}
        {targetRect && (
          <rect
            x={targetRect.left - 2}
            y={targetRect.top - 2}
            width={targetRect.width + 4}
            height={targetRect.height + 4}
            rx="10"
            ry="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className={cn(
              "transition-all duration-300 ease-out",
              animating && "animate-pulse"
            )}
            style={{
              filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))",
            }}
          />
        )}
      </svg>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
