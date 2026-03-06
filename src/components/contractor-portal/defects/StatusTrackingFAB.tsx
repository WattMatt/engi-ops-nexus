/**
 * Floating Action Button with speed-dial menu for mobile-first quick actions.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "secondary";
  active?: boolean;
}

interface Props {
  actions: FABAction[];
  className?: string;
}

export function StatusTrackingFAB({ actions, className }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("fixed bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-2 md:hidden", className)}>
      {/* Speed dial actions */}
      {expanded && (
        <div className="flex flex-col-reverse items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="bg-popover text-popover-foreground text-xs font-medium px-2 py-1 rounded-md shadow-md whitespace-nowrap">
                {action.label}
              </span>
              <Button
                size="icon"
                variant={action.active ? "secondary" : "outline"}
                className={cn(
                  "h-11 w-11 rounded-full shadow-lg",
                  action.active && "ring-2 ring-primary"
                )}
                onClick={() => {
                  action.onClick();
                  setExpanded(false);
                }}
              >
                {action.icon}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <X className="h-6 w-6 transition-transform" />
        ) : (
          <Plus className="h-6 w-6 transition-transform" />
        )}
      </Button>
    </div>
  );
}
