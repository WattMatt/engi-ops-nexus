import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ListTodo, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedTasksBadgeProps {
  roadmapItemId: string;
  onClick?: () => void;
}

export const LinkedTasksBadge = ({ roadmapItemId, onClick }: LinkedTasksBadgeProps) => {
  const { data: taskStats } = useQuery({
    queryKey: ["roadmap-linked-tasks-stats", roadmapItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, status")
        .eq("roadmap_item_id", roadmapItemId);

      if (error) throw error;

      const total = data?.length || 0;
      const completed = data?.filter((t) => t.status === "completed").length || 0;
      
      return { total, completed };
    },
  });

  if (!taskStats || taskStats.total === 0) return null;

  const allCompleted = taskStats.completed === taskStats.total;
  const progress = Math.round((taskStats.completed / taskStats.total) * 100);

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 gap-1 cursor-pointer hover:bg-muted transition-colors",
        allCompleted && "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {allCompleted ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <ListTodo className="h-3 w-3" />
      )}
      <span className="text-xs">
        {taskStats.completed}/{taskStats.total} tasks
      </span>
    </Badge>
  );
};
