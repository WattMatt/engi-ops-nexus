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

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setLoading(false);
    onDocumentLoadSuccess(numPages);
  };

  const handleLoadError = (error: Error) => {
    setLoading(false);
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

  return (
    <div className="relative bg-white shadow-lg mx-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      <Document
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
        <Page
          pageNumber={currentPage}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          width={793.7} // A4 width in pixels at 96 DPI (210mm)
          className="shadow-lg"
        />
      </Document>
    </div>
  );
};
