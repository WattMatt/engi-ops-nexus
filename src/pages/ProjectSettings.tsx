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
import { ArrowLeft, Save, Info, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogoUpload } from "@/components/LogoUpload";
import { DropboxFolderPicker } from "@/components/storage/DropboxFolderPicker";
import { ProjectMembers } from "@/components/settings/ProjectMembers";
import { ProjectContacts } from "@/components/settings/ProjectContacts";
import { GlobalContactsManager } from "@/components/settings/GlobalContactsManager";
import { ClientPortalManagement } from "@/components/client-portal/ClientPortalManagement";
import { ContractorPortalSettings } from "@/components/project-settings/ContractorPortalSettings";

import { ReportAutomationHub } from "@/components/project-settings/report-automation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function ProjectSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
    primary_voltage: "",
    connection_size: "",
    supply_authority: "",
    electrical_standard: "SANS 10142-1",
    diversity_factor: "",
    load_category: "",
    building_calculation_type: "commercial",
    tariff_structure: "",
    metering_requirements: "",
    protection_philosophy: "",
    completion_notification_email: "",
    dropbox_folder_path: "",
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
        primary_voltage: data.primary_voltage || "",
        connection_size: data.connection_size || "",
        supply_authority: data.supply_authority || "",
        electrical_standard: data.electrical_standard || "SANS 10142-1",
        diversity_factor: data.diversity_factor?.toString() || "",
        load_category: data.load_category || "",
        building_calculation_type: data.building_calculation_type || "commercial",
        tariff_structure: data.tariff_structure || "",
        metering_requirements: data.metering_requirements || "",
        protection_philosophy: data.protection_philosophy || "",
        completion_notification_email: data.completion_notification_email || "",
        dropbox_folder_path: data.dropbox_folder_path || "",
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
          primary_voltage: formData.primary_voltage || null,
          connection_size: formData.connection_size || null,
          supply_authority: formData.supply_authority || null,
          electrical_standard: formData.electrical_standard || null,
          diversity_factor: formData.diversity_factor ? parseFloat(formData.diversity_factor) : null,
          load_category: formData.load_category || null,
          building_calculation_type: formData.building_calculation_type || null,
          tariff_structure: formData.tariff_structure || null,
          metering_requirements: formData.metering_requirements || null,
          protection_philosophy: formData.protection_philosophy || null,
          completion_notification_email: formData.completion_notification_email || null,
          dropbox_folder_path: formData.dropbox_folder_path || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) throw error;

      // Dispatch event to notify ProjectDropdown to refresh
      window.dispatchEvent(new Event('projectUpdated'));
      
      toast.success("Project updated successfully");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPlaceholder = (placeholder: string, fieldName: string) => {
    navigator.clipboard.writeText(`{${placeholder}}`);
    setCopiedField(fieldName);
    toast.success("Placeholder copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <TooltipProvider>
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
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full h-auto gap-1">
            <TabsTrigger value="settings" className="shrink-0">Project Settings</TabsTrigger>
            <TabsTrigger value="contacts" className="shrink-0">Project Contacts</TabsTrigger>
            <TabsTrigger value="global-contacts" className="shrink-0">Contacts Library</TabsTrigger>
            <TabsTrigger value="members" className="shrink-0">Team Members</TabsTrigger>
            <TabsTrigger value="client-portal" className="shrink-0">Client Portal</TabsTrigger>
            <TabsTrigger value="contractor-portal" className="shrink-0">Contractor Portal</TabsTrigger>
            <TabsTrigger value="report-automation" className="shrink-0">Report Automation</TabsTrigger>
          </TabsList>
        </div>

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
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure project notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="completion_notification_email">
                    Roadmap Completion Notification Email
                  </Label>
                  <Input
                    id="completion_notification_email"
                    type="email"
                    placeholder="arno@wmeng.co.za"
                    value={formData.completion_notification_email}
                    onChange={(e) => updateField("completion_notification_email", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address to receive notifications when roadmap items are completed. 
                    If empty, defaults to arno@wmeng.co.za.
                  </p>
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
                    <Label htmlFor="site_handover_date" className="flex items-center gap-2">
                      Site Handover
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("Site_Handover_Date", "site_handover_date")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{Site_Handover_Date}`}</p>
                            {copiedField === "site_handover_date" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="site_handover_date"
                      type="date"
                      value={formData.site_handover_date}
                      onChange={(e) => updateField("site_handover_date", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="practical_completion_date" className="flex items-center gap-2">
                      Practical Completion
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("Practical_Completion_Date", "practical_completion_date")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{Practical_Completion_Date}`}</p>
                            {copiedField === "practical_completion_date" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
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

            {/* Electrical Baseline */}
            <Card>
              <CardHeader>
                <CardTitle>Electrical Baseline</CardTitle>
                <CardDescription>Foundational electrical information for project documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="primary_voltage">Primary Voltage</Label>
                    <Input
                      id="primary_voltage"
                      value={formData.primary_voltage}
                      onChange={(e) => updateField("primary_voltage", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="connection_size">Connection Size</Label>
                    <Input
                      id="connection_size"
                      value={formData.connection_size}
                      onChange={(e) => updateField("connection_size", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="supply_authority">Supply Authority</Label>
                    <Select
                      value={formData.supply_authority}
                      onValueChange={(value) => updateField("supply_authority", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Eskom">Eskom</SelectItem>
                        <SelectItem value="City Power">City Power</SelectItem>
                        <SelectItem value="City of Johannesburg">City of Johannesburg</SelectItem>
                        <SelectItem value="City of Tshwane">City of Tshwane</SelectItem>
                        <SelectItem value="City of Ekurhuleni">City of Ekurhuleni</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="electrical_standard">Electrical Standard</Label>
                    <Select
                      value={formData.electrical_standard}
                      onValueChange={(value) => updateField("electrical_standard", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SANS 10142-1">SANS 10142-1</SelectItem>
                        <SelectItem value="SANS 10400-XA">SANS 10400-XA</SelectItem>
                        <SelectItem value="IEC 60364">IEC 60364</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="diversity_factor">Diversity Factor</Label>
                    <Input
                      id="diversity_factor"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.diversity_factor}
                      onChange={(e) => updateField("diversity_factor", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="load_category">Load Category</Label>
                    <Select
                      value={formData.load_category}
                      onValueChange={(value) => updateField("load_category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Industrial">Industrial</SelectItem>
                        <SelectItem value="Residential">Residential</SelectItem>
                        <SelectItem value="Mixed-Use">Mixed-Use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="building_calculation_type">Building Calculation Method</Label>
                    <Select
                      value={formData.building_calculation_type}
                      onValueChange={(value) => updateField("building_calculation_type", value)}
                    >
                      <SelectTrigger id="building_calculation_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="commercial">Commercial/Retail (SANS 204)</SelectItem>
                        <SelectItem value="sans10142">General Buildings (SANS 10142-1)</SelectItem>
                        <SelectItem value="residential">Residential Units (ADMD Method)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.building_calculation_type === "commercial" 
                        ? "Uses SANS 204 energy demand standards (VA/m²) by climatic zone for commercial and retail buildings"
                        : formData.building_calculation_type === "sans10142"
                          ? "Uses SANS 10142-1 socket outlet and lighting load tables (VA/m²) for general building types"
                          : "Uses SANS 10142 fitting-based calculations with ADMD diversity factors for residential developments"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tariff_structure">Tariff Structure</Label>
                  <Select
                    value={formData.tariff_structure}
                    onValueChange={(value) => updateField("tariff_structure", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Megaflex">Megaflex</SelectItem>
                      <SelectItem value="Nightsave">Nightsave</SelectItem>
                      <SelectItem value="TOU">Time of Use (TOU)</SelectItem>
                      <SelectItem value="Ruraflex">Ruraflex</SelectItem>
                      <SelectItem value="Miniflex">Miniflex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="metering_requirements">Metering Requirements</Label>
                  <Textarea
                    id="metering_requirements"
                    value={formData.metering_requirements}
                    onChange={(e) => updateField("metering_requirements", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="protection_philosophy">Protection Philosophy</Label>
                  <Textarea
                    id="protection_philosophy"
                    value={formData.protection_philosophy}
                    onChange={(e) => updateField("protection_philosophy", e.target.value)}
                    rows={3}
                  />
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
                    <Label htmlFor="electrical_contractor" className="flex items-center gap-2">
                      Electrical
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("Electrical_Contractor", "electrical_contractor")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{Electrical_Contractor}`}</p>
                            {copiedField === "electrical_contractor" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="electrical_contractor"
                      value={formData.electrical_contractor}
                      onChange={(e) => updateField("electrical_contractor", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="earthing_contractor" className="flex items-center gap-2">
                      Earthing & Lightning
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("Earthing_Contractor", "earthing_contractor")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{Earthing_Contractor}`}</p>
                            {copiedField === "earthing_contractor" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="earthing_contractor"
                      value={formData.earthing_contractor}
                      onChange={(e) => updateField("earthing_contractor", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="standby_plants_contractor" className="flex items-center gap-2">
                      Standby Plants
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("Standby_Plants_Contractor", "standby_plants_contractor")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{Standby_Plants_Contractor}`}</p>
                            {copiedField === "standby_plants_contractor" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="standby_plants_contractor"
                      value={formData.standby_plants_contractor}
                      onChange={(e) => updateField("standby_plants_contractor", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cctv_contractor" className="flex items-center gap-2">
                      CCTV & Access
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <button
                            onClick={() => handleCopyPlaceholder("CCTV_Contractor", "cctv_contractor")}
                            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                          >
                            <p className="font-mono text-xs">{`{CCTV_Contractor}`}</p>
                            {copiedField === "cctv_contractor" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="cctv_contractor"
                      value={formData.cctv_contractor}
                      onChange={(e) => updateField("cctv_contractor", e.target.value)}
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

            {/* Cloud Storage Integration */}
            <DropboxFolderPicker
              value={formData.dropbox_folder_path || null}
              onChange={(path) => updateField("dropbox_folder_path", path || "")}
              projectName={formData.name}
            />

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

        <TabsContent value="contacts">
          {projectId && <ProjectContacts projectId={projectId} />}
        </TabsContent>

        <TabsContent value="global-contacts">
          <GlobalContactsManager />
        </TabsContent>

        <TabsContent value="members">
          {projectId && <ProjectMembers projectId={projectId} />}
        </TabsContent>

        <TabsContent value="client-portal">
          {projectId && <ClientPortalManagement projectId={projectId} />}
        </TabsContent>

        <TabsContent value="contractor-portal">
          {projectId && <ContractorPortalSettings projectId={projectId} />}
        </TabsContent>


        <TabsContent value="report-automation">
          {projectId && <ReportAutomationHub projectId={projectId} />}
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
