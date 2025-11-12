import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Zap, FileText, Settings, Download, Sparkles, Wand2 } from "lucide-react";
import { TemplateLibrary } from "@/components/pdf-templates/TemplateLibrary";
import { PDFTemplateDesigner } from "@/components/pdf-templates/PDFTemplateDesigner";
import { SmartTemplateBuilder, TemplateConfig } from "@/components/pdf-templates/SmartTemplateBuilder";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PDFTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [category, setCategory] = useState<"cost_report" | "cable_schedule" | "final_account">("cost_report");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [smartBuilderMode, setSmartBuilderMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch reports based on category
  const { data: reports } = useQuery({
    queryKey: ["reports", category, selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];

      if (category === "cost_report") {
        const { data, error } = await supabase
          .from("cost_reports")
          .select("*")
          .eq("project_id", selectedProjectId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return data;
      } else if (category === "cable_schedule") {
        const { data, error } = await supabase
          .from("cable_schedules")
          .select("*")
          .eq("project_id", selectedProjectId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return data;
      } else if (category === "final_account") {
        const { data, error } = await supabase
          .from("final_accounts")
          .select("*")
          .eq("project_id", selectedProjectId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return data;
      }
      return [];
    },
    enabled: !!selectedProjectId,
  });

  const handleQuickExport = () => {
    if (!selectedReportId) return;

    // Navigate to the report detail page where they can use the existing export button
    if (category === "cost_report") {
      navigate(`/dashboard/cost-reports/${selectedReportId}`);
    } else if (category === "cable_schedule") {
      navigate(`/dashboard/cable-schedules/${selectedReportId}`);
    } else if (category === "final_account") {
      navigate(`/dashboard/final-accounts/${selectedReportId}`);
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case "cost_report": return "Cost Report";
      case "cable_schedule": return "Cable Schedule";
      case "final_account": return "Final Account";
      default: return "";
    }
  };

  const handleSmartGenerate = async (config: TemplateConfig) => {
    if (!selectedReportId || !selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project and report first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { generateSmartTemplatePDF } = await import("@/utils/exportSmartTemplatePDF");
      
      const reportTypeMap: Record<string, "cost-report" | "cable-schedule" | "final-account"> = {
        "cost_report": "cost-report",
        "cable_schedule": "cable-schedule",
        "final_account": "final-account",
      };
      
      const result = await generateSmartTemplatePDF({
        config,
        reportType: reportTypeMap[category],
        reportId: selectedReportId,
        projectId: selectedProjectId,
      });
      
      toast({
        title: "PDF Generated Successfully",
        description: `Your custom template has been created: ${result.fileName}`,
      });
      
      // Open the PDF in a new tab
      window.open(result.url, '_blank');
      
      // Exit smart builder mode
      setSmartBuilderMode(false);
    } catch (error) {
      console.error("Smart template generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF template",
        variant: "destructive",
      });
    }
  };

  if (smartBuilderMode) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSmartBuilderMode(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">Smart Template Builder</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize your PDF template with easy-to-use options
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Smart Mode</Badge>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-6 py-8">
          {selectedProjectId && selectedReportId ? (
            <SmartTemplateBuilder
              category={category}
              projectId={selectedProjectId}
              reportId={selectedReportId}
              onGenerate={handleSmartGenerate}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Please select a project and report first
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setSmartBuilderMode(false)}
                >
                  Go Back
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (advancedMode) {
    return (
      <div className="min-h-screen bg-background">
        <PDFTemplateDesigner
          templateId={selectedTemplateId}
          reportId={selectedReportId}
          category={category}
          projectId={selectedProjectId}
          onBack={() => {
            setAdvancedMode(false);
            setSelectedTemplateId(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">PDF Templates</h1>
                <p className="text-sm text-muted-foreground">
                  Export reports quickly or customize your PDF templates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="cost_report">Cost Reports</TabsTrigger>
            <TabsTrigger value="cable_schedule">Cable Schedules</TabsTrigger>
            <TabsTrigger value="final_account">Final Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value={category} className="mt-8 space-y-6">
            {/* Quick Export Section */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Quick Export</CardTitle>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <CardDescription>
                  Export your {getCategoryLabel().toLowerCase()} with one click using the default template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Project</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Select {getCategoryLabel()}</label>
                    <Select 
                      value={selectedReportId} 
                      onValueChange={setSelectedReportId}
                      disabled={!selectedProjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedProjectId ? "Choose a report" : "Select project first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {reports?.map((report) => (
                          <SelectItem key={report.id} value={report.id}>
                            {report.report_name || report.schedule_name || report.account_name} 
                            {report.report_number && ` (#${report.report_number})`}
                            {report.schedule_number && ` (#${report.schedule_number})`}
                            {report.account_number && ` (#${report.account_number})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full md:w-auto"
                  onClick={handleQuickExport}
                  disabled={!selectedReportId}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {getCategoryLabel()} PDF
                </Button>
              </CardContent>
            </Card>

            <Separator />

            {/* Smart Template Builder Section */}
            <Card className="border-primary/20 bg-gradient-to-br from-accent/5 to-accent/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-accent-foreground" />
                  <CardTitle>Smart Template Builder</CardTitle>
                  <Badge>Easy Customization</Badge>
                </div>
                <CardDescription>
                  Customize which sections to include with simple checkboxes and layout options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  size="lg"
                  variant="default"
                  onClick={() => setSmartBuilderMode(true)}
                  disabled={!selectedProjectId || !selectedReportId}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Build Custom Template
                </Button>
                {(!selectedProjectId || !selectedReportId) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please select a project and report first
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Template Library Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Custom Templates</h2>
                </div>
              </div>
              
              <TemplateLibrary
                category={category}
                projectId={selectedProjectId}
                onSelectTemplate={(templateId) => {
                  setSelectedTemplateId(templateId);
                  setAdvancedMode(true);
                }}
                onCreateNew={() => {
                  setSelectedTemplateId(undefined);
                  setAdvancedMode(true);
                }}
              />
            </div>

            <Separator />

            {/* Advanced Designer Section */}
            <Card className="border-muted">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-muted-foreground">Advanced Designer</CardTitle>
                  <Badge variant="outline">For Power Users</Badge>
                </div>
                <CardDescription>
                  Create pixel-perfect custom templates with full design control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => setAdvancedMode(true)}
                  disabled={!selectedProjectId}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Open Advanced Designer
                </Button>
                {!selectedProjectId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please select a project first
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PDFTemplates;
