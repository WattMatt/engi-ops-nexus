import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateCableScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCableScheduleDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateCableScheduleDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schedule_name: "",
    schedule_number: "",
    revision: "Rev 0",
    schedule_date: new Date().toISOString().split("T")[0],
    layout_name: "",
    notes: "",
  });

  // Auto-generate schedule number from name if not provided
  const getScheduleNumber = (name: string, manualNumber: string) => {
    if (manualNumber.trim()) return manualNumber;
    
    // Auto-generate from name: take first 3 letters + timestamp
    const prefix = name.trim().substring(0, 3).toUpperCase() || "CS";
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const projectId = localStorage.getItem("selectedProjectId");
      console.log("Project ID from localStorage:", projectId);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session:", session);
      console.log("Session error:", sessionError);

      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in. Please log out and log in again.",
          variant: "destructive",
        });
        return;
      }

      if (!projectId) {
        toast({
          title: "Error",
          description: "No project selected. Please select a project first.",
          variant: "destructive",
        });
        return;
      }

      const scheduleNumber = getScheduleNumber(formData.schedule_name, formData.schedule_number);

      const { error } = await supabase.from("cable_schedules").insert({
        schedule_name: formData.schedule_name,
        schedule_number: scheduleNumber,
        revision: formData.revision,
        schedule_date: formData.schedule_date,
        layout_name: formData.layout_name || null,
        notes: formData.notes || null,
        project_id: projectId,
        created_by: session.user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable schedule created successfully",
      });

      onSuccess();
      setFormData({
        schedule_name: "",
        schedule_number: "",
        revision: "Rev 0",
        schedule_date: new Date().toISOString().split("T")[0],
        layout_name: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Cable schedule creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Cable Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule_name">Schedule Name *</Label>
            <Input
              id="schedule_name"
              value={formData.schedule_name}
              onChange={(e) =>
                setFormData({ ...formData, schedule_name: e.target.value })
              }
              placeholder="e.g., Ground Floor Cables, Main Distribution"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule_number">Schedule Number (Optional - Auto-generated if blank)</Label>
            <Input
              id="schedule_number"
              value={formData.schedule_number}
              onChange={(e) =>
                setFormData({ ...formData, schedule_number: e.target.value })
              }
              placeholder="Leave blank to auto-generate"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                value={formData.revision}
                onChange={(e) =>
                  setFormData({ ...formData, revision: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_date">Date</Label>
              <Input
                id="schedule_date"
                type="date"
                value={formData.schedule_date}
                onChange={(e) =>
                  setFormData({ ...formData, schedule_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="layout_name">Layout Name (Optional)</Label>
            <Input
              id="layout_name"
              value={formData.layout_name}
              onChange={(e) =>
                setFormData({ ...formData, layout_name: e.target.value })
              }
              placeholder="e.g., Prince Buthelezi Mall, Empangeni"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="e.g., All cabling is aluminium conductor, unless stated otherwise"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Cable Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
