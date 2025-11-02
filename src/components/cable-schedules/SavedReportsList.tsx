import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface SavedReportsListProps {
  scheduleId: string;
}

export const SavedReportsList = ({ scheduleId }: SavedReportsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["cable-schedule-reports", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedule_reports")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (report: any) => {
    setDownloading(report.id);
    try {
      const { data, error } = await supabase.storage
        .from("cable-schedule-reports")
        .download(report.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.report_name}_${report.revision}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

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
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const report = reports?.find((r) => r.id === deleteId);
      if (!report) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("cable-schedule-reports")
        .remove([report.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("cable_schedule_reports")
        .delete()
        .eq("id", deleteId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Report deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["cable-schedule-reports", scheduleId] });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (isLoading) {
    return <div>Loading saved reports...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Saved Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No saved reports yet. Generate a PDF to save it here.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>File Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.report_name}</TableCell>
                      <TableCell>{report.revision}</TableCell>
                      <TableCell>
                        {new Date(report.generated_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {report.file_size ? formatFileSize(report.file_size) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(report)}
                            disabled={downloading === report.id}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteId(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
