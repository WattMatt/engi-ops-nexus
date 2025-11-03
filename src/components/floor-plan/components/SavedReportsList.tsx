import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ReportPreviewDialog } from "./ReportPreviewDialog";

interface FloorPlanReport {
  id: string;
  project_name: string;
  file_path: string;
  report_revision: number;
  created_at: string;
  comments: string | null;
}

interface SavedReportsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SavedReportsList = ({ open, onOpenChange }: SavedReportsListProps) => {
  const [previewingReport, setPreviewingReport] = useState<FloorPlanReport | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['floor-plan-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floor_plan_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FloorPlanReport[];
    },
    enabled: open,
  });

  const handleDownload = async (report: FloorPlanReport) => {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('floor-plan-reports')
        .download(report.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.project_name}_Rev${report.report_revision}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (report: FloorPlanReport) => {
    if (!window.confirm(`Delete "${report.project_name} Rev${report.report_revision}"?`)) return;

    setDeletingId(report.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('floor-plan-reports')
        .remove([report.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('floor_plan_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) throw dbError;

      toast.success('Report deleted successfully');
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Saved Floor Plan Reports</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !reports || reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved reports yet. Export a PDF to see it here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.project_name}</TableCell>
                      <TableCell>Rev {report.report_revision}</TableCell>
                      <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{report.comments || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewingReport(report)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === report.id}
                            title="Download"
                          >
                            {downloadingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(report)}
                            disabled={deletingId === report.id}
                            title="Delete"
                          >
                            {deletingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {previewingReport && (
        <ReportPreviewDialog
          report={previewingReport}
          open={!!previewingReport}
          onOpenChange={(open) => !open && setPreviewingReport(null)}
        />
      )}
    </>
  );
};
