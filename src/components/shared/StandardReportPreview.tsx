import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFTemplateEditor } from "@/components/pdf-editor/PDFTemplateEditor";

// Configure PDF.js worker
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
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (open && report) {
      loadPdfUrl();
    }
    return () => {
      if (pdfUrl) {
        setPdfUrl(null);
      }
    };
  }, [open, report]);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    toast.error("Failed to load PDF preview");
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>{report?.report_name}</DialogTitle>
                {numPages > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Page {pageNumber} of {numPages}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditorOpen(true)}
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
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
            </div>
          </DialogHeader>
        
        <div className="flex-1 overflow-auto flex flex-col items-center bg-muted rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <div className="w-full h-full flex flex-col">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }
                className="flex-1 flex justify-center items-center"
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={700}
                  className="shadow-lg"
                />
              </Document>
              
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-4 bg-background border-t">
                  <Button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <p>Failed to load PDF preview</p>
              <Button
                onClick={handleDownload}
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

      <PDFTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        reportType={reportType}
        reportPdfUrl={pdfUrl}
        onApplyTemplate={() => {
          if (onRegeneratePDF) {
            onRegeneratePDF();
          }
        }}
      />
    </>
  );
};
