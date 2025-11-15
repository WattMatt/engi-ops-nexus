import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPagePreviewProps {
  pdfUrl: string | null;
  currentPage: number;
  onDocumentLoadSuccess: (numPages: number) => void;
  onDocumentLoadError: (error: Error) => void;
}

export const PDFPagePreview = ({
  pdfUrl,
  currentPage,
  onDocumentLoadSuccess,
  onDocumentLoadError,
}: PDFPagePreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setLoading(false);
    setDocumentLoaded(true);
    setLoadError(null);
    onDocumentLoadSuccess(numPages);
  };

  const handleLoadError = (error: Error) => {
    setLoading(false);
    setDocumentLoaded(false);
    setLoadError(error);
    console.error('PDF load error:', error);
    onDocumentLoadError(error);
  };

  if (!pdfUrl) {
    return (
      <div className="w-full h-full bg-white shadow-lg mx-auto flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">No PDF report available</p>
          <p className="text-sm">Generate a report first to edit its template</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-white shadow-lg mx-auto flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="mb-2 text-destructive">Failed to load PDF</p>
          <p className="text-sm">The PDF file could not be loaded. Please try regenerating the report.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white shadow-lg mx-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      <Document
        key={pdfUrl} // Force new Document instance when URL changes
        file={pdfUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
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
        {documentLoaded && !loadError && (
          <Page
            key={`page-${currentPage}`}
            pageNumber={currentPage}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={793.7} // A4 width in pixels at 96 DPI (210mm)
            className="shadow-lg"
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8 text-destructive">
                <p>Failed to load page</p>
              </div>
            }
          />
        )}
      </Document>
    </div>
  );
};
