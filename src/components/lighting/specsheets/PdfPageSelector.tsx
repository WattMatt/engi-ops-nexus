import React, { useState, useRef, useEffect, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Crop, X, Check, RotateCcw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface PdfPageSelectorProps {
  pdfUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export const PdfPageSelector: React.FC<PdfPageSelectorProps> = ({
  pdfUrl,
  onCrop,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null);
  const [selection, setSelection] = useState<SelectionArea | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Load PDF and render page as image
  useEffect(() => {
    const loadPdfPage = async () => {
      setLoading(true);
      try {
        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 2 }); // High res

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          await page.render({
            canvasContext: tempCtx,
            viewport,
            // @ts-ignore - canvas property for newer pdf.js versions
            canvas: tempCanvas,
          }).promise;

          const img = new Image();
          img.onload = () => {
            setPageImage(img);
            setLoading(false);
          };
          img.src = tempCanvas.toDataURL('image/png');
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoading(false);
      }
    };

    loadPdfPage();
  }, [pdfUrl, currentPage]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !pageImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate scale to fit container
    const container = containerRef.current;
    if (container) {
      const maxWidth = container.clientWidth - 32;
      const maxHeight = container.clientHeight - 100;
      const scaleX = maxWidth / pageImage.width;
      const scaleY = maxHeight / pageImage.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);

      canvas.width = pageImage.width * newScale;
      canvas.height = pageImage.height * newScale;
    }

    // Draw image
    ctx.drawImage(pageImage, 0, 0, canvas.width, canvas.height);

    // Draw selection overlay
    if (selection) {
      const x = Math.min(selection.startX, selection.endX);
      const y = Math.min(selection.startY, selection.endY);
      const width = Math.abs(selection.endX - selection.startX);
      const height = Math.abs(selection.endY - selection.startY);

      // Darken non-selected area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, y);
      ctx.fillRect(0, y, x, height);
      ctx.fillRect(x + width, y, canvas.width - x - width, height);
      ctx.fillRect(0, y + height, canvas.width, canvas.height - y - height);

      // Draw selection border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      // Draw corner handles
      ctx.fillStyle = '#3b82f6';
      const handleSize = 8;
      ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
      ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
    }
  }, [pageImage, selection, scale]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsSelecting(true);
    setSelection({
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
    });
  }, [getMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    const pos = getMousePos(e);
    setSelection(prev => prev ? {
      ...prev,
      endX: pos.x,
      endY: pos.y,
    } : null);
  }, [isSelecting, getMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleCrop = useCallback(() => {
    if (!selection || !pageImage || !canvasRef.current) return;

    const x = Math.min(selection.startX, selection.endX) / scale;
    const y = Math.min(selection.startY, selection.endY) / scale;
    const width = Math.abs(selection.endX - selection.startX) / scale;
    const height = Math.abs(selection.endY - selection.startY) / scale;

    if (width < 10 || height < 10) return;

    // Create crop canvas
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = width;
    cropCanvas.height = height;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCtx.drawImage(pageImage, x, y, width, height, 0, 0, width, height);

    cropCanvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/png', 1.0);
  }, [selection, pageImage, scale, onCrop]);

  const handleReset = useCallback(() => {
    setSelection(null);
  }, []);

  const hasValidSelection = selection && 
    Math.abs(selection.endX - selection.startX) > 10 && 
    Math.abs(selection.endY - selection.startY) > 10;

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Crop className="h-4 w-4" />
          <span>Draw a rectangle to select the fitting image</span>
        </div>
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {numPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!selection}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCrop}
            disabled={!hasValidSelection}
          >
            <Check className="h-4 w-4 mr-1" />
            Extract Image
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/10">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading page...
          </div>
        ) : pageImage ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair shadow-lg rounded"
          />
        ) : (
          <div className="text-muted-foreground">Failed to load PDF</div>
        )}
      </div>
    </div>
  );
};
