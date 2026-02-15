import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Link2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { KanbanBoard } from "./KanbanBoard";
import { TableView } from "./TableView";
import { CalendarView } from "./CalendarView";
import { RoadmapPhaseFilter } from "./RoadmapPhaseFilter";
import { BulkSyncTasksDialog } from "./BulkSyncTasksDialog";
import { RoadmapItemSelector } from "./RoadmapItemSelector";
import { TaskExportPDFButton } from "./TaskExportPDFButton";
import { useMilestoneNotifications } from "@/hooks/useMilestoneNotifications";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";

interface EnhancedTasksManagerProps {
  projectId: string;
  diaryEntryId?: string;
}

export const EnhancedTasksManager = ({ projectId, diaryEntryId }: EnhancedTasksManagerProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkSyncOpen, setBulkSyncOpen] = useState(false);
  const [view, setView] = useState<"board" | "table" | "calendar">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
  
  // Real-time milestone progress notifications
  useMilestoneNotifications({ projectId, enabled: true });
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
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
        status,
        due_date: dueDate || null,
        start_date: startDate || null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        progress: 0,
        time_tracked_hours: 0,
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
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["table-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-linked-tasks-stats"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("medium");
    setStatus("pending");
    setDueDate("");
    setStartDate("");
    setEstimatedHours("");
    setRoadmapItemId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Task Management</h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <RoadmapPhaseFilter
            projectId={projectId}
            value={phaseFilter}
            onChange={setPhaseFilter}
          />
          
          <Button variant="outline" onClick={() => setBulkSyncOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Bulk Link
          </Button>

          <TaskExportPDFButton projectId={projectId} />

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your project
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
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
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="board">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Board
          </TabsTrigger>
          <TabsTrigger value="table">
            <List className="h-4 w-4 mr-2" />
            Table
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="report-history">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          <KanbanBoard projectId={projectId} onCreateTask={() => setDialogOpen(true)} phaseFilter={phaseFilter} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <TableView projectId={projectId} onCreateTask={() => setDialogOpen(true)} phaseFilter={phaseFilter} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView projectId={projectId} />
        </TabsContent>
        <TabsContent value="report-history" className="mt-6">
          <ReportHistoryPanel
            dbTable="site_diary_reports"
            foreignKeyColumn="project_id"
            foreignKeyValue={projectId}
            storageBucket="site-diary-reports"
            title="Site Diary Task Reports"
          />
        </TabsContent>
      </Tabs>

      <BulkSyncTasksDialog
        open={bulkSyncOpen}
        onOpenChange={setBulkSyncOpen}
        projectId={projectId}
      />
    </div>
  );
};
