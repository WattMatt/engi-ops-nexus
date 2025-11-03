import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { LogoUpload } from "@/components/LogoUpload";
import { ProjectMembers } from "@/components/settings/ProjectMembers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    project_number: "",
    name: "",
    description: "",
    status: "active",
    client_name: "",
    site_handover_date: "",
    practical_completion_date: "",
    electrical_contractor: "",
    earthing_contractor: "",
    standby_plants_contractor: "",
    cctv_contractor: "",
    project_logo_url: "",
    client_logo_url: "",
  });

  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = async () => {
    const savedProjectId = localStorage.getItem("selectedProjectId");
    if (!savedProjectId) {
      toast.error("No project selected");
      navigate("/projects");
      return;
    }

    setProjectId(savedProjectId);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", savedProjectId)
      .single();

    if (error) {
      toast.error("Failed to load project data");
      return;
    }

    if (data) {
      setFormData({
        project_number: data.project_number || "",
        name: data.name || "",
        description: data.description || "",
        status: data.status || "active",
        client_name: data.client_name || "",
        site_handover_date: data.site_handover_date || "",
        practical_completion_date: data.practical_completion_date || "",
        electrical_contractor: data.electrical_contractor || "",
        earthing_contractor: data.earthing_contractor || "",
        standby_plants_contractor: data.standby_plants_contractor || "",
        cctv_contractor: data.cctv_contractor || "",
        project_logo_url: data.project_logo_url || "",
        client_logo_url: data.client_logo_url || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

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
        .eq("id", projectId);

      if (error) throw error;

      toast.success("Project updated successfully");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage project details, contractors, and logos
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Project Settings</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Project identification and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="project_number">Project Number</Label>
                  <Input
                    id="project_number"
                    value={formData.project_number}
                    onChange={(e) => updateField("project_number", e.target.value)}
                    placeholder="WM-2024-001"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => updateField("client_name", e.target.value)}
                    placeholder="Moolman Group"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateField("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Project Dates</CardTitle>
                <CardDescription>Key project milestones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="site_handover_date">Site Handover</Label>
                    <Input
                      id="site_handover_date"
                      type="date"
                      value={formData.site_handover_date}
                      onChange={(e) => updateField("site_handover_date", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="practical_completion_date">Practical Completion</Label>
                    <Input
                      id="practical_completion_date"
                      type="date"
                      value={formData.practical_completion_date}
                      onChange={(e) => updateField("practical_completion_date", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contractors */}
            <Card>
              <CardHeader>
                <CardTitle>Contractors</CardTitle>
                <CardDescription>Assigned contractors for different disciplines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="electrical_contractor">Electrical</Label>
                    <Input
                      id="electrical_contractor"
                      value={formData.electrical_contractor}
                      onChange={(e) => updateField("electrical_contractor", e.target.value)}
                      placeholder="KHULU"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="earthing_contractor">Earthing & Lightning</Label>
                    <Input
                      id="earthing_contractor"
                      value={formData.earthing_contractor}
                      onChange={(e) => updateField("earthing_contractor", e.target.value)}
                      placeholder="MITRONIC"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="standby_plants_contractor">Standby Plants</Label>
                    <Input
                      id="standby_plants_contractor"
                      value={formData.standby_plants_contractor}
                      onChange={(e) => updateField("standby_plants_contractor", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cctv_contractor">CCTV & Access</Label>
                    <Input
                      id="cctv_contractor"
                      value={formData.cctv_contractor}
                      onChange={(e) => updateField("cctv_contractor", e.target.value)}
                      placeholder="East End"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logos */}
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Upload project and client logos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LogoUpload
                  currentUrl={formData.project_logo_url}
                  onUrlChange={(url) => updateField("project_logo_url", url)}
                  label="Project Logo"
                  id="project_logo"
                />

                <LogoUpload
                  currentUrl={formData.client_logo_url}
                  onUrlChange={(url) => updateField("client_logo_url", url)}
                  label="Client Logo"
                  id="client_logo"
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="members">
          {projectId && <ProjectMembers projectId={projectId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
