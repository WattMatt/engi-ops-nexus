import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { LogoUpload } from "./LogoUpload";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  client_name?: string | null;
  site_handover_date?: string | null;
  practical_completion_date?: string | null;
  electrical_contractor?: string | null;
  earthing_contractor?: string | null;
  standby_plants_contractor?: string | null;
  cctv_contractor?: string | null;
  project_logo_url?: string | null;
  client_logo_url?: string | null;
}

interface EditProjectDialogProps {
  project: Project;
  onProjectUpdated: () => void;
}

export const EditProjectDialog = ({ project, onProjectUpdated }: EditProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_number: project.project_number,
    name: project.name,
    description: project.description || "",
    status: project.status,
    client_name: project.client_name || "",
    site_handover_date: project.site_handover_date || "",
    practical_completion_date: project.practical_completion_date || "",
    electrical_contractor: project.electrical_contractor || "",
    earthing_contractor: project.earthing_contractor || "",
    standby_plants_contractor: project.standby_plants_contractor || "",
    cctv_contractor: project.cctv_contractor || "",
    project_logo_url: project.project_logo_url || "",
    client_logo_url: project.client_logo_url || "",
  });

  // Sync form data when dialog opens or project changes
  useEffect(() => {
    if (open) {
      setFormData({
        project_number: project.project_number,
        name: project.name,
        description: project.description || "",
        status: project.status,
        client_name: project.client_name || "",
        site_handover_date: project.site_handover_date || "",
        practical_completion_date: project.practical_completion_date || "",
        electrical_contractor: project.electrical_contractor || "",
        earthing_contractor: project.earthing_contractor || "",
        standby_plants_contractor: project.standby_plants_contractor || "",
        cctv_contractor: project.cctv_contractor || "",
        project_logo_url: project.project_logo_url || "",
        client_logo_url: project.client_logo_url || "",
      });
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          project_number: formData.project_number,
          name: formData.name,
          description: formData.description || null,
          status: formData.status,
          client_name: formData.client_name || null,
          site_handover_date: formData.site_handover_date || null,
          practical_completion_date: formData.practical_completion_date || null,
          electrical_contractor: formData.electrical_contractor || null,
          earthing_contractor: formData.earthing_contractor || null,
          standby_plants_contractor: formData.standby_plants_contractor || null,
          cctv_contractor: formData.cctv_contractor || null,
          project_logo_url: formData.project_logo_url || null,
          client_logo_url: formData.client_logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      if (error) throw error;

      toast.success("Project updated successfully");
      setOpen(false);
      onProjectUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details, contractors, and logos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project_number">Project Number</Label>
                <Input
                  id="project_number"
                  value={formData.project_number}
                  onChange={(e) =>
                    setFormData({ ...formData, project_number: e.target.value })
                  }
                  placeholder="WM-2024-001"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder="Moolman Group"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="site_handover_date">Site Handover</Label>
                  <Input
                    id="site_handover_date"
                    type="date"
                    value={formData.site_handover_date}
                    onChange={(e) =>
                      setFormData({ ...formData, site_handover_date: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="practical_completion_date">Practical Completion</Label>
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

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm">Contractors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="electrical_contractor">Electrical</Label>
                    <Input
                      id="electrical_contractor"
                      value={formData.electrical_contractor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          electrical_contractor: e.target.value,
                        })
                      }
                      placeholder="KHULU"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="earthing_contractor">Earthing & Lightning</Label>
                    <Input
                      id="earthing_contractor"
                      value={formData.earthing_contractor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          earthing_contractor: e.target.value,
                        })
                      }
                      placeholder="MITRONIC"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="standby_plants_contractor">Standby Plants</Label>
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

                  <div className="grid gap-2">
                    <Label htmlFor="cctv_contractor">CCTV & Access</Label>
                    <Input
                      id="cctv_contractor"
                      value={formData.cctv_contractor}
                      onChange={(e) =>
                        setFormData({ ...formData, cctv_contractor: e.target.value })
                      }
                      placeholder="East End"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium text-sm">Logos</h3>
                <div className="grid gap-6">
                  <LogoUpload
                    currentUrl={formData.project_logo_url}
                    onUrlChange={(url) => setFormData(prev => ({ ...prev, project_logo_url: url }))}
                    label="Project Logo"
                    id="project_logo"
                  />
                  
                  <LogoUpload
                    currentUrl={formData.client_logo_url}
                    onUrlChange={(url) => setFormData(prev => ({ ...prev, client_logo_url: url }))}
                    label="Client Logo"
                    id="client_logo"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
