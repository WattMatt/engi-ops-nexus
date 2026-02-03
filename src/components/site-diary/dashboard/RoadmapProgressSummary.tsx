import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapProgressSummaryProps {
  projectId: string;
}

interface RoadmapItemWithTasks {
  id: string;
  title: string;
  phase: string | null;
  is_completed: boolean;
  taskCount: number;
  completedTaskCount: number;
  inProgressTaskCount: number;
  overdueTaskCount: number;
}

export const RoadmapProgressSummary = ({ projectId }: RoadmapProgressSummaryProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["roadmap-progress-summary", projectId],
    queryFn: async () => {
      // Get all roadmap items for the project
      const { data: roadmapItems, error: roadmapError } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, is_completed")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (roadmapError) throw roadmapError;

      // Get all tasks with roadmap links
      const { data: tasks, error: tasksError } = await supabase
        .from("site_diary_tasks")
        .select("id, status, due_date, roadmap_item_id")
        .eq("project_id", projectId)
        .not("roadmap_item_id", "is", null);

      if (tasksError) throw tasksError;

      // Calculate stats per roadmap item
      const itemsWithStats: RoadmapItemWithTasks[] = (roadmapItems || []).map((item) => {
        const linkedTasks = tasks?.filter((t) => t.roadmap_item_id === item.id) || [];
        const completedTasks = linkedTasks.filter((t) => t.status === "completed");
        const inProgressTasks = linkedTasks.filter((t) => t.status === "in_progress");
        const overdueTasks = linkedTasks.filter(
          (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
        );

        return {
          ...item,
          taskCount: linkedTasks.length,
          completedTaskCount: completedTasks.length,
          inProgressTaskCount: inProgressTasks.length,
          overdueTaskCount: overdueTasks.length,
        };
      }).filter((item) => item.taskCount > 0); // Only show items with linked tasks

      // Calculate overall stats
      const totalLinkedTasks = tasks?.length || 0;
      const totalCompleted = tasks?.filter((t) => t.status === "completed").length || 0;
      const totalInProgress = tasks?.filter((t) => t.status === "in_progress").length || 0;
      const totalOverdue = tasks?.filter(
        (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
      ).length || 0;

      return {
        items: itemsWithStats,
        totalLinkedTasks,
        totalCompleted,
        totalInProgress,
        totalOverdue,
        completionRate: totalLinkedTasks > 0 ? Math.round((totalCompleted / totalLinkedTasks) * 100) : 0,
      };
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4" />
            Roadmap Progress
          </CardTitle>
          <CardDescription>Tasks linked to roadmap milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks linked to roadmap items yet</p>
            <p className="text-xs mt-1">Link tasks to milestones to track progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPhaseColor = (phase: string | null) => {
    const colors: Record<string, string> = {
      "Planning": "border-l-blue-500",
      "Design": "border-l-purple-500",
      "Construction": "border-l-orange-500",
      "Commissioning": "border-l-green-500",
      "Drawings": "border-l-pink-500",
      "Handover": "border-l-teal-500",
    };
    return colors[phase || ""] || "border-l-slate-400";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card id="roadmap-progress-summary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="h-4 w-4" />
              Roadmap Progress
            </CardTitle>
            <CardDescription>Tasks linked to roadmap milestones</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("h-5 w-5", getProgressColor(data.completionRate))} />
            <span className={cn("text-2xl font-bold", getProgressColor(data.completionRate))}>
              {data.completionRate}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall stats */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold">{data.totalLinkedTasks}</p>
            <p className="text-xs text-muted-foreground">Linked</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{data.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{data.totalInProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center">
            <p className={cn("text-lg font-bold", data.totalOverdue > 0 ? "text-red-600" : "text-muted-foreground")}>
              {data.totalOverdue}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Roadmap items list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {data.items.slice(0, 8).map((item) => {
            const progressRate = item.taskCount > 0 
              ? Math.round((item.completedTaskCount / item.taskCount) * 100) 
              : 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "p-3 border rounded-lg border-l-4 bg-card",
                  getPhaseColor(item.phase)
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : item.overdueTaskCount > 0 ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2">
                    {item.phase || "No Phase"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progressRate} className="h-2 flex-1" />
                  <span className={cn(
                    "text-xs font-medium w-12 text-right",
                    getProgressColor(progressRate)
                  )}>
                    {item.completedTaskCount}/{item.taskCount}
                  </span>
                </div>
                {item.overdueTaskCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {item.overdueTaskCount} overdue task{item.overdueTaskCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })}
          {data.items.length > 8 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              +{data.items.length - 8} more items with linked tasks
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
