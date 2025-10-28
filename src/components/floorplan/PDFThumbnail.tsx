import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { Loader2 } from "lucide-react";

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.mjs`;

interface PDFThumbnailProps {
  url: string;
  className?: string;
}

export const PDFThumbnail = ({ url, className = "" }: PDFThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPDF = async () => {
      if (!canvasRef.current) {
        console.log('PDFThumbnail: Canvas ref not ready');
        return;
      }

      try {
        console.log('PDFThumbnail: Loading PDF from', url);
        setLoading(true);
        setError(false);

        const loadingTask = getDocument({
          url: url,
          withCredentials: false,
          isEvalSupported: false,
        });
        
        const pdf = await loadingTask.promise;
        console.log('PDFThumbnail: PDF loaded, pages:', pdf.numPages);
        
        const page = await pdf.getPage(1);
        console.log('PDFThumbnail: First page loaded');
        
        // Calculate scale to fit the thumbnail
        const viewport = page.getViewport({ scale: 1 });
        console.log('PDFThumbnail: Viewport size:', viewport.width, 'x', viewport.height);
        
        const canvas = canvasRef.current;
        const containerWidth = 400; // Fixed width for thumbnail
        const scale = containerWidth / viewport.width;
        
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        console.log('PDFThumbnail: Canvas size:', canvas.width, 'x', canvas.height);

        const context = canvas.getContext('2d');
        if (!context) {
          console.error('PDFThumbnail: Could not get canvas context');
          setError(true);
          setLoading(false);
          return;
        }

        console.log('PDFThumbnail: Rendering page...');
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        } as any).promise;

        console.log('PDFThumbnail: Render complete');
        setLoading(false);
      } catch (err) {
        console.error('PDFThumbnail: Error loading PDF:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPDF();
  }, [url]);

  return (
    <div className={`relative bg-muted rounded-md overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No preview
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${loading || error ? 'opacity-0' : 'opacity-100'}`}
        width={400}
        height={300}
      />
    </div>
  );
};
