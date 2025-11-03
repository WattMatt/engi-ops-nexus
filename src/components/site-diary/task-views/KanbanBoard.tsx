import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TaskDetailsModal } from "./TaskDetailsModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  progress: number;
  profiles?: { full_name: string | null };
}

interface KanbanBoardProps {
  projectId: string;
  onCreateTask: () => void;
}

const STATUSES = [
  { id: "pending", label: "To Do", icon: Circle },
  { id: "in_progress", label: "In Progress", icon: Clock },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export const KanbanBoard = ({ projectId, onCreateTask }: KanbanBoardProps) => {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const { data: tasks } = useQuery({
    queryKey: ["kanban-tasks", projectId],
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
          assigned_to,
          progress
        `)
        .eq("project_id", projectId)
        .order("position");

      if (error) throw error;

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

      return tasksWithProfiles as Task[];
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: any }) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ status })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      toast.success("Task moved successfully");
    },
  });

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedTask && draggedTask.status !== status) {
      updateTaskStatus.mutate({ taskId: draggedTask.id, status: status as any });
    }
    setDraggedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks?.filter((task) => task.status === status) || [];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-300px)]">
      {STATUSES.map((status) => {
        const StatusIcon = status.icon;
        const statusTasks = getTasksByStatus(status.id);

        return (
          <div
            key={status.id}
            className="flex flex-col bg-muted/30 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                <h3 className="font-semibold">{status.label}</h3>
                <Badge variant="secondary">{statusTasks.length}</Badge>
              </div>
              {status.id === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCreateTask}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              {statusTasks.map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => setSelectedTask(task.id)}
                  className="cursor-pointer hover:shadow-md transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                    {task.progress > 0 && (
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                    {task.profiles?.full_name && (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {task.profiles.full_name[0]}
                        </div>
                        <span className="text-xs">{task.profiles.full_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask}
          projectId={projectId}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};
