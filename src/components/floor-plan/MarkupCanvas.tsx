import { useEffect, useRef, useState, useCallback } from 'react';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { Canvas as FabricCanvas, Image as FabricImage, Line, Circle, Polygon, Rect } from 'fabric';
import { ScaleDialog } from './modals/ScaleDialog';
import { CableDetailsDialog, CableDetails } from './modals/CableDetailsDialog';
import { PVConfigDialog } from './modals/PVConfigDialog';
import { Point } from '@/lib/floorPlan/types';
import { useToast } from '@/hooks/use-toast';
import { getSymbolById } from '@/lib/floorPlan/symbols';

export function MarkupCanvas() {
  const { state, updateState, addCable, addZone, addEquipment } = useFloorPlan();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleLineLength, setScaleLineLength] = useState(0);
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [pvConfigOpen, setPvConfigOpen] = useState(false);
  const [pendingCablePoints, setPendingCablePoints] = useState<Point[]>([]);
  const [equipmentRotation, setEquipmentRotation] = useState(0);
  const { toast } = useToast();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 20 - 384,
      height: window.innerHeight,
      backgroundColor: '#1e293b',
    });

    setFabricCanvas(canvas);

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

    FabricImage.fromURL(state.pdfDataUrl, { crossOrigin: 'anonymous' }).then((img) => {
      fabricCanvas.clear();
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
        scaleX: fabricCanvas.width! / img.width!,
        scaleY: fabricCanvas.height! / img.height!,
      });
    });
  }, [fabricCanvas, state.pdfDataUrl]);

  // Handle keyboard for equipment rotation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (state.activeTool?.startsWith('equipment:') && e.key === 'r') {
        setEquipmentRotation(prev => (prev + 45) % 360);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [state.activeTool]);

  // Handle canvas clicks for drawing
  const handleCanvasClick = useCallback((e: any) => {
    if (!fabricCanvas) return;
    
    const pointer = fabricCanvas.getPointer(e.e);
    const point = { x: pointer.x, y: pointer.y };

    // Equipment placement
    if (state.activeTool?.startsWith('equipment:')) {
      const symbolId = state.activeTool.split(':')[1];
      const symbol = getSymbolById(symbolId);
      if (symbol && state.scaleMetersPerPixel) {
        const pixelWidth = symbol.defaultSize.width / state.scaleMetersPerPixel;
        const pixelHeight = symbol.defaultSize.height / state.scaleMetersPerPixel;
        
        const rect = new Rect({
          left: point.x - pixelWidth / 2,
          top: point.y - pixelHeight / 2,
          width: pixelWidth,
          height: pixelHeight,
          fill: symbol.color,
          opacity: 0.7,
          stroke: symbol.color,
          strokeWidth: 2,
          angle: equipmentRotation,
        });
        
        fabricCanvas.add(rect);
        
        addEquipment({
          id: crypto.randomUUID(),
          type: symbol.name,
          x: point.x,
          y: point.y,
          rotation: equipmentRotation,
        });
        
        toast({ title: 'Equipment Placed', description: symbol.name });
      }
      return;
    }

    // Scale tool
    if (state.activeTool === 'scale') {
      if (drawingPoints.length === 0) {
        setDrawingPoints([point]);
      } else {
        const start = drawingPoints[0];
        const length = Math.sqrt(Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2));
        setScaleLineLength(length);
        setScaleDialogOpen(true);
        setDrawingPoints([]);
      }
    }

    // Cable drawing
    if (['lv-cable', 'mv-cable', 'dc-cable'].includes(state.activeTool || '')) {
      const newPoints = [...drawingPoints, point];
      setDrawingPoints(newPoints);
      
      // Draw temporary line
      if (newPoints.length > 1) {
        const line = new Line([
          newPoints[newPoints.length - 2].x,
          newPoints[newPoints.length - 2].y,
          point.x,
          point.y
        ], {
          stroke: '#3b82f6',
          strokeWidth: 2,
        });
        fabricCanvas.add(line);
      }
    }

    // Zone drawing
    if (state.activeTool === 'zone') {
      const newPoints = [...drawingPoints, point];
      setDrawingPoints(newPoints);
      
      const circle = new Circle({
        left: point.x - 3,
        top: point.y - 3,
        radius: 3,
        fill: '#22c55e',
      });
      fabricCanvas.add(circle);
    }
  }, [fabricCanvas, state.activeTool, drawingPoints, state.scaleMetersPerPixel, equipmentRotation, addEquipment, toast]);

  // Handle double-click to finish drawing
  const handleDoubleClick = useCallback(() => {
    if (['lv-cable', 'mv-cable', 'dc-cable'].includes(state.activeTool || '') && drawingPoints.length > 1) {
      setPendingCablePoints(drawingPoints);
      setCableDialogOpen(true);
    }

    if (state.activeTool === 'zone' && drawingPoints.length > 2) {
      const polygon = new Polygon(drawingPoints, {
        fill: 'rgba(34, 197, 94, 0.2)',
        stroke: '#22c55e',
        strokeWidth: 2,
      });
      fabricCanvas?.add(polygon);
      
      // Calculate area
      let area = 0;
      for (let i = 0; i < drawingPoints.length; i++) {
        const j = (i + 1) % drawingPoints.length;
        area += drawingPoints[i].x * drawingPoints[j].y;
        area -= drawingPoints[j].x * drawingPoints[i].y;
      }
      area = Math.abs(area / 2);
      const areaSqm = area * Math.pow(state.scaleMetersPerPixel || 1, 2);

      addZone({
        id: crypto.randomUUID(),
        points: drawingPoints,
        areaSqm,
        label: `Zone ${state.zones.length + 1}`,
      });

      toast({ title: 'Zone Created', description: `Area: ${areaSqm.toFixed(2)}m²` });
    }

    setDrawingPoints([]);
  }, [state.activeTool, drawingPoints, fabricCanvas, state.scaleMetersPerPixel, addZone, state.zones.length, toast]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.on('mouse:down', handleCanvasClick);
    fabricCanvas.on('mouse:dblclick', handleDoubleClick);
    
    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
      fabricCanvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [fabricCanvas, handleCanvasClick, handleDoubleClick]);

  // Handle PV Config tool
  useEffect(() => {
    if (state.activeTool === 'pv-config' && !state.pvConfig) {
      setPvConfigOpen(true);
    }
  }, [state.activeTool, state.pvConfig]);

  const handleScaleConfirm = (metersPerPixel: number) => {
    updateState({ scaleMetersPerPixel: metersPerPixel });
    toast({ title: 'Scale Set', description: `1px = ${metersPerPixel.toFixed(4)}m` });
  };

  const handleCableConfirm = (details: CableDetails) => {
    if (pendingCablePoints.length < 2) return;

    let totalLength = 0;
    for (let i = 0; i < pendingCablePoints.length - 1; i++) {
      const dx = pendingCablePoints[i + 1].x - pendingCablePoints[i].x;
      const dy = pendingCablePoints[i + 1].y - pendingCablePoints[i].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    const lengthMeters = totalLength * (state.scaleMetersPerPixel || 1);

    const cableType: any = state.activeTool === 'mv-cable' ? 'MV' : state.activeTool === 'dc-cable' ? 'DC' : 'LV/AC';

    addCable({
      id: crypto.randomUUID(),
      cableType,
      points: pendingCablePoints,
      lengthMeters,
      fromLabel: details.fromLabel,
      toLabel: details.toLabel,
      terminationCount: details.terminationCount,
      startHeight: details.startHeight,
      endHeight: details.endHeight,
      label: details.label,
    });

    toast({ title: 'Cable Added', description: `Length: ${lengthMeters.toFixed(2)}m` });
    setPendingCablePoints([]);
    setDrawingPoints([]);
  };

  const handlePVConfigConfirm = (config: any) => {
    updateState({ pvConfig: config });
    toast({ title: 'PV Configuration Saved' });
  };

  return (
    <>
      <div className="w-full h-full relative">
        <canvas ref={canvasRef} />
        
        {state.scaleMetersPerPixel && (
          <div className="absolute top-4 left-4 bg-surface border border-border rounded px-3 py-2 text-sm">
            Scale: 1px = {state.scaleMetersPerPixel.toFixed(4)}m
          </div>
        )}

        {state.activeTool && (
          <div className="absolute top-4 right-4 bg-surface border border-border rounded px-3 py-2 text-sm">
            Active Tool: {state.activeTool}
            {drawingPoints.length > 0 && ` (${drawingPoints.length} points)`}
          </div>
        )}
      </div>

      <ScaleDialog
        open={scaleDialogOpen}
        onClose={() => setScaleDialogOpen(false)}
        onConfirm={handleScaleConfirm}
        pixelLength={scaleLineLength}
      />

      <CableDetailsDialog
        open={cableDialogOpen}
        onClose={() => setCableDialogOpen(false)}
        onConfirm={handleCableConfirm}
      />

      <PVConfigDialog
        open={pvConfigOpen}
        onClose={() => setPvConfigOpen(false)}
        onConfirm={handlePVConfigConfirm}
      />
    </>
  );
}
