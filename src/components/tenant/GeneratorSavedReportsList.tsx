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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GeneratorSavedReportsListProps {
  projectId: string;
}

export function GeneratorSavedReportsList({ projectId }: GeneratorSavedReportsListProps) {
  const queryClient = useQueryClient();
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch saved reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["generator-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
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
  const handlePreview = async (report: any) => {
    setPreviewReport(report);
    setIsLoadingPreview(true);
    setPdfUrl(null);
    
    try {
      // Get public URL for the PDF
      const { data } = supabase.storage
        .from("tenant-tracker-reports")
        .getPublicUrl(report.file_path);

      if (!data.publicUrl) {
        throw new Error("Failed to get PDF URL");
      }

      console.log("PDF URL:", data.publicUrl);
      setPdfUrl(data.publicUrl);
    } catch (error) {
      console.error("Error previewing report:", error);
      toast.error("Failed to load preview. Please try downloading the report instead.");
      setPreviewReport(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPdfUrl(null);
    setPreviewReport(null);
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
                      <p className="font-medium truncate">{report.report_name}</p>
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
      <Dialog open={!!previewReport} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewReport?.report_name}</DialogTitle>
            <DialogDescription>
              Preview of the generated PDF report
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#view=FitH`}
                className="w-full h-full rounded-md border-0"
                title="PDF Preview"
                style={{ minHeight: '600px' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-destructive">Failed to load preview</p>
                <Button
                  onClick={() => previewReport && handleDownload(previewReport.file_path, previewReport.report_name)}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Instead
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
