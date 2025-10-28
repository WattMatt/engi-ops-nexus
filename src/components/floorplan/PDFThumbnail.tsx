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
      if (!canvasRef.current) return;

      try {
        setLoading(true);
        setError(false);

        const pdf = await getDocument(url).promise;
        const page = await pdf.getPage(1);
        
        // Calculate scale to fit the thumbnail
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        const scale = Math.min(
          canvas.width / viewport.width,
          canvas.height / viewport.height
        );
        
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const context = canvas.getContext('2d');
        if (!context) return;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        } as any).promise;

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF thumbnail:', err);
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
