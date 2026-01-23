import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "lucide-react";

export interface RoadmapItemData {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  phase: string | null;
  parent_id: string | null;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  due_date: string | null;
  priority: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

interface AddRoadmapItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentId: string | null;
  editingItem: RoadmapItemData | null;
}

const PHASES = [
  "Planning & Preparation",
  "Design Development",
  "Documentation",
  "Tender & Procurement",
  "Construction",
  "Testing & Commissioning",
  "Handover",
  "General",
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "text-blue-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "critical", label: "Critical", color: "text-red-600" },
];

export const AddRoadmapItemDialog = ({
  open,
  onOpenChange,
  projectId,
  parentId,
  editingItem,
}: AddRoadmapItemDialogProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState("General");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [comments, setComments] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  // Fetch project team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          id,
          position,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("project_id", projectId);
      
      if (error) throw error;
      return data.map((m) => ({
        id: m.id,
        userId: m.user_id,
        name: (m.profiles as any)?.full_name || (m.profiles as any)?.email || "Unknown",
        role: m.position || "Team Member",
      }));
    },
    enabled: open,
  });

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description || "");
      setPhase(editingItem.phase || "General");
      setLinkUrl(editingItem.link_url || "");
      setLinkLabel(editingItem.link_label || "");
      setComments(editingItem.comments || "");
      setDueDate(editingItem.due_date || "");
      setPriority(editingItem.priority || "");
      setAssignedTo(editingItem.assigned_to || "");
    } else {
      setTitle("");
      setDescription("");
      setPhase("General");
      setLinkUrl("");
      setLinkLabel("");
      setComments("");
      setDueDate("");
      setPriority("");
      setAssignedTo("");
    }
  }, [editingItem, open]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      phase: string;
      link_url: string;
      link_label: string;
      comments: string;
      due_date: string;
      priority: string;
      assigned_to: string;
    }) => {
      const { error } = await supabase.from("project_roadmap_items").insert({
        project_id: projectId,
        parent_id: parentId,
        title: data.title,
        description: data.description || null,
        phase: parentId ? null : data.phase,
        link_url: data.link_url || null,
        link_label: data.link_label || null,
        comments: data.comments || null,
        due_date: data.due_date || null,
        priority: data.priority || null,
        assigned_to: data.assigned_to || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-review-content"] });
      toast.success("Roadmap item added");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      description: string;
      phase: string;
      link_url: string;
      link_label: string;
      comments: string;
      due_date: string;
      priority: string;
      assigned_to: string;
    }) => {
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({
          title: data.title,
          description: data.description || null,
          phase: data.phase,
          link_url: data.link_url || null,
          link_label: data.link_label || null,
          comments: data.comments || null,
          due_date: data.due_date || null,
          priority: data.priority || null,
          assigned_to: data.assigned_to || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-review-content"] });
      toast.success("Roadmap item updated");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update item");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        title,
        description,
        phase,
        link_url: linkUrl,
        link_label: linkLabel,
        comments,
        due_date: dueDate,
        priority,
        assigned_to: assignedTo,
      });
    } else {
      createMutation.mutate({
        title,
        description,
        phase,
        link_url: linkUrl,
        link_label: linkLabel,
        comments,
        due_date: dueDate,
        priority,
        assigned_to: assignedTo,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Edit Roadmap Item" : parentId ? "Add Sub-item" : "Add Roadmap Item"}
          </DialogTitle>
          <DialogDescription>
            {parentId
              ? "Add a child item under the selected parent"
              : "Add a new milestone or task to your project roadmap"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete bulk services documentation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this item"
              rows={2}
            />
          </div>

          {!parentId && (
            <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Assign To
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground text-xs">({member.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No team members found. Add team members in Project Settings.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL</Label>
              <Input
                id="linkUrl"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkLabel">Link Label</Label>
              <Input
                id="linkLabel"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="e.g., View Document"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments / Notes</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
