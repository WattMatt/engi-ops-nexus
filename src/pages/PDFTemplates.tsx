import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PDFTemplateDesigner } from "@/components/pdf-templates/PDFTemplateDesigner";
import { TemplateLibrary } from "@/components/pdf-templates/TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PDFTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [isDesigning, setIsDesigning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("cost_report");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Fetch reports when project or category changes
  useEffect(() => {
    if (!selectedProjectId) {
      setAvailableReports([]);
      setSelectedReportId("");
      return;
    }

    const fetchReports = async () => {
      setLoadingReports(true);
      try {
        let reports: any[] = [];

        if (selectedCategory === "cost_report") {
          const { data, error } = await supabase
            .from("cost_reports")
            .select("id, report_number, project_name")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          reports = (data || []).map(r => ({ 
            id: r.id, 
            name: r.report_number || r.project_name || `Report ${r.id.slice(0, 8)}` 
          }));
        } else if (selectedCategory === "cable_schedule") {
          const { data, error } = await supabase
            .from("cable_schedules")
            .select("id, schedule_name")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          reports = (data || []).map(r => ({ 
            id: r.id, 
            name: r.schedule_name || `Schedule ${r.id.slice(0, 8)}` 
          }));
        } else if (selectedCategory === "final_account") {
          const { data, error } = await supabase
            .from("final_accounts")
            .select("id, account_name")
            .eq("project_id", selectedProjectId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          reports = (data || []).map(r => ({ 
            id: r.id, 
            name: r.account_name || `Account ${r.id.slice(0, 8)}` 
          }));
        }
        // tenant_report and bulk_services don't have main report tables,
        // so we'll need to handle those differently or skip for now

        setAvailableReports(reports);
        
        // Auto-select first report if available
        if (reports.length > 0 && !selectedReportId) {
          setSelectedReportId(reports[0].id);
        } else if (reports.length === 0) {
          setSelectedReportId("");
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive",
        });
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, [selectedProjectId, selectedCategory, toast]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDesigning(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplateId(undefined);
    setIsDesigning(true);
  };

  const handleSave = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDesigning(false);
  };

  const handleBackToLibrary = () => {
    setIsDesigning(false);
    setSelectedTemplateId(undefined);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-4">
          {isDesigning && (
            <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">PDF Templates</h1>
            <p className="text-sm text-muted-foreground">
              Design custom PDF layouts with drag-and-drop editing
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isDesigning ? (
          selectedProjectId ? (
            <div className="flex flex-col h-full">
              <div className="border-b bg-background p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="report-select">Select Report to Capture Components</Label>
                    <Select value={selectedReportId} onValueChange={setSelectedReportId} disabled={loadingReports}>
                      <SelectTrigger id="report-select" className="w-full max-w-md">
                        <SelectValue placeholder="Select a report..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReports.map((report) => (
                          <SelectItem key={report.id} value={report.id}>
                            {report.name || report.report_number || `Report ${report.id.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <PDFTemplateDesigner
                  templateId={selectedTemplateId}
                  category={selectedCategory}
                  projectId={selectedProjectId}
                  reportId={selectedReportId || undefined}
                  onSave={handleSave}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Please select a project first</p>
            </div>
          )
        ) : (
          <div className="container mx-auto p-6 space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>How field mapping works:</strong> Field names in your template automatically fill with report data. 
                For example, <code className="bg-muted px-1 py-0.5 rounded text-xs">report_name</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">project_number</code>, 
                and <code className="bg-muted px-1 py-0.5 rounded text-xs">category_1_budget</code> will auto-populate when you export. 
                Use the starter template to see available fields.
              </AlertDescription>
            </Alert>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList>
                <TabsTrigger value="cost_report">Cost Reports</TabsTrigger>
                <TabsTrigger value="tenant_report">Tenant Reports</TabsTrigger>
                <TabsTrigger value="cable_schedule">Cable Schedules</TabsTrigger>
                <TabsTrigger value="final_account">Final Accounts</TabsTrigger>
                <TabsTrigger value="bulk_services">Bulk Services</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-6">
                <TemplateLibrary
                  projectId={selectedProjectId}
                  category={selectedCategory}
                  onSelectTemplate={handleSelectTemplate}
                  onCreateNew={handleCreateNew}
                  onProjectChange={setSelectedProjectId}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
