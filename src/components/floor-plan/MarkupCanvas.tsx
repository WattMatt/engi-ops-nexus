import { useEffect, useRef, useState } from 'react';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { Canvas as FabricCanvas, Image as FabricImage } from 'fabric';

export function MarkupCanvas() {
  const { state } = useFloorPlan();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 20 - 384, // Subtract toolbar and panel widths
      height: window.innerHeight,
      backgroundColor: '#1e293b',
    });

    setFabricCanvas(canvas);

    // Handle resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 20 - 384,
        height: window.innerHeight,
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Load PDF background
  useEffect(() => {
    if (!fabricCanvas || !state.pdfDataUrl) return;

    FabricImage.fromURL(state.pdfDataUrl, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      fabricCanvas.clear();
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
        scaleX: fabricCanvas.width! / img.width!,
        scaleY: fabricCanvas.height! / img.height!,
      });
    });
  }, [fabricCanvas, state.pdfDataUrl]);

  // Enable/disable drawing mode based on active tool
  useEffect(() => {
    if (!fabricCanvas) return;

    if (state.activeTool === 'pan') {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = false;
      // Enable panning
    } else if (state.activeTool === 'select') {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
    } else {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = false;
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, state.activeTool]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} />
      
      {/* Scale indicator */}
      {state.scaleMetersPerPixel && (
        <div className="absolute top-4 left-4 bg-surface border border-border rounded px-3 py-2 text-sm">
          Scale: 1px = {state.scaleMetersPerPixel.toFixed(4)}m
        </div>
      )}

      {/* Tool indicator */}
      {state.activeTool && (
        <div className="absolute top-4 right-4 bg-surface border border-border rounded px-3 py-2 text-sm">
          Active Tool: {state.activeTool}
        </div>
      )}
    </div>
  );
}
