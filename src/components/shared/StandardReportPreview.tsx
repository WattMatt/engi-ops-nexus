import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDFPagePreview } from "@/components/pdf-editor/PDFPagePreview";

// Configure PDF.js worker
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface StandardReportPreviewProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageBucket?: string;
  reportType?: string;
  onRegeneratePDF?: () => void;
}

export const StandardReportPreview = ({ 
  report, 
  open, 
  onOpenChange,
  storageBucket = "tenant-tracker-reports",
  reportType = "cost_report",
  onRegeneratePDF
}: StandardReportPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    if (open && report) {
      loadPdfUrl();
    } else if (!open) {
      // Clear PDF URL when dialog closes
      setPdfUrl(null);
      setPageNumber(1);
      setNumPages(0);
    }
  }, [open, report?.id, report?.file_path]); // Only re-run if these specific values change

  const loadPdfUrl = async () => {
    setLoading(true);
    setPageNumber(1);
    setNumPages(0);
    
    try {
      // Get public URL for the PDF
      const { data } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(report.file_path);

      if (!data.publicUrl) {
        throw new Error("Failed to get PDF URL");
      }

      // Add cache-busting timestamp to force fresh PDF load
      const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;
      console.log('[PDF PREVIEW] Loading PDF with cache-busting:', cacheBustedUrl);
      setPdfUrl(cacheBustedUrl);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to load PDF preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.report_name || 'report.pdf';
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

  const onDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages);
    setPageNumber(1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    toast.error("Failed to load PDF preview");
    setLoading(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold">{report?.report_name || 'Report Preview'}</h2>
              <p className="text-sm text-muted-foreground">
                {report?.projects?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/30">
            <PDFPagePreview
              pdfUrl={pdfUrl}
              currentPage={pageNumber}
              onDocumentLoadSuccess={onDocumentLoadSuccess}
              onDocumentLoadError={onDocumentLoadError}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
