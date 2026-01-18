import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  HelpCircle, 
  PlayCircle, 
  BookOpen, 
  ExternalLink,
  RotateCcw,
  Check
} from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { useAvailableTours } from "@/hooks/useWalkthroughTrigger";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  documentationUrl?: string;
}

/**
 * Help button component that provides access to:
 * - Available tours for current page
 * - Documentation links
 * - Reset tour progress
 */
export function HelpButton({
  className,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  documentationUrl = "/docs",
}: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { startWalkthrough, hasCompletedWalkthrough, actions } = useWalkthrough();
  const { allTours, completedTours, pendingTours } = useAvailableTours();

  const handleStartTour = (tourId: string) => {
    const tour = allTours.find(t => t.id === tourId);
    if (tour) {
      startWalkthrough(tour);
      setIsOpen(false);
    }
  };

  const handleResetTour = (tourId: string) => {
    actions.resetTour(tourId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "relative",
            pendingTours.length > 0 && "after:absolute after:top-1 after:right-1 after:w-2 after:h-2 after:bg-primary after:rounded-full after:animate-pulse",
            className
          )}
          aria-label="Help and guides"
          data-testid="help-button"
        >
          <HelpCircle className="h-5 w-5" />
          {showLabel && <span className="ml-2">Help</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Help & Guides
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Available Tours */}
        {allTours.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Page Guides
            </DropdownMenuLabel>
            {allTours.map((tour) => {
              const isCompleted = hasCompletedWalkthrough(tour.id);
              return (
                <DropdownMenuItem
                  key={tour.id}
                  onClick={() => handleStartTour(tour.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    <span>{tour.name}</span>
                  </div>
                  {isCompleted && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Documentation Link */}
        <DropdownMenuItem
          onClick={() => window.open(documentationUrl, "_blank")}
          className="cursor-pointer"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Documentation
        </DropdownMenuItem>

        {/* Reset Progress */}
        {completedTours.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Reset Guides
            </DropdownMenuLabel>
            {completedTours.map((tour) => (
              <DropdownMenuItem
                key={tour.id}
                onClick={() => handleResetTour(tour.id)}
                className="cursor-pointer text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset "{tour.name}"
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
