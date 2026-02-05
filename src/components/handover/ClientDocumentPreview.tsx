import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
 import { getViewableUrl } from "@/lib/fileViewer";

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ClientDocumentPreviewProps {
  document: {
    id: string;
    document_name: string;
    file_url: string;
    document_type: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (doc: any) => void;
}

export const ClientDocumentPreview = ({
  document,
  open,
  onOpenChange,
  onDownload,
}: ClientDocumentPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [fileType, setFileType] = useState<"pdf" | "image" | "other">("other");
   const [viewableUrl, setViewableUrl] = useState<string | null>(null);

  const detectFileType = () => {
    if (!document?.file_url) return "other";
    
    const url = document.file_url.toLowerCase();
    if (url.endsWith(".pdf") || url.includes(".pdf?")) {
      return "pdf";
    } else if (
      url.endsWith(".jpg") ||
      url.endsWith(".jpeg") ||
      url.endsWith(".png") ||
      url.endsWith(".gif") ||
      url.endsWith(".webp") ||
      url.includes(".jpg?") ||
      url.includes(".jpeg?") ||
      url.includes(".png?")
    ) {
      return "image";
    }
    return "other";
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (isOpen) {
      setFileType(detectFileType());
      setLoading(true);
      setPageNumber(1);
       // Get viewable URL for the file
       if (document?.file_url) {
         getViewableUrl(document.file_url).then(({ url }) => {
           setViewableUrl(url);
         });
       }
     } else {
       setViewableUrl(null);
    }
    onOpenChange(isOpen);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

   // URL to use for rendering (viewable URL or fallback to original)
   const renderUrl = viewableUrl || document?.file_url;

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {document.document_name}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(document)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {fileType === "pdf" ? (
            <div className="w-full">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <div className="flex flex-col items-center">
                <Document
                   file={renderUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                    width={Math.min(window.innerWidth * 0.8, 800)}
                  />
                </Document>

                {numPages > 1 && (
                  <div className="flex items-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : fileType === "image" ? (
            <div className="w-full">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <img
                 src={renderUrl || document.file_url}
                alt={document.document_name}
                className="max-w-full h-auto shadow-lg rounded-lg"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button
                variant="default"
                onClick={() => onDownload(document)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
