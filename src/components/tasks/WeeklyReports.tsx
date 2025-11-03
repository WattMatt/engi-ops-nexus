import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WeeklyReportsProps {
  projectId: string;
}

export const WeeklyReports = ({ projectId }: WeeklyReportsProps) => {
  const { toast } = useToast();

  const { data: reports, refetch } = useQuery({
    queryKey: ["weekly-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("week_start", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const generateWeeklyReport = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    // Fetch tasks for the week
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (tasksError) {
      toast({
        title: "Error",
        description: tasksError.message,
        variant: "destructive",
      });
      return;
    }

    const completedTasks = tasks?.filter((t) => t.status === "completed") || [];
    const pendingTasks = tasks?.filter((t) => t.status === "pending") || [];
    const inProgressTasks = tasks?.filter((t) => t.status === "in_progress") || [];

    const reportData = {
      totalTasks: tasks?.length || 0,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      completionRate: tasks?.length
        ? ((completedTasks.length / tasks.length) * 100).toFixed(1)
        : 0,
      urgentImportant: tasks?.filter((t) => t.is_urgent && t.is_important).length || 0,
      notUrgentImportant: tasks?.filter((t) => !t.is_urgent && t.is_important).length || 0,
      urgentNotImportant: tasks?.filter((t) => t.is_urgent && !t.is_important).length || 0,
      notUrgentNotImportant:
        tasks?.filter((t) => !t.is_urgent && !t.is_important).length || 0,
    };

    const { error } = await supabase.from("weekly_reports").insert({
      project_id: projectId,
      week_start: format(weekStart, "yyyy-MM-dd"),
      week_end: format(weekEnd, "yyyy-MM-dd"),
      generated_by: userData.user.id,
      report_data: reportData,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Weekly report generated successfully",
      });
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weekly Reports</CardTitle>
            <CardDescription>
              Generate and view weekly task performance reports
            </CardDescription>
          </div>
          <Button onClick={generateWeeklyReport} size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div>
                    <h4 className="font-medium">
                      Week of {format(new Date(report.week_start), "MMM d")} -{" "}
                      {format(new Date(report.week_end), "MMM d, yyyy")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Generated on {format(new Date(report.created_at), "PPP")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">
                        {report.report_data.totalTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {report.report_data.completedTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {report.report_data.inProgressTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">
                        {report.report_data.completionRate}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Eisenhower Matrix Distribution</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-muted-foreground">Do First</p>
                        <p className="font-bold">{report.report_data.urgentImportant}</p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                        <p className="text-muted-foreground">Schedule</p>
                        <p className="font-bold">{report.report_data.notUrgentImportant}</p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <p className="text-muted-foreground">Delegate</p>
                        <p className="font-bold">{report.report_data.urgentNotImportant}</p>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
                        <p className="text-muted-foreground">Eliminate</p>
                        <p className="font-bold">{report.report_data.notUrgentNotImportant}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No reports generated yet. Click "Generate Report" to create your first weekly
            report.
          </p>
        )}
      </CardContent>
    </Card>
  );
};