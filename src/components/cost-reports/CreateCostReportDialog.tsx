import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    project_number: "",
    project_name: "",
    client_name: "",
    site_handover_date: "",
    practical_completion_date: "",
    electrical_contractor: "",
    earthing_contractor: "",
    standby_plants_contractor: "",
    cctv_contractor: "",
    notes: "",
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
        project_number: formData.project_number,
        project_name: formData.project_name,
        client_name: formData.client_name,
        site_handover_date: formData.site_handover_date || null,
        practical_completion_date: formData.practical_completion_date || null,
        electrical_contractor: formData.electrical_contractor || null,
        earthing_contractor: formData.earthing_contractor || null,
        standby_plants_contractor: formData.standby_plants_contractor || null,
        cctv_contractor: formData.cctv_contractor || null,
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
        project_number: "",
        project_name: "",
        client_name: "",
        site_handover_date: "",
        practical_completion_date: "",
        electrical_contractor: "",
        earthing_contractor: "",
        standby_plants_contractor: "",
        cctv_contractor: "",
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
            <Label htmlFor="project_number">Project Number *</Label>
            <Input
              id="project_number"
              value={formData.project_number}
              onChange={(e) =>
                setFormData({ ...formData, project_number: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) =>
                setFormData({ ...formData, project_name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site_handover_date">Site Handover Date</Label>
              <Input
                id="site_handover_date"
                type="date"
                value={formData.site_handover_date}
                onChange={(e) =>
                  setFormData({ ...formData, site_handover_date: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="practical_completion_date">Practical Completion Date</Label>
              <Input
                id="practical_completion_date"
                type="date"
                value={formData.practical_completion_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    practical_completion_date: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="electrical_contractor">Electrical Contractor</Label>
              <Input
                id="electrical_contractor"
                value={formData.electrical_contractor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    electrical_contractor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="earthing_contractor">Earthing Contractor</Label>
              <Input
                id="earthing_contractor"
                value={formData.earthing_contractor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    earthing_contractor: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="standby_plants_contractor">Standby Plants Contractor</Label>
              <Input
                id="standby_plants_contractor"
                value={formData.standby_plants_contractor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    standby_plants_contractor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="cctv_contractor">CCTV Contractor</Label>
              <Input
                id="cctv_contractor"
                value={formData.cctv_contractor}
                onChange={(e) =>
                  setFormData({ ...formData, cctv_contractor: e.target.value })
                }
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
