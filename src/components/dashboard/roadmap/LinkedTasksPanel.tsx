import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  XCircle,
  ExternalLink,
  Plus,
  Unlink
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  progress: number | null;
  profiles?: { full_name: string | null };
}

interface LinkedTasksPanelProps {
  open: boolean;
  onClose: () => void;
  roadmapItemId: string;
  roadmapItemTitle: string;
  projectId: string;
  onCreateTask?: () => void;
}

export const LinkedTasksPanel = ({
  open,
  onClose,
  roadmapItemId,
  roadmapItemTitle,
  projectId,
  onCreateTask,
}: LinkedTasksPanelProps) => {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["roadmap-linked-tasks", roadmapItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          progress,
          assigned_to
        `)
        .eq("roadmap_item_id", roadmapItemId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            return { ...task, profiles: profile };
          }
          return { ...task, profiles: null };
        })
      );

      return tasksWithProfiles as LinkedTask[];
    },
    enabled: open,
  });

  const unlinkTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ roadmap_item_id: null })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-linked-tasks", roadmapItemId] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-linked-tasks-stats", roadmapItemId] });
      toast.success("Task unlinked from roadmap item");
    },
  });

  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Circle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Linked Tasks
          </SheetTitle>
          <SheetDescription>
            Tasks linked to: {roadmapItemTitle}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Progress summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Task completion</span>
              <span className="font-medium">{completedTasks}/{totalTasks} completed</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{progressPercentage}%</p>
          </div>

          {/* Create task button */}
          {onCreateTask && (
            <Button onClick={onCreateTask} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Task
            </Button>
          )}

          {/* Tasks list */}
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3 pr-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading tasks...
                </p>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium text-sm truncate",
                            task.status === "completed" && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </span>
                          <Badge variant={getPriorityColor(task.priority)} className="shrink-0 h-5 text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.profiles?.full_name && (
                            <span>Assigned: {task.profiles.full_name}</span>
                          )}
                          {task.due_date && (
                            <span>Due: {format(new Date(task.due_date), "MMM d")}</span>
                          )}
                        </div>
                        {task.progress !== null && task.progress > 0 && (
                          <div className="mt-2">
                            <Progress value={task.progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => unlinkTask.mutate(task.id)}
                        title="Unlink from roadmap"
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No tasks linked to this roadmap item</p>
                  <p className="text-xs mt-1">Create a new task or link existing tasks</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
