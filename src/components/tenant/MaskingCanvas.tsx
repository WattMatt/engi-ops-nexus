import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPdfToCanvas } from './utils/pdfCanvas';

interface Point {
  x: number;
  y: number;
}

interface ViewState {
  zoom: number;
  offset: Point;
}

interface MaskingCanvasProps {
  pdfDoc: PDFDocumentProxy | null;
  onScaleLineComplete?: (start: Point, end: Point) => void;
  isScaleMode: boolean;
  existingScale: number | null;
  scaleLine: { start: Point | null; end: Point | null };
  onScaleLineUpdate: (line: { start: Point | null; end: Point | null }) => void;
}

export const MaskingCanvas = ({ 
  pdfDoc, 
  onScaleLineComplete,
  isScaleMode,
  existingScale,
  scaleLine,
  onScaleLineUpdate
}: MaskingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasesWrapperRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDrawingScale, setIsDrawingScale] = useState(false);

  // Initialize canvas size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Render PDF to canvas
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || !containerRef.current) return;

    const renderPdf = async () => {
      const page = await pdfDoc.getPage(1);
      const renderScale = 2.0;
      const viewport = page.getViewport({ scale: renderScale });
      const pdfCanvas = pdfCanvasRef.current!;
      const drawingCanvas = overlayCanvasRef.current;
      
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      
      if (drawingCanvas) {
        drawingCanvas.width = viewport.width;
        drawingCanvas.height = viewport.height;
      }
      
      setCanvasSize({ width: viewport.width, height: viewport.height });
      
      const context = pdfCanvas.getContext('2d');
      if (!context) return;
      
      // @ts-ignore - The pdfjs-dist types can be misaligned
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      // Calculate initial view state to fit the PDF
      const containerWidth = containerRef.current!.clientWidth;
      const containerHeight = containerRef.current!.clientHeight;
      const initialZoom = Math.min(containerWidth / viewport.width, containerHeight / viewport.height) * 0.95;
      const initialOffsetX = (containerWidth - viewport.width * initialZoom) / 2;
      const initialOffsetY = (containerHeight - viewport.height * initialZoom) / 2;
      
      setViewState({ zoom: initialZoom, offset: { x: initialOffsetX, y: initialOffsetY } });
    };

    renderPdf();
  }, [pdfDoc]);

  // Draw overlay (scale line, etc.)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Draw scale line
    if (scaleLine.start) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
      ctx.lineTo(
        scaleLine.end?.x ?? scaleLine.start.x,
        scaleLine.end?.y ?? scaleLine.start.y
      );
      ctx.stroke();

      // Draw endpoints
      const drawCircle = (p: Point) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / viewState.zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      };

      drawCircle(scaleLine.start);
      if (scaleLine.end) drawCircle(scaleLine.end);
    }

    ctx.restore();
  }, [viewState, scaleLine]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const getMousePos = (e: React.MouseEvent | React.WheelEvent): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const toWorld = (p: Point): Point => {
    return {
      x: (p.x - viewState.offset.x) / viewState.zoom,
      y: (p.y - viewState.offset.y) / viewState.zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);

    // Scale mode - drawing scale line
    if (isScaleMode) {
      if (!isDrawingScale) {
        setIsDrawingScale(true);
        onScaleLineUpdate({ start: worldPos, end: null });
      } else {
        onScaleLineUpdate({ ...scaleLine, end: worldPos });
        
        // Notify parent that scale line is complete
        if (onScaleLineComplete && scaleLine.start) {
          onScaleLineComplete(scaleLine.start, worldPos);
        }
        setIsDrawingScale(false);
      }
      return;
    }

    // Middle mouse button OR left click when not in scale mode - pan
    if (e.button === 1 || e.button === 0) {
      setIsPanning(true);
      setLastMousePos(mousePos);
      if (e.button === 1) {
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);

    if (isScaleMode && isDrawingScale && scaleLine.start) {
      const worldPos = toWorld(mousePos);
      onScaleLineUpdate({ ...scaleLine, end: worldPos });
    }
    
    if (isPanning) {
      const dx = mousePos.x - lastMousePos.x;
      const dy = mousePos.y - lastMousePos.y;
      setViewState(prev => ({
        ...prev,
        offset: { x: prev.offset.x + dx, y: prev.offset.y + dy }
      }));
      setLastMousePos(mousePos);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    const worldPosBefore = toWorld(mousePos);
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(10, viewState.zoom * zoomFactor));
    
    const worldPosAfter = {
      x: (mousePos.x - viewState.offset.x) / newZoom,
      y: (mousePos.y - viewState.offset.y) / newZoom,
    };
    
    const newOffset = {
      x: viewState.offset.x + (worldPosBefore.x - worldPosAfter.x) * newZoom,
      y: viewState.offset.y + (worldPosBefore.y - worldPosAfter.y) * newZoom,
    };
    
    setViewState({ zoom: newZoom, offset: newOffset });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-muted/30"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ 
        cursor: isScaleMode ? 'crosshair' : (isPanning ? 'grabbing' : 'grab')
      }}
    >
      <div
        ref={canvasesWrapperRef}
        style={{
          position: 'absolute',
          transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <canvas ref={pdfCanvasRef} />
      </div>
      
      <canvas
        ref={overlayCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 pointer-events-none"
      />

      {existingScale && (
        <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-2 text-sm">
          Scale: {existingScale.toFixed(2)} px/m
        </div>
      )}
    </div>
  );
};

