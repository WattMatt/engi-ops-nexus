import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
 import { getViewableUrl, downloadFile } from "@/lib/fileViewer";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentPreviewDialogProps {
  document: {
    id: string;
    document_name: string;
    file_url: string;
    document_type: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocumentPreviewDialog = ({ 
  document, 
  open, 
  onOpenChange 
}: DocumentPreviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'unknown'>('unknown');
   const [viewableUrl, setViewableUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && document) {
      detectFileType();
      setPageNumber(1);
      setNumPages(0);
       // Get viewable URL for the file
       getViewableUrl(document.file_url).then(({ url }) => {
         setViewableUrl(url);
       });
     } else {
       setViewableUrl(null);
    }
  }, [open, document]);

  const detectFileType = () => {
    if (!document) return;
    
    const extension = document.document_name.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      setFileType('pdf');
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
      setFileType('image');
    } else {
      setFileType('unknown');
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

  const handleDownload = async () => {
    if (!document) return;

    setDownloading(true);
     await downloadFile(document.file_url, document.document_name, {
       onSuccess: () => {
         toast.success('Document downloaded successfully');
       },
       onError: (error) => {
         toast.error(error || 'Failed to download document');
       },
     });
     setDownloading(false);
  };

   // URL to use for rendering (viewable URL or fallback to original)
   const renderUrl = viewableUrl || document?.file_url;

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle>{document.document_name}</DialogTitle>
              {fileType === 'pdf' && numPages > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Page {pageNumber} of {numPages}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleDownload}
                disabled={downloading}
                size="sm"
                variant="outline"
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
        
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted">
          {fileType === 'pdf' ? (
            <div className="w-full h-full flex flex-col">
              <Document
                 file={renderUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }
                className="flex-1 flex justify-center items-center overflow-auto"
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  width={Math.min(window.innerWidth * 0.8, 900)}
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
          ) : fileType === 'image' ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
               <img
                 src={renderUrl || document.file_url}
                alt={document.document_name}
                className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                onError={() => {
                  toast.error("Failed to load image");
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <p>Preview not available for this file type</p>
              <p className="text-sm">File: {document.document_name}</p>
              <Button
                onClick={handleDownload}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};