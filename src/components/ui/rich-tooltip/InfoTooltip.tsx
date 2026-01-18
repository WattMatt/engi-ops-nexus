import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideIcon, Info, ExternalLink, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutKey {
  key: string;
  label?: string;
}

interface InfoTooltipProps {
  children: ReactNode;
  title?: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  shortcuts?: ShortcutKey[];
  learnMoreUrl?: string;
  learnMoreLabel?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  maxWidth?: string;
}

/**
 * Extended tooltip with title, description, icon, shortcuts, and links
 */
export function InfoTooltip({
  children,
  title,
  description,
  icon: Icon = Info,
  iconColor = "text-primary",
  shortcuts,
  learnMoreUrl,
  learnMoreLabel = "Learn more",
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
  maxWidth = "320px",
}: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "p-0 bg-popover border border-border shadow-lg",
            className
          )}
          style={{ maxWidth }}
        >
          <div className="p-3 space-y-2">
            {/* Header with icon and title */}
            {(Icon || title) && (
              <div className="flex items-start gap-2">
                {Icon && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className={cn("h-4 w-4", iconColor)} />
                  </div>
                )}
                {title && (
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-foreground">
                      {title}
                    </h4>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>

            {/* Keyboard shortcuts */}
            {shortcuts && shortcuts.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex items-center gap-1">
                  {shortcuts.map((shortcut, index) => (
                    <span key={index} className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                        {shortcut.key}
                      </kbd>
                      {shortcut.label && (
                        <span className="text-xs text-muted-foreground">
                          {shortcut.label}
                        </span>
                      )}
                      {index < shortcuts.length - 1 && (
                        <span className="text-muted-foreground mx-0.5">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Learn more link */}
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
              >
                {learnMoreLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default InfoTooltip;
