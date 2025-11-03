import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialQuadrant?: { urgent: boolean; important: boolean } | null;
  onSuccess: () => void;
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  projectId,
  initialQuadrant,
  onSuccess,
}: CreateTaskDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_urgent: initialQuadrant?.urgent || false,
    is_important: initialQuadrant?.important || false,
    priority: "medium",
    due_date: "",
    tags: "",
    estimated_hours: "",
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      created_by: userData.user.id,
      title: formData.title,
      description: formData.description || null,
      is_urgent: formData.is_urgent,
      is_important: formData.is_important,
      priority: formData.priority,
      due_date: formData.due_date || null,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setFormData({
        title: "",
        description: "",
        is_urgent: false,
        is_important: false,
        priority: "medium",
        due_date: "",
        tags: "",
        estimated_hours: "",
      });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project using the Eisenhower Matrix
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="urgent">Urgent</Label>
              <Switch
                id="urgent"
                checked={formData.is_urgent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_urgent: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="important">Important</Label>
              <Switch
                id="important"
                checked={formData.is_important}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_important: checked })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., frontend, bug, urgent"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              placeholder="0.0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};