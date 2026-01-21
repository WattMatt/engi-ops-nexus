import { Flame, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CompletionStreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  isNewRecord?: boolean;
  className?: string;
}

export function CompletionStreakBadge({
  currentStreak,
  longestStreak,
  totalCompletions,
  isNewRecord,
  className,
}: CompletionStreakBadgeProps) {
  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { label: "Legendary", color: "text-purple-500", bg: "bg-purple-500/10" };
    if (streak >= 14) return { label: "On Fire", color: "text-orange-500", bg: "bg-orange-500/10" };
    if (streak >= 7) return { label: "Hot", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (streak >= 3) return { label: "Warming Up", color: "text-blue-500", bg: "bg-blue-500/10" };
    return { label: "Starting", color: "text-muted-foreground", bg: "bg-muted" };
  };

  const level = getStreakLevel(currentStreak);

  if (currentStreak === 0 && totalCompletions === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2", className)}>
          {currentStreak > 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 font-medium transition-all",
                level.bg,
                level.color,
                isNewRecord && "animate-pulse ring-2 ring-primary ring-offset-2"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              {currentStreak} day{currentStreak !== 1 ? "s" : ""}
            </Badge>
          )}
          
          {longestStreak > 0 && longestStreak > currentStreak && (
            <Badge variant="secondary" className="gap-1.5">
              <Trophy className="h-3 w-3 text-yellow-500" />
              Best: {longestStreak}
            </Badge>
          )}
          
          {totalCompletions > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <Zap className="h-3 w-3 text-green-500" />
              {totalCompletions}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">{level.label} Streak! 🔥</p>
          <p className="text-muted-foreground">
            You've completed items {currentStreak} day{currentStreak !== 1 ? "s" : ""} in a row.
          </p>
          {longestStreak > currentStreak && (
            <p className="text-muted-foreground">
              Your record is {longestStreak} days - keep going!
            </p>
          )}
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Total completions: {totalCompletions}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
