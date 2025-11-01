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
  onScaleSet?: (pixelsPerMeter: number) => void;
  isScaleMode: boolean;
  existingScale: number | null;
}

export const MaskingCanvas = ({ 
  pdfDoc, 
  onScaleSet, 
  isScaleMode,
  existingScale 
}: MaskingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [scaleLine, setScaleLine] = useState<{ start: Point | null; end: Point | null }>({ 
    start: null, 
    end: null 
  });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
    if (!pdfDoc || !pdfCanvasRef.current) return;

    const renderPdf = async () => {
      console.log('Rendering PDF to canvas');
      await renderPdfToCanvas(pdfDoc, {
        pdfCanvas: pdfCanvasRef.current!,
        scale: 2.0
      });

      // Center the PDF in view
      if (pdfCanvasRef.current && containerRef.current) {
        const pdfWidth = pdfCanvasRef.current.width;
        const pdfHeight = pdfCanvasRef.current.height;
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        const initialZoom = Math.min(
          containerWidth / pdfWidth,
          containerHeight / pdfHeight
        ) * 0.9;

        const offsetX = (containerWidth - pdfWidth * initialZoom) / 2;
        const offsetY = (containerHeight - pdfHeight * initialZoom) / 2;

        setViewState({ zoom: initialZoom, offset: { x: offsetX, y: offsetY } });
      }
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

  const getMousePos = (e: React.MouseEvent): Point => {
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

    if (isScaleMode) {
      const worldPos = toWorld(mousePos);
      if (!scaleLine.start) {
        setScaleLine({ start: worldPos, end: null });
      } else {
        setScaleLine({ ...scaleLine, end: worldPos });
        
        // Calculate distance and trigger callback
        const dx = worldPos.x - scaleLine.start.x;
        const dy = worldPos.y - scaleLine.start.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        
        // This will open the dialog in the parent component
        if (onScaleSet && lineLength > 0) {
          // Parent will handle the dialog and call back with the distance
          // For now, just keep the line visible
        }
      }
    } else {
      // Pan mode
      setIsPanning(true);
      setLastMousePos(mousePos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);

    if (isScaleMode && scaleLine.start && !scaleLine.end) {
      const worldPos = toWorld(mousePos);
      setScaleLine({ ...scaleLine, end: worldPos });
    } else if (isPanning) {
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
    setIsPanning(false);
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
      style={{ cursor: isScaleMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
    >
      <div
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

