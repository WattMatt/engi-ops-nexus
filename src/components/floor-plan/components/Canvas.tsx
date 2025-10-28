import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, FabricObject, Line, Polygon, Rect, Polyline, IText, Point as FabricPoint } from 'fabric';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Tool, EquipmentItem, SupplyLine, SupplyZone, Containment, RoofMask, PVArrayItem, ScaleInfo, ViewState, Point, ContainmentType, PVPanelConfig, Task } from '@/types/floor-plan';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';
import { getCableColor, getContainmentStyle, getZoneColor } from '../utils/styleUtils';
import { calculateDistance, calculatePolylineLength } from '../utils/geometry';

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
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentEquipmentType, setCurrentEquipmentType] = useState<string>('');
  const drawingPoints = useRef<Point[]>([]);
  const tempLine = useRef<Polyline | null>(null);

  useImperativeHandle(ref, () => ({
    setEquipmentType: (type: string) => {
      setCurrentEquipmentType(type);
    },
  }));

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 320,
      height: window.innerHeight - 80,
      backgroundColor: '#1A1A1A',
      selection: props.activeTool === Tool.SELECT,
    });

    setFabricCanvas(canvas);

    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 320,
        height: window.innerHeight - 80,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Handle PDF rendering
  useEffect(() => {
    if (!fabricCanvas || !props.pdfDoc) return;

    const renderPDF = async () => {
      const page = await props.pdfDoc!.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      const imgData = canvas.toDataURL();
      fabricCanvas.clear();
      fabricCanvas.setBackgroundImage(imgData, fabricCanvas.renderAll.bind(fabricCanvas), {
        scaleX: fabricCanvas.width! / canvas.width,
        scaleY: fabricCanvas.height! / canvas.height,
      });
    };

    renderPDF();
  }, [fabricCanvas, props.pdfDoc]);

  // Handle tool changes
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = props.activeTool === Tool.SELECT;

    // Clear temporary drawing elements
    drawingPoints.current = [];
    if (tempLine.current) {
      fabricCanvas.remove(tempLine.current);
      tempLine.current = null;
    }
  }, [props.activeTool, fabricCanvas]);

  // Mouse event handlers
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getPointer(e.e);
      const point: Point = { x: pointer.x, y: pointer.y };

      switch (props.activeTool) {
        case Tool.PLACE_EQUIPMENT:
          if (currentEquipmentType) {
            const circle = new Circle({
              left: point.x,
              top: point.y,
              radius: 15,
              fill: '#FF6B6B',
              stroke: '#FFF',
              strokeWidth: 2,
              originX: 'center',
              originY: 'center',
            });
            fabricCanvas.add(circle);
            
            props.setEquipment(prev => [...prev, {
              id: `eq-${Date.now()}`,
              type: currentEquipmentType,
              x: point.x,
              y: point.y,
            }], true);
          }
          break;

        case Tool.SCALE:
          if (drawingPoints.current.length === 0) {
            drawingPoints.current = [point];
          } else {
            const startPoint = drawingPoints.current[0];
            props.onScaleLineDrawn(startPoint, point);
            drawingPoints.current = [];
          }
          break;

        case Tool.TOOL_CABLE_LV:
        case Tool.TOOL_CABLE_HV:
        case Tool.TOOL_CABLE_DATA:
          drawingPoints.current.push(point);
          if (tempLine.current) {
            fabricCanvas.remove(tempLine.current);
          }
          if (drawingPoints.current.length > 1) {
            tempLine.current = new Polyline(
              drawingPoints.current.map(p => new FabricPoint(p.x, p.y)),
              {
                stroke: getCableColor(props.activeTool),
                strokeWidth: 2,
                fill: 'transparent',
                selectable: false,
              }
            );
            fabricCanvas.add(tempLine.current);
          }
          break;

        case Tool.TOOL_ZONE:
          drawingPoints.current.push(point);
          if (drawingPoints.current.length > 2) {
            const polygon = new Polygon(
              drawingPoints.current.map(p => new FabricPoint(p.x, p.y)),
              {
                fill: getZoneColor(props.zones.length),
                stroke: '#FFD93D',
                strokeWidth: 2,
                opacity: 0.5,
                selectable: true,
              }
            );
            fabricCanvas.add(polygon);
            props.setZones(prev => [...prev, {
              id: `zone-${Date.now()}`,
              points: [...drawingPoints.current],
              label: `Zone ${prev.length + 1}`,
            }], true);
            drawingPoints.current = [];
          }
          break;

        case Tool.TOOL_CONTAINMENT_TRAY:
        case Tool.TOOL_CONTAINMENT_TRUNKING:
        case Tool.TOOL_CONTAINMENT_CONDUIT:
          drawingPoints.current.push(point);
          if (tempLine.current) {
            fabricCanvas.remove(tempLine.current);
          }
          if (drawingPoints.current.length > 1) {
            const style = getContainmentStyle(props.activeTool);
            tempLine.current = new Polyline(
              drawingPoints.current.map(p => new FabricPoint(p.x, p.y)),
              {
                stroke: style.color,
                strokeWidth: 4,
                strokeDashArray: style.dash,
                fill: 'transparent',
                selectable: false,
              }
            );
            fabricCanvas.add(tempLine.current);
          }
          break;
      }

      fabricCanvas.renderAll();
    };

    const handleMouseMove = (e: any) => {
      if (drawingPoints.current.length > 0 && tempLine.current) {
        const pointer = fabricCanvas.getPointer(e.e);
        const points = [...drawingPoints.current, { x: pointer.x, y: pointer.y }];
        
        if (tempLine.current) {
          fabricCanvas.remove(tempLine.current);
        }

        if (props.activeTool === Tool.TOOL_CABLE_LV || props.activeTool === Tool.TOOL_CABLE_HV || props.activeTool === Tool.TOOL_CABLE_DATA) {
          tempLine.current = new Polyline(
            points.map(p => new FabricPoint(p.x, p.y)),
            {
              stroke: getCableColor(props.activeTool),
              strokeWidth: 2,
              fill: 'transparent',
              selectable: false,
            }
          );
        } else if (props.activeTool === Tool.TOOL_CONTAINMENT_TRAY || props.activeTool === Tool.TOOL_CONTAINMENT_TRUNKING || props.activeTool === Tool.TOOL_CONTAINMENT_CONDUIT) {
          const style = getContainmentStyle(props.activeTool);
          tempLine.current = new Polyline(
            points.map(p => new FabricPoint(p.x, p.y)),
            {
              stroke: style.color,
              strokeWidth: 4,
              strokeDashArray: style.dash,
              fill: 'transparent',
              selectable: false,
            }
          );
        }

        if (tempLine.current) {
          fabricCanvas.add(tempLine.current);
        }
        fabricCanvas.renderAll();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && drawingPoints.current.length > 1) {
        // Finalize line drawing
        if (props.activeTool === Tool.TOOL_CABLE_LV || props.activeTool === Tool.TOOL_CABLE_HV || props.activeTool === Tool.TOOL_CABLE_DATA) {
          const length = calculatePolylineLength(drawingPoints.current, props.scaleInfo?.metersPerPixel || 1);
          props.onCableDrawn([...drawingPoints.current], length);
        } else if (props.activeTool === Tool.TOOL_CONTAINMENT_TRAY || props.activeTool === Tool.TOOL_CONTAINMENT_TRUNKING || props.activeTool === Tool.TOOL_CONTAINMENT_CONDUIT) {
          const length = calculatePolylineLength(drawingPoints.current, props.scaleInfo?.metersPerPixel || 1);
          const type = props.activeTool === Tool.TOOL_CONTAINMENT_TRAY ? 'tray' : 
                      props.activeTool === Tool.TOOL_CONTAINMENT_TRUNKING ? 'trunking' : 'conduit';
          props.onContainmentDrawn(type as ContainmentType, [...drawingPoints.current], length);
        }
        
        drawingPoints.current = [];
        if (tempLine.current) {
          fabricCanvas.remove(tempLine.current);
          tempLine.current = null;
        }
        fabricCanvas.renderAll();
      } else if (e.key === 'Escape') {
        // Cancel drawing
        drawingPoints.current = [];
        if (tempLine.current) {
          fabricCanvas.remove(tempLine.current);
          tempLine.current = null;
        }
        fabricCanvas.renderAll();
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricCanvas, props, currentEquipmentType]);

  // Render all elements
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear non-background objects
    fabricCanvas.getObjects().forEach(obj => {
      if (obj !== tempLine.current) {
        fabricCanvas.remove(obj);
      }
    });

    // Render equipment
    props.equipment.forEach(eq => {
      const circle = new Circle({
        left: eq.x,
        top: eq.y,
        radius: 15,
        fill: '#FF6B6B',
        stroke: '#FFF',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
      });
      fabricCanvas.add(circle);

      if (eq.label) {
        const text = new IText(eq.label, {
          left: eq.x,
          top: eq.y + 20,
          fontSize: 12,
          fill: '#FFF',
          originX: 'center',
        });
        fabricCanvas.add(text);
      }
    });

    // Render lines
    props.lines.forEach(line => {
      const polyline = new Polyline(
        line.points.map(p => new FabricPoint(p.x, p.y)),
        {
          stroke: getCableColor(line.type),
          strokeWidth: 2,
          fill: 'transparent',
        }
      );
      fabricCanvas.add(polyline);
    });

    // Render zones
    props.zones.forEach((zone, idx) => {
      const polygon = new Polygon(
        zone.points.map(p => new FabricPoint(p.x, p.y)),
        {
          fill: getZoneColor(idx),
          stroke: '#FFD93D',
          strokeWidth: 2,
          opacity: 0.5,
        }
      );
      fabricCanvas.add(polygon);

      if (zone.label) {
        const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
        const text = new IText(zone.label, {
          left: centerX,
          top: centerY,
          fontSize: 14,
          fill: '#FFF',
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(text);
      }
    });

    // Render containment
    props.containment.forEach(cont => {
      const style = getContainmentStyle(cont.type);
      const polyline = new Polyline(
        cont.points.map(p => new FabricPoint(p.x, p.y)),
        {
          stroke: style.color,
          strokeWidth: 4,
          strokeDashArray: style.dash,
          fill: 'transparent',
        }
      );
      fabricCanvas.add(polyline);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, props.equipment, props.lines, props.zones, props.containment]);

  return (
    <div className="flex-1 relative bg-background">
      <canvas ref={canvasRef} />
      {props.activeTool !== Tool.SELECT && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-lg">
          <p className="text-sm text-muted-foreground">
            {drawingPoints.current.length > 0 && 'Press Enter to finish, Esc to cancel'}
            {drawingPoints.current.length === 0 && 'Click to place points'}
          </p>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
