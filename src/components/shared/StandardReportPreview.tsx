import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { SaveToDropboxButton } from "@/components/storage/SaveToDropboxButton";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface StandardReportPreviewProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageBucket?: string;
  reportType?: string;
  onRegeneratePDF?: () => void;
  /** Dropbox folder path for saving - typically from project settings */
  dropboxFolderPath?: string | null;
}

export const StandardReportPreview = ({ 
  report, 
  open, 
  onOpenChange,
  storageBucket = "tenant-tracker-reports",
  reportType = "cost_report",
  onRegeneratePDF,
  dropboxFolderPath
}: StandardReportPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);

  useEffect(() => {
    if (open && report) {
      loadPdfUrl();
    } else if (!open) {
      // Clear state when dialog closes
      setPdfUrl(null);
      setPdfBlob(null);
      setNumPages(0);
    }
  }, [open, report?.id, report?.file_path]);

  const loadPdfUrl = async () => {
    setLoading(true);
    setNumPages(0);
    
    try {
      // Download the file to get both URL and blob
      const { data: blobData, error: downloadError } = await supabase.storage
        .from(storageBucket)
        .download(report.file_path);

      if (downloadError) {
        console.error('[PDF PREVIEW] Download error:', downloadError);
        throw downloadError;
      }

      if (blobData) {
        setPdfBlob(blobData);
        const objectUrl = URL.createObjectURL(blobData);
        setPdfUrl(objectUrl);
      }

      console.log('[PDF PREVIEW] Loading PDF');
      setLoading(false);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to load PDF preview');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (pdfBlob) {
        // Use already downloaded blob
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = report.report_name || 'report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Report downloaded successfully');
      } else {
        // Fallback to fresh download
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
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[PDF PREVIEW] Document loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('[PDF PREVIEW] Error loading PDF:', error);
    toast.error("Failed to load PDF preview. Please try downloading instead.");
  };

  const onPageLoadSuccess = () => {
    console.log('[PDF PREVIEW] Page loaded successfully');
  };

  const onPageLoadError = (error: Error) => {
    console.error('[PDF PREVIEW] Error loading page:', error);
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
            
            <SaveToDropboxButton
              fileContent={pdfBlob}
              filename={report?.report_name || 'report.pdf'}
              contentType="application/pdf"
              defaultFolder={dropboxFolderPath || "/EngiOps/Reports"}
              disabled={!pdfBlob}
            />
          </div>
        </div>

        {/* Content - Scrollable area with all pages */}
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div className="flex flex-col items-center gap-4">
            {pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading document...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-destructive mb-4">Failed to load PDF preview</p>
                    <Button onClick={handleDownload} variant="outline">
                      Download PDF Instead
                    </Button>
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
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={793.7}
                      className="shadow-lg bg-white"
                      onLoadSuccess={onPageLoadSuccess}
                      onLoadError={onPageLoadError}
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
