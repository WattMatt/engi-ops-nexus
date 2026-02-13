import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CostReportOverview } from "@/components/cost-reports/CostReportOverview";
import { CostCategoriesManager } from "@/components/cost-reports/CostCategoriesManager";
import { CostVariationsManager } from "@/components/cost-reports/CostVariationsManager";
import { ReportDetailsManager } from "@/components/cost-reports/ReportDetailsManager";
import { ExportPDFButton } from "@/components/cost-reports/ExportPDFButton";
import { CompareReportsDialog } from "@/components/cost-reports/CompareReportsDialog";
import { ImportExcelDialog } from "@/components/cost-reports/ImportExcelDialog";
import { CostReportHistory } from "@/components/cost-reports/CostReportHistory";
import { SvgPdfTestButton } from "@/components/cost-reports/SvgPdfTestButton";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const CostReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [historyKey, setHistoryKey] = useState(0);
  const [activeTab, setActiveTab] = useState("");
  const [useSvgEngine, setUseSvgEngine] = useState(false);

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["cost-report", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <div className="flex-1 px-6 pt-6 pb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 px-6 pt-6 pb-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Cost report not found</p>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/cost-reports")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cost Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/cost-reports")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Cost Report #{report.report_number}
            </h2>
            <p className="text-muted-foreground">{report.project_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ImportExcelDialog reportId={report.id} onSuccess={refetch} />
          <CompareReportsDialog
            currentReportId={report.id}
            projectId={report.project_id}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="details">Report Details</TabsTrigger>
          <TabsTrigger value="categories">Categories & Line Items</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
        </TabsList>

        {/* Overview is the landing page - visible by default */}
        <div className={activeTab ? "hidden" : ""}>
          <CostReportOverview report={report} />
        </div>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Generate PDF Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Export your cost report as a professional PDF document
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="svg-engine-toggle" className="text-sm text-muted-foreground">
                    Standard
                  </Label>
                  <Switch
                    id="svg-engine-toggle"
                    checked={useSvgEngine}
                    onCheckedChange={setUseSvgEngine}
                  />
                  <Label htmlFor="svg-engine-toggle" className="text-sm text-muted-foreground flex items-center gap-1">
                    SVG Engine
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Beta</Badge>
                  </Label>
                </div>
              </div>

              {useSvgEngine ? (
                <SvgPdfTestButton report={report} />
              ) : (
                <ExportPDFButton 
                  report={report} 
                  onReportGenerated={() => setHistoryKey(prev => prev + 1)}
                />
              )}
            </CardContent>
          </Card>
          <CostReportHistory key={historyKey} reportId={report.id} />
        </TabsContent>

        <TabsContent value="details">
          <ReportDetailsManager report={report} />
        </TabsContent>

        <TabsContent value="categories">
          <CostCategoriesManager reportId={report.id} projectId={report.project_id} />
        </TabsContent>

        <TabsContent value="variations">
          <CostVariationsManager reportId={report.id} projectId={report.project_id} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default CostReportDetail;
