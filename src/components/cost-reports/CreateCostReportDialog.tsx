import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface CreateCostReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export const CreateCostReportDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateCostReportDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    report_number: "",
    report_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Fetch project data to auto-populate fields
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("cost_reports").insert({
        project_id: projectId,
        report_number: parseInt(formData.report_number),
        report_date: formData.report_date,
        project_number: project?.project_number || "",
        project_name: project?.name || "",
        client_name: project?.client_name || "",
        site_handover_date: project?.site_handover_date || null,
        practical_completion_date: project?.practical_completion_date || null,
        electrical_contractor: project?.electrical_contractor || null,
        earthing_contractor: project?.earthing_contractor || null,
        standby_plants_contractor: project?.standby_plants_contractor || null,
        cctv_contractor: project?.cctv_contractor || null,
        notes: formData.notes || null,
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cost report created successfully",
      });

      onSuccess();
      setFormData({
        report_number: "",
        report_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (error: any) {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Cost Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">Project Information (Auto-populated)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Project:</span>
                <p className="font-medium">{project?.project_number || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{project?.name || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Client:</span>
                <p className="font-medium">{project?.client_name || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contractor:</span>
                <p className="font-medium">{project?.electrical_contractor || "Not set"}</p>
              </div>
            </div>
            {(!project?.project_number || !project?.client_name) && (
              <p className="text-xs text-amber-600">
                ⚠️ Some project fields are missing. Update them in Project Settings.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report_number">Report Number *</Label>
              <Input
                id="report_number"
                type="number"
                value={formData.report_number}
                onChange={(e) =>
                  setFormData({ ...formData, report_number: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="report_date">Report Date *</Label>
              <Input
                id="report_date"
                type="date"
                value={formData.report_date}
                onChange={(e) =>
                  setFormData({ ...formData, report_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
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
              {loading ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
