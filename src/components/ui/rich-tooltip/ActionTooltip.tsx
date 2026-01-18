import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

interface ActionTooltipProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions: TooltipAction[];
  icon?: LucideIcon;
  iconColor?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  maxWidth?: string;
  actionsLayout?: "horizontal" | "vertical";
}

/**
 * Clickable tooltips with action buttons
 */
export function ActionTooltip({
  children,
  title,
  description,
  actions,
  icon: Icon,
  iconColor = "text-primary",
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
  maxWidth = "280px",
  actionsLayout = "horizontal",
}: ActionTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "p-3 bg-popover border border-border shadow-lg",
            className
          )}
          style={{ maxWidth }}
        >
          <div className="space-y-3">
            {/* Header with optional icon */}
            {(Icon || title) && (
              <div className="flex items-start gap-2">
                {Icon && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className={cn("h-4 w-4", iconColor)} />
                  </div>
                )}
                <div className="flex-1 space-y-0.5">
                  {title && (
                    <h4 className="font-semibold text-sm text-foreground">
                      {title}
                    </h4>
                  )}
                  {description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description only (no header) */}
            {!Icon && !title && description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {/* Action buttons */}
            <div
              className={cn(
                "flex gap-2",
                actionsLayout === "vertical" ? "flex-col" : "flex-row flex-wrap"
              )}
            >
              {actions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    disabled={action.disabled}
                    className={cn(
                      "h-7 text-xs gap-1",
                      actionsLayout === "vertical" && "w-full justify-start"
                    )}
                  >
                    {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ActionTooltip;
