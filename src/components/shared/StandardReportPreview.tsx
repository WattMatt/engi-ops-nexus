import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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

  useEffect(() => {
    if (open && report) {
      loadPdfUrl();
    } else if (!open) {
      // Clear PDF URL when dialog closes
      setPdfUrl(null);
      setNumPages(0);
    }
  }, [open, report?.id, report?.file_path]);

  const loadPdfUrl = async () => {
    setLoading(true);
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
    console.log('[PDF PREVIEW] Document loaded with', numPages, 'pages');
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    toast.error("Failed to load PDF preview");
    setLoading(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{report?.report_name || 'Report Preview'}</h2>
            <p className="text-sm text-muted-foreground">
              {report?.projects?.name || (numPages > 0 ? `${numPages} pages` : 'Loading...')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || !pdfUrl}
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

        {/* Content - Scrollable area with all pages */}
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div className="flex flex-col items-center gap-4">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            
            {!loading && pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                }
                options={{
                  cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                }}
              >
                {numPages > 0 && Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-4">
                    <Page
                      pageNumber={index + 1}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      width={793.7}
                      className="shadow-lg bg-white"
                      loading={
                        <div className="flex items-center justify-center p-8 bg-white shadow-lg" style={{ width: 793.7, height: 1122 }}>
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      }
                    />
                  </div>
                ))}
              </Document>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
