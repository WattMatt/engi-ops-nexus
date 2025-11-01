import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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
  
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentOffset, setCurrentOffset] = useState({ x: 0, y: 0 });

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
    ctx.translate(currentOffset.x, currentOffset.y);
    ctx.scale(currentZoom, currentZoom);

    // Draw scale line
    if (scaleLine.start) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / currentZoom;
      ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
      ctx.lineTo(
        scaleLine.end?.x ?? scaleLine.start.x,
        scaleLine.end?.y ?? scaleLine.start.y
      );
      ctx.stroke();

      // Draw endpoints
      const drawCircle = (p: Point) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / currentZoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      };

      drawCircle(scaleLine.start);
      if (scaleLine.end) drawCircle(scaleLine.end);
    }

    ctx.restore();
  }, [currentZoom, currentOffset, scaleLine]);

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
      x: (p.x - currentOffset.x) / currentZoom,
      y: (p.y - currentOffset.y) / currentZoom,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isScaleMode) return;

    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);
    
    if (!scaleLine.start) {
      onScaleLineUpdate({ start: worldPos, end: null });
    } else {
      onScaleLineUpdate({ ...scaleLine, end: worldPos });
      
      // Notify parent that scale line is complete
      if (onScaleLineComplete) {
        onScaleLineComplete(scaleLine.start, worldPos);
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent) => {
    if (isScaleMode && scaleLine.start && !scaleLine.end) {
      const mousePos = getMousePos(e);
      const worldPos = toWorld(mousePos);
      onScaleLineUpdate({ ...scaleLine, end: worldPos });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-muted/30"
    >
      <TransformWrapper
        disabled={isScaleMode}
        initialScale={1}
        minScale={0.1}
        maxScale={10}
        wheel={{ step: 0.1 }}
        panning={{ disabled: isScaleMode }}
        onTransformed={(ref) => {
          setCurrentZoom(ref.state.scale);
          setCurrentOffset({ x: ref.state.positionX, y: ref.state.positionY });
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
            }}
            contentStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              style={{ cursor: isScaleMode ? 'crosshair' : 'grab' }}
            >
              <canvas ref={pdfCanvasRef} />
            </div>
          </TransformComponent>
        )}
      </TransformWrapper>
      
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

