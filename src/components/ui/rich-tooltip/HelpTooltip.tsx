import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink, X, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpLink {
  label: string;
  url?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

interface HelpTooltipProps {
  children?: ReactNode;
  title?: string;
  description: string;
  tips?: string[];
  links?: HelpLink[];
  icon?: LucideIcon;
  iconColor?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  maxWidth?: string;
  triggerClassName?: string;
  showTriggerIcon?: boolean;
}

/**
 * Standard help icon with expandable content
 */
export function HelpTooltip({
  children,
  title,
  description,
  tips,
  links,
  icon: Icon = HelpCircle,
  iconColor = "text-muted-foreground hover:text-foreground",
  side = "top",
  align = "center",
  className,
  maxWidth = "320px",
  triggerClassName,
  showTriggerIcon = true,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const trigger = children ? (
    children
  ) : showTriggerIcon ? (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", triggerClassName)}
    >
      <Icon className={cn("h-4 w-4 transition-colors", iconColor)} />
      <span className="sr-only">Help</span>
    </Button>
  ) : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn("p-0", className)}
        style={{ maxWidth }}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {title && (
                <h4 className="font-semibold text-sm text-foreground">
                  {title}
                </h4>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>

            {/* Tips list */}
            {tips && tips.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-foreground uppercase tracking-wide">
                  Tips
                </h5>
                <ul className="space-y-1.5">
                  {tips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Links */}
            {links && links.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                {links.map((link, index) => {
                  const LinkIcon = link.icon;
                  const content = (
                    <div className="flex items-center justify-between w-full py-1.5 px-2 -mx-2 rounded-md hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        {LinkIcon && (
                          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm text-foreground">
                          {link.label}
                        </span>
                      </div>
                      {link.url ? (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  );

                  if (link.url) {
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={index}
                      onClick={link.onClick}
                      className="block w-full text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default HelpTooltip;
