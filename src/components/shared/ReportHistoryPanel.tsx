/**
 * Reusable Report History Panel
 * Used across Final Account, Specification, Handover, Project Outline, and Site Diary modules.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportHistoryPanelProps {
  /** DB table name, e.g. "final_account_reports" */
  dbTable: string;
  /** Foreign key column name, e.g. "final_account_id" */
  foreignKeyColumn: string;
  /** Foreign key value (UUID) */
  foreignKeyValue: string;
  /** Storage bucket name, e.g. "final-account-reports" */
  storageBucket: string;
  /** Title shown in the card header */
  title?: string;
  /** React Query cache key prefix */
  queryKeyPrefix?: string;
}

export const ReportHistoryPanel = ({
  dbTable,
  foreignKeyColumn,
  foreignKeyValue,
  storageBucket,
  title = "Report History",
  queryKeyPrefix,
}: ReportHistoryPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cacheKey = queryKeyPrefix || `${dbTable}-history`;
  const [previewingReport, setPreviewingReport] = useState<any>(null);
  const [deletingReport, setDeletingReport] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: [cacheKey, foreignKeyValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(dbTable as any)
        .select("*")
        .eq(foreignKeyColumn, foreignKeyValue)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleDownload = async (report: any) => {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.report_name || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Report downloaded successfully" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Error", description: "Failed to download report", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (report: any) => {
      const { error: storageError } = await supabase.storage
        .from(storageBucket)
        .remove([report.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from(dbTable as any)
        .delete()
        .eq("id", report.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cacheKey, foreignKeyValue] });
      toast({ title: "Success", description: "Report deleted successfully" });
      setDeletingReport(null);
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete report", variant: "destructive" });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-2">Generate your first PDF report to see it here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {report.report_name || "-"}
                  </TableCell>
                  <TableCell>{report.revision}</TableCell>
                  <TableCell>{formatDate(report.generated_at || report.created_at)}</TableCell>
                  <TableCell>{formatFileSize(report.file_size)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewingReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                      >
                        {downloadingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingReport(report)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {previewingReport && (
        <StandardReportPreview
          report={previewingReport}
          open={!!previewingReport}
          onOpenChange={(open) => !open && setPreviewingReport(null)}
          storageBucket={storageBucket}
        />
      )}

      <AlertDialog open={!!deletingReport} onOpenChange={() => setDeletingReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete revision {deletingReport?.revision}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReport && deleteMutation.mutate(deletingReport)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
