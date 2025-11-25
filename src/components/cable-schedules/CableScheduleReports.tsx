import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CableScheduleExportPDFButton } from "./CableScheduleExportPDFButton";

interface CableScheduleReportsProps {
  schedule: any;
}

export const CableScheduleReports = ({ schedule }: CableScheduleReportsProps) => {
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["cable-schedule-reports", schedule.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedule_reports")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleDownload = async (report: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("cable-schedule-reports")
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.report_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Generate New Report Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Export a comprehensive cable schedule PDF including optimization recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CableScheduleExportPDFButton schedule={schedule} />
        </CardContent>
      </Card>

      {/* Previously Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>
            Previously generated cable schedule reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{report.report_name}</h4>
                      <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(report.generated_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        {report.file_size && (
                          <span>{formatFileSize(report.file_size)}</span>
                        )}
                        <span className="font-medium">Rev {report.revision}</span>
                      </div>
                      {report.notes && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {report.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report)}
                    className="ml-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm mt-1">Generate your first report using the button above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
