import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LegendCardReportHistoryProps {
  cardId: string;
  cardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegendCardReportHistory({ cardId, cardName, open, onOpenChange }: LegendCardReportHistoryProps) {
  const queryClient = useQueryClient();
  const [previewingReport, setPreviewingReport] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["legend-card-reports", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legend_card_reports" as any)
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleDownload = async (report: any) => {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from("legend-card-reports")
        .download(report.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cardName}_${report.revision}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err: any) {
      toast.error("Download failed: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (report: any) => {
    try {
      await supabase.storage.from("legend-card-reports").remove([report.file_path]);
      const { error } = await supabase
        .from("legend_card_reports" as any)
        .delete()
        .eq("id", report.id);
      if (error) throw error;
      toast.success("Report deleted");
      queryClient.invalidateQueries({ queryKey: ["legend-card-reports", cardId] });
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>PDF History — {cardName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reports generated yet. Generate a PDF to see history.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revision</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.revision}</TableCell>
                      <TableCell>{format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>{report.file_size ? `${Math.round(report.file_size / 1024)} KB` : "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{report.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setPreviewingReport(report)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(report)} disabled={downloadingId === report.id} title="Download">
                            {downloadingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingId(report.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        <StandardReportPreview
          report={previewingReport}
          open={!!previewingReport}
          onOpenChange={(open) => !open && setPreviewingReport(null)}
          storageBucket="legend-card-reports"
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const r = reports.find((r: any) => r.id === deletingId);
                if (r) handleDelete(r);
              }}
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
