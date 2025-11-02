import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface SavedReportsListProps {
  projectId: string;
}

export const SavedReportsList = ({ projectId }: SavedReportsListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['tenant-tracker-reports', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_tracker_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('revision_number', { ascending: false })
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId
  });

  const handleDownload = async (report: any) => {
    setDownloadingId(report.id);
    try {
      const { data, error } = await supabase.storage
        .from('tenant-tracker-reports')
        .download(report.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.report_name;
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

  const handleDelete = async (report: any) => {
    if (!confirm(`Are you sure you want to delete "${report.report_name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(report.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tenant-tracker-reports')
        .remove([report.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue even if storage delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('tenant_tracker_reports')
        .delete()
        .eq('id', report.id);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['tenant-tracker-reports', projectId] });
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Saved Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-1">Generate a report to see it here</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revision</TableHead>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Tenants</TableHead>
                  <TableHead className="text-right">Total Area</TableHead>
                  <TableHead className="text-right">File Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        Rev.{report.revision_number}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{report.report_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.generated_at)}
                    </TableCell>
                    <TableCell className="text-right">{report.tenant_count || '-'}</TableCell>
                    <TableCell className="text-right">
                      {report.total_area ? `${Number(report.total_area).toFixed(2)} m²` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatFileSize(report.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(report)}
                          disabled={downloadingId === report.id}
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.id}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
