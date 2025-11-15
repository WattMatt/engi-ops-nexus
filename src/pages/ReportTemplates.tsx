import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const ReportTemplates = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("cost_report_pdfs")
        .select(`
          *,
          cost_reports!inner (
            report_number,
            project_name,
            client_name,
            project_id,
            projects!inner (
              name,
              project_number
            )
          )
        `)
        .order("generated_at", { ascending: false});

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExportTemplate = async (report: any) => {
    setExporting(report.id);
    try {
      toast.info("Generating template PDF with placeholders...");

      // Fetch company details for cover page
      const { data: companyData, error: companyError } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (companyError) throw companyError;

      // Call edge function to get template-ready data
      const { data, error } = await supabase.functions.invoke("generate-template-pdf", {
        body: {
          reportId: report.cost_report_id,
          projectId: report.cost_reports?.project_id,
        },
      });

      if (error) throw error;

      // Import the export logic dynamically
      const { exportTemplatePDF } = await import("@/utils/templatePDFExport");
      
      // Generate the PDF with placeholder values
      await exportTemplatePDF(data.templateData, companyData);
      
      toast.success("Template PDF generated successfully!");
    } catch (error: any) {
      console.error("Error generating template:", error);
      toast.error(error.message || "Failed to generate template PDF");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Report Templates</h1>
        <p className="text-muted-foreground">
          Generate template versions of existing reports with placeholder values for Word template mapping
        </p>
      </div>

      <Tabs defaultValue="cost-reports" className="w-full">
        <TabsList>
          <TabsTrigger value="cost-reports">Cost Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="cost-reports" className="mt-6">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="grid gap-4">
              {reports.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground">
                    Generate some cost reports first to create templates from them
                  </p>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-lg">{report.file_name}</h3>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium">Project:</span>{" "}
                            {report.cost_reports?.projects?.name || "Unknown"} 
                            ({report.cost_reports?.projects?.project_number || "N/A"})
                          </p>
                          <p>
                            <span className="font-medium">Client:</span>{" "}
                            {report.cost_reports?.client_name || "Unknown"}
                          </p>
                          <p>
                            <span className="font-medium">Report Number:</span>{" "}
                            {report.cost_reports?.report_number || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Generated:</span>{" "}
                            {new Date(report.generated_at).toLocaleString()}
                          </p>
                          {report.revision && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">Rev {report.revision}</Badge>
                            </div>
                          )}
                        </div>

                        {report.notes && (
                          <p className="mt-3 text-sm italic text-muted-foreground">
                            {report.notes}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => handleExportTemplate(report)}
                        disabled={exporting === report.id}
                        className="ml-4"
                      >
                        {exporting === report.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Generate Template
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportTemplates;
