import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Tool, EquipmentItem, SupplyLine, SupplyZone, Containment, RoofMask, PVArrayItem, ScaleInfo, ViewState, Point, ContainmentType, PVPanelConfig, Task } from '@/types/floor-plan';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';
import { getCableColor, getContainmentStyle, getZoneColor } from '../utils/styleUtils';
import { calculatePolylineLength } from '../utils/geometry';

interface CanvasProps {
  pdfDoc: PDFDocumentProxy | null;
  activeTool: Tool;
  equipment: EquipmentItem[];
  setEquipment: (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit?: boolean) => void;
  lines: SupplyLine[];
  setLines: (updater: (prev: SupplyLine[]) => SupplyLine[], commit?: boolean) => void;
  zones: SupplyZone[];
  setZones: (updater: (prev: SupplyZone[]) => SupplyZone[], commit?: boolean) => void;
  containment: Containment[];
  setContainment: (updater: (prev: Containment[]) => Containment[], commit?: boolean) => void;
  roofMasks: RoofMask[];
  setRoofMasks: (updater: (prev: RoofMask[]) => RoofMask[], commit?: boolean) => void;
  pvArrays: PVArrayItem[];
  setPvArrays: (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit?: boolean) => void;
  scaleInfo: ScaleInfo | null;
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
  initialViewState: ViewState | null;
  setInitialViewState: (state: ViewState | null) => void;
  onScaleLineDrawn: (start: Point, end: Point) => void;
  onCableDrawn: (points: Point[], length: number) => void;
  onContainmentDrawn: (type: ContainmentType, points: Point[], length: number) => void;
  onRoofMaskDrawn: (points: Point[]) => void;
  onPvArrayPlacement: (x: number, y: number, roofId: string) => void;
  pvPanelConfig: PVPanelConfig | null;
  purposeConfig: PurposeConfig | null;
  tasks: Task[];
  onCreateTask?: (itemType: string, itemId: string) => void;
  onEditTask?: (task: Task) => void;
}

export interface CanvasHandles {
  setEquipmentType: (type: string) => void;
}

