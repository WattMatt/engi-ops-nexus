import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, X, FileText, Calendar, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ElectricalBudgetReport {
  id: string;
  budget_id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  revision: string;
  generated_at: string;
  notes?: string;
}

interface ElectricalBudgetReportPreviewProps {
  report: ElectricalBudgetReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageBucket?: string;
}

export const ElectricalBudgetReportPreview = ({
  report,
  open,
  onOpenChange,
  storageBucket = "budget-reports",
}: ElectricalBudgetReportPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLoading, setPageLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && report?.file_path) {
      loadPdfUrl();
    } else {
      setPdfUrl(null);
      setNumPages(0);
      setCurrentPage(1);
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, report?.file_path]);

  const loadPdfUrl = async () => {
    if (!report?.file_path) return;

    setLoading(true);
    try {
      console.log('[Preview] Loading PDF from:', report.file_path);
      
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (error) {
        console.error('[Preview] Storage error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      console.log('[Preview] Downloaded blob:', data.size, 'bytes');
      
      const pdfBlob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Failed to load preview:", error);
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Could not load the PDF preview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report?.file_path) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${report.file_name} downloaded successfully`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('[Preview] Document loaded with', numPages, 'pages');
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('[Preview] Document load error:', error);
    toast({
      title: "PDF Load Error",
      description: "Failed to render PDF document",
      variant: "destructive",
    });
  }, [toast]);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Budget Report Preview
          </DialogTitle>
          <DialogDescription>
            Preview and download your generated budget report
          </DialogDescription>
        </DialogHeader>

        {/* Report Info Badges */}
        {report && (
          <div className="flex flex-wrap gap-2 py-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Rev {report.revision}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}
            </Badge>
            <Badge variant="secondary">
              {formatFileSize(report.file_size)}
            </Badge>
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 min-h-[500px] border rounded-lg bg-muted/30 overflow-auto flex flex-col items-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : pdfUrl ? (
            <div className="w-full flex flex-col items-center py-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
                className="flex flex-col items-center"
              >
                <Page
                  pageNumber={currentPage}
                  width={800}
                  loading={
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                  onLoadSuccess={() => setPageLoading(false)}
                  onLoadError={(error) => console.error('[Preview] Page load error:', error)}
                  className="shadow-lg"
                />
              </Document>

              {/* Page Navigation */}
              {numPages > 1 && (
                <div className="flex items-center gap-4 mt-4 py-2 px-4 bg-background border rounded-lg shadow-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No report to preview
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!report || downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
