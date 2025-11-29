import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InvoicePDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  invoiceNumber?: string;
}

export function InvoicePDFPreviewDialog({
  open,
  onOpenChange,
  filePath,
  invoiceNumber,
}: InvoicePDFPreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && filePath) {
      loadPdf();
    } else {
      setPdfUrl(null);
      setPageNumber(1);
      setNumPages(0);
      setError(null);
    }
  }, [open, filePath]);

  const loadPdf = async () => {
    if (!filePath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.storage
        .from("invoice-pdfs")
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        // Ensure full URL
        const fullUrl = data.signedUrl.startsWith('http') 
          ? data.signedUrl 
          : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${data.signedUrl}`;
        setPdfUrl(fullUrl);
      } else {
        throw new Error("Could not generate PDF URL");
      }
    } catch (err: any) {
      console.error("PDF load error:", err);
      setError(err.message || "Failed to load PDF");
      toast.error("Failed to load PDF: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!filePath) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("invoice-pdfs")
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = invoiceNumber ? `${invoiceNumber}.pdf` : "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download started");
    } catch (err: any) {
      toast.error("Failed to download: " + err.message);
    }
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF render error:", err);
    setError("Failed to render PDF");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice PDF {invoiceNumber ? `- ${invoiceNumber}` : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenExternal} disabled={!pdfUrl}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col items-center">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadPdf}>Try Again</Button>
            </div>
          )}

          {pdfUrl && !error && (
            <>
              <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 w-full flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                    width={700}
                  />
                </Document>
              </div>

              {numPages > 1 && (
                <div className="flex items-center gap-4 mt-4 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
