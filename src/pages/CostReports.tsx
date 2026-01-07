import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Calendar } from "lucide-react";
import { CreateCostReportDialog } from "@/components/cost-reports/CreateCostReportDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostReportOverview } from "@/components/cost-reports/CostReportOverview";

const CostReports = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: reports = [], refetch } = useQuery({
    queryKey: ["cost-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get the latest report for the overview
  const latestReport = reports[0];

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Cost Reports
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage project cost reports and track financial progress
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Cost Report
          </Button>
        </div>

      {reports.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">No cost reports yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Create your first cost report to track project finances and monitor budget performance
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Cost Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Project Overview</TabsTrigger>
            <TabsTrigger value="reports">All Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {latestReport && <CostReportOverview report={latestReport} />}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50"
                  onClick={() => navigate(`/dashboard/cost-reports/${report.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">
                      Cost Report #{report.report_number}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xl font-bold text-foreground">{report.project_name}</div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(report.report_date), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Client: {report.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Project: {report.project_number}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <CreateCostReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId!}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />
      </div>
    </div>
  );
};

export default CostReports;
