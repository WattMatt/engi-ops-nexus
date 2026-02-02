import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Clock, AlertCircle, XCircle, Map } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { RoadmapItemSelector } from "./task-views/RoadmapItemSelector";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  roadmap_item_id: string | null;
  profiles?: { full_name: string | null };
  roadmap_item?: { title: string; phase: string | null } | null;
}

interface TasksManagerProps {
  projectId: string;
  diaryEntryId?: string;
}

export const TasksManager = ({ projectId, diaryEntryId }: TasksManagerProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [roadmapItemId, setRoadmapItemId] = useState<string | null>(null);

  const { data: projectMembers } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, profiles(full_name)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["site-diary-tasks", projectId, diaryEntryId],
    queryFn: async () => {
      let query = supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          description,
          assigned_to,
          status,
          priority,
          due_date,
          start_date,
          estimated_hours,
          roadmap_item_id
        `)
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });

      if (diaryEntryId) {
        query = query.eq("diary_entry_id", diaryEntryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names and roadmap items separately
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

      return tasksWithProfiles as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        project_id: projectId,
        title,
        description,
        assigned_to: assignedTo || null,
        assigned_by: user.id,
        priority,
        due_date: dueDate || null,
        start_date: startDate || null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        roadmap_item_id: roadmapItemId,
      };

      if (diaryEntryId) {
        insertData.diary_entry_id = diaryEntryId;
      }

      const { error } = await supabase.from("site_diary_tasks").insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      queryClient.invalidateQueries({ queryKey: ["site-diary-tasks"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") {
        updates.completion_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("site_diary_tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-diary-tasks"] });
      toast.success("Task status updated");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("medium");
    setDueDate("");
    setStartDate("");
    setEstimatedHours("");
    setRoadmapItemId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tasks & Action Items</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>
                Assign a task to a team member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectMembers?.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name || "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Roadmap Item</Label>
                <RoadmapItemSelector
                  projectId={projectId}
                  value={roadmapItemId}
                  onChange={setRoadmapItemId}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createTask.mutate()} disabled={!title || createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <CardTitle className="text-base">{task.title}</CardTitle>
                  </div>
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.roadmap_item && (
                  <Badge variant="outline" className="gap-1 bg-primary/10">
                    <Map className="h-3 w-3" />
                    <span className="text-xs truncate max-w-[150px]">{task.roadmap_item.title}</span>
                  </Badge>
                )}
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {task.profiles?.full_name && (
                      <span className="text-muted-foreground">
                        Assigned to: <span className="font-medium">{task.profiles.full_name}</span>
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-muted-foreground">
                        Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <Select
                    value={task.status}
                    onValueChange={(status) => updateTaskStatus.mutate({ taskId: task.id, status })}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};