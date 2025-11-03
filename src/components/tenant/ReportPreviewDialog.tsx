import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportPreviewDialogProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportPreviewDialog = ({ report, open, onOpenChange }: ReportPreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && report) {
      loadPdfUrl();
    }
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, report]);

  const loadPdfUrl = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('tenant-tracker-reports')
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPdfUrl(url);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('tenant-tracker-reports')
        .download(report.file_path);

      if (error) throw error;

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
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{report?.report_name}</DialogTitle>
            <Button 
              onClick={handleDownload}
              disabled={downloading || loading}
              size="sm"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title={`Preview of ${report?.report_name}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Failed to load preview
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
