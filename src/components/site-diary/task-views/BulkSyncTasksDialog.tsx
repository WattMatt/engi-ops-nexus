import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Search, CheckCircle2, Clock, Circle, Map } from "lucide-react";
import { RoadmapItemSelector } from "./RoadmapItemSelector";
import { cn } from "@/lib/utils";

interface BulkSyncTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  roadmap_item_id: string | null;
  roadmap_item?: { title: string; phase: string | null } | null;
}

export const BulkSyncTasksDialog = ({ 
  open, 
  onOpenChange, 
  projectId 
}: BulkSyncTasksDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [targetRoadmapItem, setTargetRoadmapItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all tasks for the project
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["bulk-sync-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          status,
          priority,
          roadmap_item_id
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch roadmap items for linked tasks
      const tasksWithRoadmap = await Promise.all(
        (data || []).map(async (task) => {
          if (task.roadmap_item_id) {
            const { data: roadmapItem } = await supabase
              .from("project_roadmap_items")
              .select("title, phase")
              .eq("id", task.roadmap_item_id)
              .single();
            return { ...task, roadmap_item: roadmapItem };
          }
          return { ...task, roadmap_item: null };
        })
      );

      return tasksWithRoadmap as Task[];
    },
    enabled: open,
  });

  const bulkLinkMutation = useMutation({
    mutationFn: async () => {
      if (!targetRoadmapItem || selectedTasks.length === 0) {
        throw new Error("Please select tasks and a roadmap item");
      }

      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ roadmap_item_id: targetRoadmapItem })
        .in("id", selectedTasks);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedTasks.length} tasks linked to roadmap item`);
      queryClient.invalidateQueries({ queryKey: ["bulk-sync-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["site-diary-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["table-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-linked-tasks-stats"] });
      setSelectedTasks([]);
      setTargetRoadmapItem(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link tasks");
    },
  });

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const unlinkedTasks = filteredTasks.filter((t) => !t.roadmap_item_id);
  const linkedTasks = filteredTasks.filter((t) => t.roadmap_item_id);

  const toggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleAll = (tasks: Task[]) => {
    const taskIds = tasks.map((t) => t.id);
    const allSelected = taskIds.every((id) => selectedTasks.includes(id));
    
    if (allSelected) {
      setSelectedTasks((prev) => prev.filter((id) => !taskIds.includes(id)));
    } else {
      setSelectedTasks((prev) => [...new Set([...prev, ...taskIds])]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
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

  const renderTaskList = (taskList: Task[], title: string, showRoadmapInfo: boolean) => {
    if (taskList.length === 0) return null;

    const allSelected = taskList.every((t) => selectedTasks.includes(t.id));
    const someSelected = taskList.some((t) => selectedTasks.includes(t.id));

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 py-2 border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => toggleAll(taskList)}
            className={cn(someSelected && !allSelected && "data-[state=checked]:bg-primary/50")}
          />
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className="h-5">
            {taskList.length}
          </Badge>
        </div>
        <div className="space-y-1">
          {taskList.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
                selectedTasks.includes(task.id) && "bg-primary/10"
              )}
              onClick={() => toggleTask(task.id)}
            >
              <Checkbox
                checked={selectedTasks.includes(task.id)}
                onCheckedChange={() => toggleTask(task.id)}
              />
              {getStatusIcon(task.status)}
              <span className="flex-1 text-sm truncate">{task.title}</span>
              <Badge variant={getPriorityColor(task.priority)} className="h-5 text-xs">
                {task.priority}
              </Badge>
              {showRoadmapInfo && task.roadmap_item && (
                <Badge variant="outline" className="h-5 gap-1 bg-primary/10">
                  <Map className="h-3 w-3" />
                  <span className="text-xs truncate max-w-[100px]">
                    {task.roadmap_item.title}
                  </span>
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bulk Link Tasks to Roadmap
          </DialogTitle>
          <DialogDescription>
            Select multiple tasks to link them to a roadmap item at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target roadmap item selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link to Roadmap Item</label>
            <RoadmapItemSelector
              projectId={projectId}
              value={targetRoadmapItem}
              onChange={setTargetRoadmapItem}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Task list */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {renderTaskList(unlinkedTasks, "Unlinked Tasks", false)}
                {renderTaskList(linkedTasks, "Already Linked (will be re-linked)", true)}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tasks found</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Selection summary */}
          {selectedTasks.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-sm">
                <strong>{selectedTasks.length}</strong> task{selectedTasks.length !== 1 ? "s" : ""} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => bulkLinkMutation.mutate()}
            disabled={selectedTasks.length === 0 || !targetRoadmapItem || bulkLinkMutation.isPending}
          >
            {bulkLinkMutation.isPending
              ? "Linking..."
              : `Link ${selectedTasks.length} Task${selectedTasks.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
