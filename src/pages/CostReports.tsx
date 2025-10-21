import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Calendar } from "lucide-react";
import { CreateCostReportDialog } from "@/components/cost-reports/CreateCostReportDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const CostReports = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cost Reports</h2>
          <p className="text-muted-foreground">
            Manage project cost reports and track financial progress
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cost Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/dashboard/cost-reports/${report.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cost Report #{report.report_number}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.project_name}</div>
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
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

      {reports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No cost reports yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first cost report to track project finances
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Cost Report
            </Button>
          </CardContent>
        </Card>
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
  );
};

export default CostReports;
