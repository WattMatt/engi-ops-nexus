import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Map } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TaskDetailsModal } from "./TaskDetailsModal";
import { cn } from "@/lib/utils";
import { useRoadmapCompletionCheck } from "@/hooks/useRoadmapCompletionCheck";
import { RoadmapCompletionPrompt } from "@/components/dashboard/roadmap/RoadmapCompletionPrompt";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  progress: number;
  time_tracked_hours: number;
  roadmap_item_id: string | null;
  profiles?: { full_name: string | null };
  roadmap_item?: { title: string; phase: string | null } | null;
}

interface TableViewProps {
  projectId: string;
  onCreateTask: () => void;
  phaseFilter?: string | null;
}

export const TableView = ({ projectId, onCreateTask, phaseFilter }: TableViewProps) => {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const { promptData, isPromptOpen, checkAndPromptCompletion, closePrompt } = useRoadmapCompletionCheck();

  const { data: tasks } = useQuery({
    queryKey: ["table-tasks", projectId, phaseFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          assigned_to,
          progress,
          time_tracked_hours,
          roadmap_item_id
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
          let profiles = null;
          let roadmap_item = null;
          
          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            profiles = profile;
          }
          
          if (task.roadmap_item_id) {
            const { data: roadmapItem } = await supabase
              .from("project_roadmap_items")
              .select("title, phase")
              .eq("id", task.roadmap_item_id)
              .single();
            roadmap_item = roadmapItem;
          }
          
          return { ...task, profiles, roadmap_item };
        })
      );

      // Apply phase filter
      let filteredTasks = tasksWithProfiles as Task[];
      if (phaseFilter) {
        if (phaseFilter === "_unlinked") {
          filteredTasks = filteredTasks.filter((t) => !t.roadmap_item_id);
        } else {
          filteredTasks = filteredTasks.filter((t) => t.roadmap_item?.phase === phaseFilter);
        }
      }

      return filteredTasks;
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, field, value, roadmapItemId }: { taskId: string; field: string; value: any; roadmapItemId?: string | null }) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ [field]: value })
        .eq("id", taskId);

      if (error) throw error;
      return { taskId, field, value, roadmapItemId };
    },
    onSuccess: ({ taskId, field, value, roadmapItemId }) => {
      queryClient.invalidateQueries({ queryKey: ["table-tasks"] });
      toast.success("Task updated");
      
      // Check for roadmap completion when status changes
      if (field === "status" && roadmapItemId) {
        checkAndPromptCompletion(taskId, value, roadmapItemId);
      }
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Task</TableHead>
              <TableHead>Roadmap</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Time Tracked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
            <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTask(task.id)}
                >
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {task.roadmap_item ? (
                      <Badge variant="outline" className="gap-1 bg-primary/10 h-5">
                        <Map className="h-3 w-3" />
                        <span className="text-xs truncate max-w-[100px]">{task.roadmap_item.title}</span>
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.status}
                      onValueChange={(value) => {
                        updateTask.mutate({ 
                          taskId: task.id, 
                          field: "status", 
                          value,
                          roadmapItemId: task.roadmap_item_id 
                        });
                      }}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.profiles?.full_name || "-"}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="h-2 w-20" />
                      <span className="text-xs text-muted-foreground">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.time_tracked_hours || 0}h
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask}
          projectId={projectId}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Roadmap completion prompt */}
      {promptData && (
        <RoadmapCompletionPrompt
          open={isPromptOpen}
          onOpenChange={closePrompt}
          roadmapItemId={promptData.roadmapItemId}
          roadmapItemTitle={promptData.roadmapItemTitle}
          projectId={projectId}
        />
      )}
    </div>
  );
};
