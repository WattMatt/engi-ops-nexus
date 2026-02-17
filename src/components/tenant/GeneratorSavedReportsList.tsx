import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";

interface GeneratorSavedReportsListProps {
  projectId: string;
}

export function GeneratorSavedReportsList({ projectId }: GeneratorSavedReportsListProps) {
  const queryClient = useQueryClient();
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<any>(null);

  // Fetch saved reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["generator-reports", projectId],
    queryFn: async () => {
      console.log("[GeneratorSavedReportsList] Fetching reports for projectId:", projectId);
      const { data, error } = await supabase
        .from("generator_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false });

      if (error) {
        console.error("[GeneratorSavedReportsList] Query error:", error);
        throw error;
      }
      console.log("[GeneratorSavedReportsList] Reports fetched:", data?.length, data);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Download report
  const handleDownload = async (filePath: string, reportName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("tenant-tracker-reports")
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  // Preview report
  const handlePreview = (report: any) => {
    setPreviewReport(report);
  };

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const report = reports.find(r => r.id === reportId);
      if (!report) throw new Error("Report not found");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("tenant-tracker-reports")
        .remove([report.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("generator_reports")
        .delete()
        .eq("id", reportId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generator-reports"] });
      toast.success("Report deleted successfully");
      setDeleteReportId(null);
    },
    onError: (error) => {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>Loading saved generator reports...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>
            View, download, or delete previously generated generator reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No saved reports yet</p>
              <p className="text-sm">Generate a report to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{report.report_name}</p>
                        {report.revision && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary/10 text-primary">
                            {report.revision}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{format(new Date(report.generated_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        {report.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(report.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(report)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report.file_path, report.report_name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteReportId(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewReport && (
        <StandardReportPreview
          report={previewReport}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="tenant-tracker-reports"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReportId} onOpenChange={() => setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReportId && deleteMutation.mutate(deleteReportId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
