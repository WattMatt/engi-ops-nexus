import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, ChevronDown, ChevronRight, GripVertical, MoreHorizontal, 
  CheckCircle2, Circle, Clock, AlertCircle, User, Calendar,
  Trash2, Edit2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TaskGroupRow } from "./TaskGroupRow";
import { BoardTaskRow } from "./BoardTaskRow";
import { AddGroupDialog } from "./AddGroupDialog";
import { cn } from "@/lib/utils";

interface TaskGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  assigned_to: string | null;
  progress: number;
  group_id: string | null;
  position: number;
  profiles?: { full_name: string | null };
}

interface MondayBoardViewProps {
  projectId: string;
  onTaskClick: (taskId: string) => void;
  onCreateTask: (groupId?: string) => void;
}

export const MondayBoardView = ({ projectId, onTaskClick, onCreateTask }: MondayBoardViewProps) => {
  const queryClient = useQueryClient();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  // Fetch task groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["task-groups", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_groups")
        .select("*")
        .eq("project_id", projectId)
        .order("position");
      if (error) throw error;
      return data as TaskGroup[];
    },
  });

  // Fetch all tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["board-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id, title, description, status, priority, 
          due_date, start_date, assigned_to, progress, 
          group_id, position
        `)
        .eq("project_id", projectId)
        .order("position");
      
      if (error) throw error;

      // Fetch profiles for assigned users
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

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const position = (groups?.length || 0) + 1;
      const { error } = await supabase.from("task_groups").insert({
        project_id: projectId,
        name,
        color,
        position,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-groups"] });
      toast.success("Group created");
      setAddGroupOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create group");
    },
  });

  // Update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: "pending" | "in_progress" | "completed" | "cancelled" }) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ status })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
    },
  });

  // Move task to group
  const moveTaskToGroup = useMutation({
    mutationFn: async ({ taskId, groupId }: { taskId: string; groupId: string | null }) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ group_id: groupId })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-tasks"] });
      toast.success("Task moved");
    },
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getTasksByGroup = (groupId: string | null) => {
    return tasks?.filter(t => t.group_id === groupId) || [];
  };

  const getGroupStats = (groupId: string | null) => {
    const groupTasks = getTasksByGroup(groupId);
    const total = groupTasks.length;
    const completed = groupTasks.filter(t => t.status === "completed").length;
    const inProgress = groupTasks.filter(t => t.status === "in_progress").length;
    return { total, completed, inProgress };
  };

  const ungroupedTasks = getTasksByGroup(null);
  const ungroupedStats = getGroupStats(null);

  if (groupsLoading || tasksLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {tasks?.length || 0} tasks • {groups?.length || 0} groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddGroupOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
          <Button size="sm" onClick={() => onCreateTask()}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground sticky top-0 z-10">
        <div className="col-span-4">Task</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Assignee</div>
        <div className="col-span-2">Due Date</div>
        <div className="col-span-2">Progress</div>
      </div>

      {/* Task Groups */}
      {groups?.map(group => {
        const isCollapsed = collapsedGroups.has(group.id);
        const stats = getGroupStats(group.id);
        const groupTasks = getTasksByGroup(group.id);

        return (
          <TaskGroupRow
            key={group.id}
            group={group}
            isCollapsed={isCollapsed}
            stats={stats}
            tasks={groupTasks}
            onToggle={() => toggleGroup(group.id)}
            onTaskClick={onTaskClick}
            onStatusChange={(taskId, status) => updateTaskStatus.mutate({ taskId, status: status as "pending" | "in_progress" | "completed" | "cancelled" })}
            onAddTask={() => onCreateTask(group.id)}
          />
        );
      })}

      {/* Ungrouped Tasks */}
      {ungroupedTasks.length > 0 && (
        <div className="border rounded-lg">
          <div 
            className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer"
            onClick={() => toggleGroup("ungrouped")}
          >
            {collapsedGroups.has("ungrouped") ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <div className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
            <span className="font-medium">Ungrouped</span>
            <Badge variant="secondary" className="ml-2">{ungroupedStats.total}</Badge>
            <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {ungroupedStats.completed}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                {ungroupedStats.inProgress}
              </span>
            </div>
          </div>
          
          {!collapsedGroups.has("ungrouped") && (
            <div className="divide-y">
              {ungroupedTasks.map(task => (
                <BoardTaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  onStatusChange={(status) => updateTaskStatus.mutate({ taskId: task.id, status: status as "pending" | "in_progress" | "completed" | "cancelled" })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {(!tasks || tasks.length === 0) && (!groups || groups.length === 0) && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">
            Create groups and tasks to organize your project work
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => setAddGroupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
            <Button onClick={() => onCreateTask()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
        </div>
      )}

      <AddGroupDialog
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
        onSubmit={(name, color) => createGroup.mutate({ name, color })}
        isLoading={createGroup.isPending}
      />
    </div>
  );
};