const Canvas = forwardRef<CanvasHandles, CanvasProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentEquipmentType, setCurrentEquipmentType] = useState<string>('');
  const drawingPoints = useRef<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  useImperativeHandle(ref, () => ({
    setEquipmentType: (type: string) => {
      setCurrentEquipmentType(type);
    },
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth - 320;
    canvas.height = window.innerHeight - 80;

    const handleResize = () => {
      canvas.width = window.innerWidth - 320;
      canvas.height = window.innerHeight - 80;
      draw();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render PDF
  useEffect(() => {
    if (!canvasRef.current || !props.pdfDoc) return;

    const renderPDF = async () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const page = await props.pdfDoc!.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const pdfCanvas = document.createElement('canvas');
      const pdfCtx = pdfCanvas.getContext('2d');
      if (!pdfCtx) return;

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;

      await page.render({
        canvas: pdfCanvas,
        canvasContext: pdfCtx,
        viewport,
      }).promise;

      ctx.drawImage(pdfCanvas, 0, 0, canvas.width, canvas.height);
      draw();
    };

    renderPDF();
  }, [props.pdfDoc]);

  // Drawing function
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw equipment
    props.equipment.forEach(eq => {
      ctx.fillStyle = '#FF6B6B';
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eq.x, eq.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (eq.label) {
        ctx.fillStyle = '#FFF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(eq.label, eq.x, eq.y + 25);
      }
    });

    // Draw lines
    props.lines.forEach(line => {
      if (line.points.length < 2) return;
      ctx.strokeStyle = getCableColor(line.type);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });

    // Draw zones
    props.zones.forEach((zone, idx) => {
      if (zone.points.length < 3) return;
      ctx.fillStyle = getZoneColor(idx);
      ctx.strokeStyle = '#FFD93D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(zone.points[0].x, zone.points[0].y);
      for (let i = 1; i < zone.points.length; i++) {
        ctx.lineTo(zone.points[i].x, zone.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (zone.label) {
        const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
        ctx.fillStyle = '#FFF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(zone.label, centerX, centerY);
      }
    });

    // Draw containment
    props.containment.forEach(cont => {
      if (cont.points.length < 2) return;
      const style = getContainmentStyle(cont.type);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 4;
      if (style.dash.length > 0) {
        ctx.setLineDash(style.dash);
      }
      ctx.beginPath();
      ctx.moveTo(cont.points[0].x, cont.points[0].y);
      for (let i = 1; i < cont.points.length; i++) {
        ctx.lineTo(cont.points[i].x, cont.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw current drawing
    if (drawingPoints.current.length > 0) {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawingPoints.current[0].x, drawingPoints.current[0].y);
      for (let i = 1; i < drawingPoints.current.length; i++) {
        ctx.lineTo(drawingPoints.current[i].x, drawingPoints.current[i].y);
      }
      ctx.stroke();
    }
  };

  // Redraw when data changes
  useEffect(() => {
    draw();
  }, [props.equipment, props.lines, props.zones, props.containment, drawingPoints.current.length]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (props.activeTool === Tool.PLACE_EQUIPMENT && currentEquipmentType) {
      props.setEquipment(prev => [...prev, {
        id: `eq-${Date.now()}`,
        type: currentEquipmentType,
        x: point.x,
        y: point.y,
      }], true);
    } else if (props.activeTool === Tool.SCALE) {
      if (drawingPoints.current.length === 0) {
        drawingPoints.current = [point];
        setIsDrawing(true);
      } else {
        props.onScaleLineDrawn(drawingPoints.current[0], point);
        drawingPoints.current = [];
        setIsDrawing(false);
      }
    } else if ([Tool.TOOL_CABLE_LV, Tool.TOOL_CABLE_HV, Tool.TOOL_CABLE_DATA, Tool.TOOL_CONTAINMENT_TRAY, Tool.TOOL_CONTAINMENT_TRUNKING, Tool.TOOL_CONTAINMENT_CONDUIT].includes(props.activeTool)) {
      drawingPoints.current.push(point);
      setIsDrawing(true);
      draw();
    } else if (props.activeTool === Tool.TOOL_ZONE) {
      drawingPoints.current.push(point);
      setIsDrawing(true);
      if (drawingPoints.current.length >= 3) {
        props.setZones(prev => [...prev, {
          id: `zone-${Date.now()}`,
          points: [...drawingPoints.current],
          label: `Zone ${prev.length + 1}`,
        }], true);
        drawingPoints.current = [];
        setIsDrawing(false);
      }
      draw();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && drawingPoints.current.length > 1) {
      if ([Tool.TOOL_CABLE_LV, Tool.TOOL_CABLE_HV, Tool.TOOL_CABLE_DATA].includes(props.activeTool)) {
        const length = calculatePolylineLength(drawingPoints.current, props.scaleInfo?.metersPerPixel || 1);
        props.onCableDrawn([...drawingPoints.current], length);
      } else if ([Tool.TOOL_CONTAINMENT_TRAY, Tool.TOOL_CONTAINMENT_TRUNKING, Tool.TOOL_CONTAINMENT_CONDUIT].includes(props.activeTool)) {
        const length = calculatePolylineLength(drawingPoints.current, props.scaleInfo?.metersPerPixel || 1);
        const type = props.activeTool === Tool.TOOL_CONTAINMENT_TRAY ? 'tray' : 
                    props.activeTool === Tool.TOOL_CONTAINMENT_TRUNKING ? 'trunking' : 'conduit';
        props.onContainmentDrawn(type as ContainmentType, [...drawingPoints.current], length);
      }
      drawingPoints.current = [];
      setIsDrawing(false);
      draw();
    } else if (e.key === 'Escape') {
      drawingPoints.current = [];
      setIsDrawing(false);
      draw();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.activeTool, props.scaleInfo]);

  return (
    <div className="flex-1 relative bg-background">
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        className="cursor-crosshair"
      />
      {isDrawing && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg">
          <p className="text-sm text-muted-foreground">
            Press Enter to finish, Esc to cancel
          </p>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
