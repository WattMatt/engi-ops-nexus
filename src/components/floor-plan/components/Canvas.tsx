
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import { Tool, type ViewState, type Point, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, EquipmentType, type Containment, type Walkway, ContainmentType, PVPanelConfig, RoofMask, PVArrayItem, PanelOrientation, Task } from '../types';
import { type PurposeConfig } from '../purpose.config';
import { TOOL_COLORS, EQUIPMENT_REAL_WORLD_SIZES, CONTAINMENT_COLORS } from '../constants';
import { getZoneColor } from '../utils/styleUtils';
import { PVArrayConfig } from './PVArrayModal';
import { findSnap, findWalkwaySnap, isPointInPolygon, isPointNearPolyline, calculateArrayRotationForRoof } from '../utils/geometry';
import { renderMarkupsToContext, drawPvArray, drawEquipmentIcon } from '../utils/drawing';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useThrottledCallback } from '../hooks/useThrottledCallback';


export interface CanvasHandles {
  getCanvases: () => {
    pdf: HTMLCanvasElement | null;
    drawing: HTMLCanvasElement | null;
  };
  jumpToZone: (zone: SupplyZone) => void;
}

interface CanvasProps {
  pdfDoc: PDFDocumentProxy;
  activeTool: Tool;
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  equipment: EquipmentItem[];
  setEquipment: (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit?: boolean) => void;
  lines: SupplyLine[];
  setLines: (updater: (prev: SupplyLine[]) => SupplyLine[], commit?: boolean) => void;
  zones: SupplyZone[];
  setZones: (updater: (prev: SupplyZone[]) => SupplyZone[], commit?: boolean) => void;
  containment: Containment[];
  setContainment: (updater: (prev: Containment[]) => Containment[], commit?: boolean) => void;
  walkways: Walkway[];
  setWalkways: (updater: (prev: Walkway[]) => Walkway[], commit?: boolean) => void;
  scaleInfo: ScaleInfo;
  onScaleLabelPositionChange: (position: Point | null) => void;
  onScalingComplete: (line: {start: Point, end: Point}) => void;
  onLvLineComplete: (line: { points: Point[], length: number }) => void;
  onCircuitCableComplete: (line: { points: Point[], length: number }) => void;
  onContainmentDrawComplete: (line: { points: Point[], length: number; type: ContainmentType; }) => void;
  onWalkwayDrawComplete: (line: { points: Point[], length: number; }) => void;
  scaleLine: {start: Point, end: Point} | null;
  onInitialViewCalculated: (vs: ViewState) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  placementRotation: number;
  purposeConfig: PurposeConfig;
  // PV Props
  pvPanelConfig: PVPanelConfig | null;
  roofMasks: RoofMask[];
  pvArrays: PVArrayItem[];
  setPvArrays: (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit?: boolean) => void;
  onRoofMaskDrawComplete: (points: Point[]) => void;
  pendingPvArrayConfig: PVArrayConfig | null;
  onPlacePvArray: (array: Omit<PVArrayItem, 'id'>) => void;
  isSnappingEnabled: boolean;
  pendingRoofMask: { points: Point[], pitch?: number } | null;
  onRoofDirectionSet: (direction: number) => void;
  onCancelRoofCreation: () => void;
  tasks: Task[];
  // Circuit assignment props
  onEquipmentPlaced?: (equipmentType: string) => void;
  selectedCircuit?: { id: string; circuit_ref: string } | null;
  circuitAssignments?: Map<string, { circuitRef: string; color: string }>;
}

const Canvas = forwardRef<CanvasHandles, CanvasProps>(({
  pdfDoc, activeTool, viewState, setViewState,
  equipment, setEquipment, lines, setLines, zones, setZones, containment, setContainment, walkways, setWalkways,
  scaleInfo, onScaleLabelPositionChange, onScalingComplete, onLvLineComplete, onCircuitCableComplete, onContainmentDrawComplete, onWalkwayDrawComplete, scaleLine, onInitialViewCalculated,
  selectedItemId, setSelectedItemId, placementRotation, purposeConfig,
  pvPanelConfig, roofMasks, pvArrays, setPvArrays, onRoofMaskDrawComplete, pendingPvArrayConfig, onPlacePvArray, isSnappingEnabled,
  pendingRoofMask, onRoofDirectionSet, onCancelRoofCreation, tasks,
  onEquipmentPlaced, selectedCircuit, circuitAssignments
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasesWrapperRef = useRef<HTMLDivElement>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [draggedHandle, setDraggedHandle] = useState<{zoneId?: string, lineId?: string, containmentId?: string, pointIndex: number} | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [previewEquipment, setPreviewEquipment] = useState<{type: EquipmentType, position: Point, rotation: number} | null>(null);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isOverHandle, setIsOverHandle] = useState(false);
  const [isDraggingScaleLabel, setIsDraggingScaleLabel] = useState(false);
  const [isOverScaleLabel, setIsOverScaleLabel] = useState(false);
  const [scaleLabelSize, setScaleLabelSize] = useState<{width: number, height: number} | null>(null);
  const [resizingScaleLabel, setResizingScaleLabel] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{width: number, height: number} | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<Point | null>(null);
  // Snapping state
  const [previewPvArray, setPreviewPvArray] = useState<PVArrayItem | null>(null);
  const [snapLines, setSnapLines] = useState<{start: Point, end: Point}[]>([]);

  // State for drawing roof direction
  const [directionLine, setDirectionLine] = useState<Point[]>([]);
  const [directionDrawStep, setDirectionDrawStep] = useState(1);

  // Optimistic state for smooth dragging
  const [optimisticEquipment, setOptimisticEquipment] = useState<EquipmentItem[]>(equipment);
  const [optimisticPvArrays, setOptimisticPvArrays] = useState<PVArrayItem[]>(pvArrays);
  const [optimisticZones, setOptimisticZones] = useState<SupplyZone[]>(zones);
  const [optimisticLines, setOptimisticLines] = useState<SupplyLine[]>(lines);
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);


  useImperativeHandle(ref, () => ({
    getCanvases: () => ({
      pdf: pdfCanvasRef.current,
      drawing: drawingCanvasRef.current,
    }),
    jumpToZone: (zone: SupplyZone) => {
      if (!containerRef.current) return;
      
      // Calculate bounding box of the zone
      const minX = Math.min(...zone.points.map(p => p.x));
      const maxX = Math.max(...zone.points.map(p => p.x));
      const minY = Math.min(...zone.points.map(p => p.y));
      const maxY = Math.max(...zone.points.map(p => p.y));
      
      const zoneWidth = maxX - minX;
      const zoneHeight = maxY - minY;
      const zoneCenterX = (minX + maxX) / 2;
      const zoneCenterY = (minY + maxY) / 2;
      
      // Get container dimensions
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      // Calculate zoom to fit zone with some padding (80% of viewport)
      const zoomX = (containerWidth * 0.8) / zoneWidth;
      const zoomY = (containerHeight * 0.8) / zoneHeight;
      const targetZoom = Math.min(zoomX, zoomY, 3); // Cap at 3x zoom
      
      // Calculate offset to center the zone
      const targetOffsetX = containerWidth / 2 - zoneCenterX * targetZoom;
      const targetOffsetY = containerHeight / 2 - zoneCenterY * targetZoom;
      
      // Animate to the target position
      setViewState({
        zoom: targetZoom,
        offset: { x: targetOffsetX, y: targetOffsetY }
      });
    },
  }), []);

  // Sync optimistic state with props
  useEffect(() => {
    if (!isDraggingItem) {
      setOptimisticEquipment(equipment);
      setOptimisticPvArrays(pvArrays);
      setOptimisticZones(zones);
      setOptimisticLines(lines);
    }
  }, [equipment, pvArrays, zones, lines, isDraggingItem]);

  // Commit optimistic updates with debouncing
  const commitDragUpdate = useDebouncedCallback(() => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
  }, 100);

  const resetDrawingState = useCallback(() => {
    setIsDrawingShape(false);
    setCurrentDrawing([]);
    setPreviewPoint(null);
    setDirectionLine([]);
    setDirectionDrawStep(1);
  }, []);

  useEffect(() => {
    resetDrawingState();
    setPreviewEquipment(null);
    setIsDraggingItem(false);
    setDraggedHandle(null);
    setPreviewPvArray(null);
    setSnapLines([]);
  }, [activeTool, resetDrawingState]);

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

  const calculatePolygonArea = (vertices: Point[]): number => {
    if (!scaleInfo.ratio) return 0;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    const pixelArea = Math.abs(area / 2);
    return pixelArea * Math.pow(scaleInfo.ratio, 2);
  };

  const completeZoneDrawing = useCallback((points: Point[]) => {
      const newZone: SupplyZone = {
          id: `zone-${Date.now()}`,
          name: `Zone ${zones.length + 1}`,
          points: points,
          color: getZoneColor(zones.length),
          area: calculatePolygonArea(points),
      };
      setZones(prev => [...prev, newZone]);
      resetDrawingState();
  }, [zones.length, setZones, resetDrawingState, scaleInfo.ratio]);

  const draw = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.zoom, viewState.zoom);
    
    // Render all saved items (use optimistic state when dragging for smooth updates)
    if (scaleInfo.ratio) {
        renderMarkupsToContext(ctx, {
            equipment: isDraggingItem ? optimisticEquipment : equipment, 
            lines: isDraggingItem ? optimisticLines : lines, 
            zones: isDraggingItem ? optimisticZones : zones, 
            containment, 
            walkways, 
            scaleInfo, 
            roofMasks,
            pvPanelConfig, 
            pvArrays: isDraggingItem ? optimisticPvArrays : pvArrays, 
            zoom: viewState.zoom, 
            selectedItemId, 
            tasks,
        });
    }

    // Highlight pending roof mask
    if (activeTool === Tool.TOOL_ROOF_DIRECTION && pendingRoofMask) {
        ctx.beginPath();
        pendingRoofMask.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(148, 112, 216, 0.5)';
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.fill();
        ctx.stroke();
    }
    
    // Draw current drawing (polyline) & preview
    if (isDrawingShape && currentDrawing.length > 0) {
        const isPolygon = [Tool.ZONE, Tool.TOOL_ROOF_MASK].includes(activeTool);
        
        // Draw semi-transparent fill for polygons
        if (isPolygon && currentDrawing.length > 1 && previewPoint) {
            const polygonToDraw = [...currentDrawing, previewPoint];
            ctx.beginPath();
            polygonToDraw.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
            
            let fillStyle = 'rgba(255, 255, 255, 0.2)';
            if (activeTool === Tool.ZONE) fillStyle = `${getZoneColor(zones.length)}33`; // Append 20% alpha
            if (activeTool === Tool.TOOL_ROOF_MASK) fillStyle = TOOL_COLORS.ROOF_MASK;
            
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        let strokeStyle = '#ffffff'; // Default
        if (activeTool === Tool.SCALE) {
            strokeStyle = TOOL_COLORS.SCALE;
        } else if (activeTool === Tool.LINE_MV) {
            strokeStyle = TOOL_COLORS.LINE_MV;
        } else if (activeTool === Tool.LINE_LV) {
            strokeStyle = TOOL_COLORS.LINE_LV;
        } else if (activeTool === Tool.LINE_DC) {
            strokeStyle = TOOL_COLORS.LINE_DC;
        } else if (purposeConfig.toolToContainmentMap[activeTool]) {
            const containmentType = purposeConfig.toolToContainmentMap[activeTool]!;
            strokeStyle = CONTAINMENT_COLORS[containmentType];
        } else if (activeTool === Tool.TOOL_ROOF_MASK) {
            strokeStyle = '#000000';
        }


        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 2 / viewState.zoom;

        // Draw solid part of the line/polygon
        ctx.beginPath();
        currentDrawing.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.setLineDash([]);
        ctx.stroke();

        // Draw nodes for non-polygon tools
        if (!isPolygon) {
            ctx.fillStyle = strokeStyle;
            currentDrawing.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4 / viewState.zoom, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        
        // Draw dashed preview part with dynamic length indicator
        if (previewPoint) {
            ctx.setLineDash([5 / viewState.zoom, 5 / viewState.zoom]);
            ctx.beginPath();
            ctx.moveTo(currentDrawing[currentDrawing.length - 1].x, currentDrawing[currentDrawing.length - 1].y);
            ctx.lineTo(previewPoint.x, previewPoint.y);
            ctx.stroke();
            if (isPolygon) {
                ctx.beginPath();
                ctx.moveTo(previewPoint.x, previewPoint.y);
                ctx.lineTo(currentDrawing[0].x, currentDrawing[0].y);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Draw dynamic length indicator for line-based tools (containment, cables)
            if (!isPolygon && scaleInfo.ratio) {
                // Calculate total length including preview segment
                let totalLength = 0;
                for (let i = 1; i < currentDrawing.length; i++) {
                    const dx = currentDrawing[i].x - currentDrawing[i - 1].x;
                    const dy = currentDrawing[i].y - currentDrawing[i - 1].y;
                    totalLength += Math.sqrt(dx * dx + dy * dy);
                }
                // Add preview segment length
                const lastPoint = currentDrawing[currentDrawing.length - 1];
                const previewDx = previewPoint.x - lastPoint.x;
                const previewDy = previewPoint.y - lastPoint.y;
                const previewSegmentLength = Math.sqrt(previewDx * previewDx + previewDy * previewDy);
                totalLength += previewSegmentLength;
                
                // Convert to meters
                const lengthInMeters = totalLength * scaleInfo.ratio;
                
                // Draw length label near the preview point
                const fontSize = 12 / viewState.zoom;
                const labelText = `${lengthInMeters.toFixed(2)}m`;
                
                ctx.font = `bold ${fontSize}px sans-serif`;
                const textMetrics = ctx.measureText(labelText);
                const padding = 4 / viewState.zoom;
                const labelWidth = textMetrics.width + padding * 2;
                const labelHeight = fontSize + padding * 2;
                
                // Position label above the preview point
                const labelX = previewPoint.x - labelWidth / 2;
                const labelY = previewPoint.y - labelHeight - 8 / viewState.zoom;
                
                // Draw background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
                
                // Draw border matching the line color
                ctx.strokeStyle = strokeStyle;
                ctx.lineWidth = 1 / viewState.zoom;
                ctx.setLineDash([]);
                ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
                
                // Draw text
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, previewPoint.x, labelY + labelHeight / 2);
            }
        }
    }

    // Draw direction line for roof mask
    if (activeTool === Tool.TOOL_ROOF_DIRECTION && directionLine.length > 0) {
        ctx.strokeStyle = '#fde047'; // yellow-300
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.setLineDash([6 / viewState.zoom, 3 / viewState.zoom]);
        ctx.beginPath();
        ctx.moveTo(directionLine[0].x, directionLine[0].y);
        if (previewPoint) {
            ctx.lineTo(previewPoint.x, previewPoint.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Draw scale reference line with labels (enhanced architectural dimension style)
    if (scaleLine && scaleInfo.ratio) {
        const lineLength = Math.hypot(
            scaleLine.end.x - scaleLine.start.x,
            scaleLine.end.y - scaleLine.start.y
        );
        const realWorldLength = lineLength * scaleInfo.ratio;

        // Calculate angle and perpendicular for dimension ticks
        const angle = Math.atan2(scaleLine.end.y - scaleLine.start.y, scaleLine.end.x - scaleLine.start.x);
        const perpAngle = angle + Math.PI / 2;
        const tickLength = 15 / viewState.zoom;

        // Draw glow effect
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15 / viewState.zoom;
        
        // Draw the main line (thicker and brighter)
        ctx.beginPath();
        ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
        ctx.lineTo(scaleLine.end.x, scaleLine.end.y);
        ctx.strokeStyle = '#ffff00'; // Bright yellow
        ctx.lineWidth = 5 / viewState.zoom;
        ctx.stroke();
        
        // Draw dimension ticks at endpoints (perpendicular lines)
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / viewState.zoom;
        
        // Start tick
        ctx.beginPath();
        ctx.moveTo(
            scaleLine.start.x - Math.cos(perpAngle) * tickLength,
            scaleLine.start.y - Math.sin(perpAngle) * tickLength
        );
        ctx.lineTo(
            scaleLine.start.x + Math.cos(perpAngle) * tickLength,
            scaleLine.start.y + Math.sin(perpAngle) * tickLength
        );
        ctx.stroke();
        
        // End tick
        ctx.beginPath();
        ctx.moveTo(
            scaleLine.end.x - Math.cos(perpAngle) * tickLength,
            scaleLine.end.y - Math.sin(perpAngle) * tickLength
        );
        ctx.lineTo(
            scaleLine.end.x + Math.cos(perpAngle) * tickLength,
            scaleLine.end.y + Math.sin(perpAngle) * tickLength
        );
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw endpoint circles
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(scaleLine.start.x, scaleLine.start.y, 8 / viewState.zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(scaleLine.end.x, scaleLine.end.y, 8 / viewState.zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw label with enhanced styling
        // Use custom label position if set, otherwise calculate midpoint
        const defaultMidX = (scaleLine.start.x + scaleLine.end.x) / 2;
        const defaultMidY = (scaleLine.start.y + scaleLine.end.y) / 2;
        const labelX = scaleInfo.labelPosition?.x ?? defaultMidX;
        const labelY = scaleInfo.labelPosition?.y ?? defaultMidY;
        
        const fontSize = 12; // Fixed size in PDF coordinates - will scale with zoom
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw label with scale info and pixel/ratio details
        const label = `${realWorldLength.toFixed(2)}m`;
        const scaleRatio = `(1:${(1 / scaleInfo.ratio).toFixed(0)})`;
        const metrics = ctx.measureText(label);
        const scaleMetrics = ctx.measureText(scaleRatio);
        const maxWidth = Math.max(metrics.width, scaleMetrics.width);
        const padding = 8;
        const boxHeight = (fontSize * 2.5) + padding * 2;
        
        // Use custom size if set, otherwise use calculated size
        const boxWidth = scaleLabelSize?.width ?? (maxWidth + padding * 2);
        const finalBoxHeight = scaleLabelSize?.height ?? boxHeight;
        
        // Draw white background with black border (highlight if hovering)
        ctx.fillStyle = isOverScaleLabel ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isOverScaleLabel ? '#3B82F6' : '#000000'; // Blue border on hover
        ctx.lineWidth = isOverScaleLabel ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(
            labelX - boxWidth / 2,
            labelY - finalBoxHeight / 2,
            boxWidth,
            finalBoxHeight,
            4
        );
        ctx.fill();
        ctx.stroke();
        
        // Draw resize handles in corners
        if (isOverScaleLabel || resizingScaleLabel) {
          const handleSize = 8 / viewState.zoom;
          const corners = [
            { x: labelX - boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'nw' },
            { x: labelX + boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'ne' },
            { x: labelX - boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'sw' },
            { x: labelX + boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'se' },
          ];
          
          ctx.fillStyle = '#3B82F6';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 / viewState.zoom;
          corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, handleSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          });
        }
        
        // Draw main label text (distance)
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(label, labelX, labelY - fontSize * 0.4);
        
        // Draw scale ratio text (smaller)
        ctx.font = `${fontSize * 0.7}px sans-serif`;
        ctx.fillStyle = '#666666';
        ctx.fillText(scaleRatio, labelX, labelY + fontSize * 0.6);
    }
    
    // Draw Snap lines
    if (snapLines.length > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; // light-blue-400
        ctx.lineWidth = 1 / viewState.zoom;
        ctx.setLineDash([4 / viewState.zoom, 2 / viewState.zoom]);
        snapLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            ctx.stroke();
        });
        ctx.setLineDash([]);
    }

    // Draw equipment or PV Array placement preview
    if (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig && previewPvArray && pvPanelConfig && scaleInfo.ratio) {
        drawPvArray(ctx, previewPvArray, true, pvPanelConfig, scaleInfo, roofMasks, viewState.zoom);
    } else if (previewEquipment) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        drawEquipmentIcon(ctx, previewEquipment, false, viewState.zoom, scaleInfo);
        ctx.restore();
    }

    ctx.restore();
  }, [viewState, equipment, lines, zones, containment, roofMasks, pvArrays, isDrawingShape, currentDrawing, activeTool, scaleLine, previewPoint, selectedItemId, previewEquipment, purposeConfig, scaleInfo, pvPanelConfig, pendingPvArrayConfig, placementRotation, snapLines, previewPvArray, pendingRoofMask, directionLine, tasks, isOverScaleLabel]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const renderPdf = async () => {
      if (!pdfDoc || !pdfCanvasRef.current || !containerRef.current) return;
      const page = await pdfDoc.getPage(1);
      const renderScale = 2.0;
      const viewport: PageViewport = page.getViewport({ scale: renderScale });
      const pdfCanvas = pdfCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      if (drawingCanvas) {
        drawingCanvas.width = viewport.width;
        drawingCanvas.height = viewport.height;
      }
      setCanvasSize({ width: viewport.width, height: viewport.height });
      const context = pdfCanvas.getContext('2d');
      if (!context) return;
      // @ts-ignore - The pdfjs-dist types can be misaligned with the mjs build, causing a spurious error.
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const initialZoom = Math.min(containerWidth / viewport.width, containerHeight / viewport.height) * 0.95;
      const initialOffsetX = (containerWidth - viewport.width * initialZoom) / 2;
      const initialOffsetY = (containerHeight - viewport.height * initialZoom) / 2;
      onInitialViewCalculated({ zoom: initialZoom, offset: { x: initialOffsetX, y: initialOffsetY } });
    };
    renderPdf();
  }, [pdfDoc, onInitialViewCalculated]);
  
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const drawingIsActive = isDrawingShape && currentDrawing.length > 0;
            const directionIsActive = activeTool === Tool.TOOL_ROOF_DIRECTION;

            if (!drawingIsActive && !directionIsActive) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                if (directionIsActive) {
                    onCancelRoofCreation();
                }
                resetDrawingState();
            }

            if (e.key === 'Enter' && drawingIsActive && currentDrawing.length >= 2) {
                e.preventDefault();
                if (activeTool === Tool.TOOL_ROOF_MASK) {
                    onRoofMaskDrawComplete(currentDrawing);
                    resetDrawingState();
                } else if (activeTool === Tool.ZONE) {
                    completeZoneDrawing(currentDrawing);
                } else { // It's a line/containment tool
                    const lineLength = currentDrawing.reduce((acc, p, i, arr) => {
                        if (i > 0) acc += Math.hypot(p.x - arr[i-1].x, p.y - arr[i-1].y);
                        return acc;
                    }, 0) * (scaleInfo.ratio || 1);
                    
                    if (activeTool === Tool.LINE_LV) onLvLineComplete({ points: currentDrawing, length: lineLength });
                    else if (activeTool === Tool.CIRCUIT_CABLE) onCircuitCableComplete({ points: currentDrawing, length: lineLength });
                    else if ([Tool.LINE_MV, Tool.LINE_DC].includes(activeTool)) {
                        const type = activeTool === Tool.LINE_MV ? 'mv' : 'dc';
                        setLines(prev => [...prev, { id: `line-${Date.now()}`, type, points: currentDrawing, length: lineLength, name: `${type.toUpperCase()} line` }]);
                    } else if (activeTool === Tool.TOOL_WALKWAY) {
                        onWalkwayDrawComplete({ points: currentDrawing, length: lineLength });
                    } else if(purposeConfig.toolToContainmentMap[activeTool]) {
                        onContainmentDrawComplete({ points: currentDrawing, length: lineLength, type: purposeConfig.toolToContainmentMap[activeTool]! });
                    }
                    resetDrawingState();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawingShape, activeTool, currentDrawing, onRoofMaskDrawComplete, completeZoneDrawing, onLvLineComplete, onCircuitCableComplete, onWalkwayDrawComplete, onContainmentDrawComplete, purposeConfig, scaleInfo.ratio, setLines, resetDrawingState, onCancelRoofCreation]);


  const handleMouseDown = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    setLastMousePos(mousePos);
    if (e.button === 1) { setIsPanning(true); e.preventDefault(); return; }
    const worldPos = toWorld(mousePos);

    if (activeTool === Tool.PAN) {
        setIsPanning(true);
        return;
    }

    if (activeTool === Tool.TOOL_ROOF_DIRECTION) {
        if (pendingRoofMask && isPointInPolygon(worldPos, pendingRoofMask.points)) {
            if (directionLine.length === 0) {
                setDirectionLine([worldPos]);
                setDirectionDrawStep(2);
            } else {
                const highPoint = directionLine[0];
                const lowPoint = worldPos;
                const dx = lowPoint.x - highPoint.x;
                const dy = lowPoint.y - highPoint.y;
                const direction = (Math.atan2(dy, dx) * (180 / Math.PI) + 450) % 360;
                
                onRoofDirectionSet(direction);
                resetDrawingState();
            }
        } else if (pendingRoofMask) {
            alert("Please draw the direction line inside the selected roof mask.");
        }
        return;
    }

    if (activeTool === Tool.SCALE) {
      if (!isDrawingShape) {
        setIsDrawingShape(true);
        setCurrentDrawing([worldPos]);
      } else {
        onScalingComplete({ start: currentDrawing[0], end: worldPos });
        resetDrawingState();
      }
      return;
    }

    if (activeTool === Tool.SELECT) {
        // Check if clicking on scale label or resize handles
        if (scaleLine && scaleInfo.ratio && scaleInfo.labelPosition) {
            const defaultMidX = (scaleLine.start.x + scaleLine.end.x) / 2;
            const defaultMidY = (scaleLine.start.y + scaleLine.end.y) / 2;
            const labelX = scaleInfo.labelPosition?.x ?? defaultMidX;
            const labelY = scaleInfo.labelPosition?.y ?? defaultMidY;
            
            // Calculate actual box dimensions
            const fontSize = 12;
            const padding = 8;
            const label = `${(Math.hypot(scaleLine.end.x - scaleLine.start.x, scaleLine.end.y - scaleLine.start.y) * scaleInfo.ratio).toFixed(2)}m`;
            const scaleRatio = `(1:${(1 / scaleInfo.ratio).toFixed(0)})`;
            
            // Create a temporary canvas to measure text
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.font = `bold ${fontSize}px sans-serif`;
                const metrics = tempCtx.measureText(label);
                tempCtx.font = `${fontSize * 0.7}px sans-serif`;
                const scaleMetrics = tempCtx.measureText(scaleRatio);
                const maxWidth = Math.max(metrics.width, scaleMetrics.width);
                const boxHeight = (fontSize * 2.5) + padding * 2;
                
                const boxWidth = scaleLabelSize?.width ?? (maxWidth + padding * 2);
                const finalBoxHeight = scaleLabelSize?.height ?? boxHeight;
                
                // Check resize handles first
                const handleRadius = 8 / viewState.zoom;
                const corners = [
                  { x: labelX - boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'nw' as const },
                  { x: labelX + boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'ne' as const },
                  { x: labelX - boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'sw' as const },
                  { x: labelX + boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'se' as const },
                ];
                
                for (const corner of corners) {
                  const dist = Math.hypot(worldPos.x - corner.x, worldPos.y - corner.y);
                  if (dist <= handleRadius) {
                    setResizingScaleLabel(corner.type);
                    setResizeStartPos(worldPos);
                    setResizeStartSize({ width: boxWidth, height: finalBoxHeight });
                    return;
                  }
                }
                
                // Check if clicked within label bounds
                if (worldPos.x >= labelX - boxWidth / 2 &&
                    worldPos.x <= labelX + boxWidth / 2 &&
                    worldPos.y >= labelY - finalBoxHeight / 2 &&
                    worldPos.y <= labelY + finalBoxHeight / 2) {
                    setIsDraggingScaleLabel(true);
                    if (containerRef.current) {
                      containerRef.current.style.cursor = 'grabbing';
                    }
                    return;
                }
            }
        }
    
        if (selectedItemId) {
            const selectedZone = zones.find(z => z.id === selectedItemId);
            if (selectedZone) {
                for (let i = 0; i < selectedZone.points.length; i++) {
                    const point = selectedZone.points[i];
                    const handleRadius = 7 / viewState.zoom;
                    if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                        setIsDraggingItem(true);
                        setDraggedHandle({ zoneId: selectedZone.id, pointIndex: i });
                        return;
                    }
                }
            }
            
            // Check if clicked on a cable point handle
            const selectedLine = lines.find(l => l.id === selectedItemId);
            if (selectedLine) {
                for (let i = 0; i < selectedLine.points.length; i++) {
                    const point = selectedLine.points[i];
                    const handleRadius = 7 / viewState.zoom;
                    if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                        setIsDraggingItem(true);
                        setDraggedHandle({ lineId: selectedLine.id, pointIndex: i });
                        return;
                    }
                }
            }
            
            // Check if clicked on a containment point handle
            const selectedContainment = containment.find(c => c.id === selectedItemId);
            if (selectedContainment) {
                for (let i = 0; i < selectedContainment.points.length; i++) {
                    const point = selectedContainment.points[i];
                    const handleRadius = 7 / viewState.zoom;
                    if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                        setIsDraggingItem(true);
                        setDraggedHandle({ containmentId: selectedContainment.id, pointIndex: i });
                        return;
                    }
                }
            }
        }

        const clickedEquipmentOrArray = [...equipment, ...pvArrays].reverse().find(item => {
            if ('type' in item) {
                const realSize = EQUIPMENT_REAL_WORLD_SIZES[item.type as EquipmentType] || 0.5;
                const size = scaleInfo.ratio ? realSize / scaleInfo.ratio : 12 / viewState.zoom * 2;
                return Math.hypot(worldPos.x - item.position.x, worldPos.y - item.position.y) < size / 2;
            } else {
                if (!pvPanelConfig || !scaleInfo.ratio) return false;
                const panelIsOnMask = roofMasks.find(mask => isPointInPolygon(item.position, mask.points));
                const pitchRad = (panelIsOnMask ? panelIsOnMask.pitch : 0) * Math.PI / 180;
                let panelW_px = (pvPanelConfig.width / scaleInfo.ratio);
                let panelL_px = (pvPanelConfig.length / scaleInfo.ratio) * Math.cos(pitchRad);
                const totalWidth = item.columns * (item.orientation === 'portrait' ? panelW_px : panelL_px);
                const totalHeight = item.rows * (item.orientation === 'portrait' ? panelL_px : panelW_px);
                const dx = worldPos.x - item.position.x;
                const dy = worldPos.y - item.position.y;
                const angleRad = -item.rotation * Math.PI / 180;
                const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
                const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
                return Math.abs(localX) < totalWidth / 2 && Math.abs(localY) < totalHeight / 2;
            }
        });

        if (clickedEquipmentOrArray) {
            setSelectedItemId(clickedEquipmentOrArray.id);
            setIsDraggingItem(true);
            return;
        }

        const clickedZone = zones.slice().reverse().find(zone => isPointInPolygon(worldPos, zone.points));
        if (clickedZone) {
            setSelectedItemId(clickedZone.id);
            setIsDraggingItem(true);
            return;
        }
        
        // Check if clicked on a cable/line
        const CLICK_THRESHOLD = 10 / viewState.zoom; // 10 pixels in world units
        const clickedLine = lines.slice().reverse().find(line => 
            isPointNearPolyline(worldPos, line.points, CLICK_THRESHOLD)
        );
        if (clickedLine) {
            setSelectedItemId(clickedLine.id);
            return;
        }
        
        // Check if clicked on containment (conduits, cable trays, etc.)
        const clickedContainment = containment.slice().reverse().find(item => 
            isPointNearPolyline(worldPos, item.points, CLICK_THRESHOLD)
        );
        if (clickedContainment) {
            setSelectedItemId(clickedContainment.id);
            return;
        }
        
        setSelectedItemId(null);
        return;
    }
    
    if (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig) {
        const finalPosition = previewPvArray ? previewPvArray.position : worldPos;
        // Calculate rotation to be perpendicular to roof direction if on a roof
        const calculatedRotation = calculateArrayRotationForRoof(finalPosition, roofMasks, placementRotation);
        onPlacePvArray({
            position: finalPosition,
            rotation: calculatedRotation,
            ...pendingPvArrayConfig
        });
        return;
    }
    
    const isDrawingTool = purposeConfig.availableDrawingTools.includes(activeTool);
    if (isDrawingTool) {
        if (activeTool !== Tool.ZONE && activeTool !== Tool.TOOL_ROOF_MASK && !scaleInfo.ratio) {
            alert("Please set the scale before drawing.");
            return;
        }

        if (isDrawingShape && currentDrawing.length > 2) {
            const firstPoint = currentDrawing[0];
            const distToStart = Math.hypot(worldPos.x - firstPoint.x, worldPos.y - firstPoint.y);
            if (distToStart < 10 / viewState.zoom) {
                if (activeTool === Tool.ZONE) {
                    completeZoneDrawing(currentDrawing);
                } else if (activeTool === Tool.TOOL_ROOF_MASK) {
                    onRoofMaskDrawComplete(currentDrawing);
                    resetDrawingState();
                }
                return;
            }
        }

        // Check for snap to PV arrays for walkways
        let finalPos = worldPos;
        if (activeTool === Tool.TOOL_WALKWAY) {
            const snapResult = findWalkwaySnap(worldPos, pvArrays, pvPanelConfig, roofMasks, scaleInfo, viewState.zoom);
            if (snapResult) {
                finalPos = snapResult.snappedPosition;
            }
        }

        setIsDrawingShape(true);
        setCurrentDrawing(prev => [...prev, finalPos]);
        return;
    }

    const equipmentType = (Object.keys(purposeConfig.equipmentToToolMap) as EquipmentType[]).find(
        key => purposeConfig.equipmentToToolMap[key] === activeTool
    );
    if (equipmentType) {
        if (!scaleInfo.ratio) {
            alert("Please set the scale before placing equipment.");
            return;
        }
        setEquipment(prev => [...prev, { id: `eq-${Date.now()}`, type: equipmentType, position: worldPos, rotation: placementRotation }]);
        // Call the equipment placement callback for auto-assignment
        if (onEquipmentPlaced) {
            onEquipmentPlaced(equipmentType);
        }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);
    
    // Handle scale label resizing
    if (resizingScaleLabel && resizeStartPos && resizeStartSize && scaleInfo.labelPosition && scaleLine) {
      const dx = worldPos.x - resizeStartPos.x;
      const dy = worldPos.y - resizeStartPos.y;
      
      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      
      switch (resizingScaleLabel) {
        case 'se':
          newWidth = Math.max(50, resizeStartSize.width + dx);
          newHeight = Math.max(30, resizeStartSize.height + dy);
          break;
        case 'sw':
          newWidth = Math.max(50, resizeStartSize.width - dx);
          newHeight = Math.max(30, resizeStartSize.height + dy);
          break;
        case 'ne':
          newWidth = Math.max(50, resizeStartSize.width + dx);
          newHeight = Math.max(30, resizeStartSize.height - dy);
          break;
        case 'nw':
          newWidth = Math.max(50, resizeStartSize.width - dx);
          newHeight = Math.max(30, resizeStartSize.height - dy);
          break;
      }
      
      setScaleLabelSize({ width: newWidth, height: newHeight });
      return;
    }

    // Check if hovering over scale label (for cursor feedback)
    if (activeTool === Tool.SELECT && scaleLine && scaleInfo.ratio && !isDraggingScaleLabel && !resizingScaleLabel) {
        const defaultMidX = (scaleLine.start.x + scaleLine.end.x) / 2;
        const defaultMidY = (scaleLine.start.y + scaleLine.end.y) / 2;
        const labelX = scaleInfo.labelPosition?.x ?? defaultMidX;
        const labelY = scaleInfo.labelPosition?.y ?? defaultMidY;
        
        const fontSize = 12;
        const label = `${(Math.hypot(scaleLine.end.x - scaleLine.start.x, scaleLine.end.y - scaleLine.start.y) * scaleInfo.ratio).toFixed(2)}m`;
        const scaleRatio = `(1:${(1 / scaleInfo.ratio).toFixed(0)})`;
        
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.font = `bold ${fontSize}px sans-serif`;
          const metrics = ctx.measureText(label);
          ctx.font = `${fontSize * 0.7}px sans-serif`;
          const scaleMetrics = ctx.measureText(scaleRatio);
          const maxWidth = Math.max(metrics.width, scaleMetrics.width);
          const padding = 8;
          const boxHeight = (fontSize * 2.5) + padding * 2;
          
          const boxWidth = scaleLabelSize?.width ?? (maxWidth + padding * 2);
          const finalBoxHeight = scaleLabelSize?.height ?? boxHeight;
          
          const overLabel = 
            worldPos.x >= labelX - boxWidth / 2 &&
            worldPos.x <= labelX + boxWidth / 2 &&
            worldPos.y >= labelY - finalBoxHeight / 2 &&
            worldPos.y <= labelY + finalBoxHeight / 2;
          
          setIsOverScaleLabel(overLabel);
          
          // Check if hovering over resize handles
          const handleRadius = 8 / viewState.zoom;
          const corners = [
            { x: labelX - boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'nw' as const },
            { x: labelX + boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'ne' as const },
            { x: labelX - boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'sw' as const },
            { x: labelX + boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'se' as const },
          ];
          
          let overHandle = false;
          for (const corner of corners) {
            const dist = Math.hypot(worldPos.x - corner.x, worldPos.y - corner.y);
            if (dist <= handleRadius) {
              overHandle = true;
              // Set cursor based on corner
              if (containerRef.current) {
                const cursors = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };
                containerRef.current.style.cursor = cursors[corner.type];
              }
              break;
            }
          }
          
          if (!overHandle && containerRef.current && overLabel) {
            containerRef.current.style.cursor = 'move';
          } else if (!overHandle && !overLabel && containerRef.current) {
            containerRef.current.style.cursor = 'default';
          }
        }
    } else if (isOverScaleLabel) {
        setIsOverScaleLabel(false);
    }

    if (activeTool === Tool.SELECT && selectedItemId && !isDraggingItem) {
        const selectedZone = zones.find(z => z.id === selectedItemId);
        let overHandle = false;
        if (selectedZone) {
            for (let i = 0; i < selectedZone.points.length; i++) {
                const point = selectedZone.points[i];
                const handleRadius = 7 / viewState.zoom;
                if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                    overHandle = true;
                    break;
                }
            }
        }
        
        // Check if over a cable point handle
        if (!overHandle) {
            const selectedLine = lines.find(l => l.id === selectedItemId);
            if (selectedLine) {
                for (let i = 0; i < selectedLine.points.length; i++) {
                    const point = selectedLine.points[i];
                    const handleRadius = 7 / viewState.zoom;
                    if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                        overHandle = true;
                        break;
                    }
                }
            }
        }
        
        // Check if over a containment point handle
        if (!overHandle) {
            const selectedContainment = containment.find(c => c.id === selectedItemId);
            if (selectedContainment) {
                for (let i = 0; i < selectedContainment.points.length; i++) {
                    const point = selectedContainment.points[i];
                    const handleRadius = 7 / viewState.zoom;
                    if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
                        overHandle = true;
                        break;
                    }
                }
            }
        }
        
        setIsOverHandle(overHandle);
    } else if (isOverHandle) {
        setIsOverHandle(false);
    }

    if (isPanning) {
        const dx = mousePos.x - lastMousePos.x;
        const dy = mousePos.y - lastMousePos.y;
        setViewState(prev => ({ ...prev, offset: { x: prev.offset.x + dx, y: prev.offset.y + dy } }));
    } else if (isDraggingScaleLabel && scaleInfo.labelPosition && scaleLine) {
        const lastWorldPos = toWorld(lastMousePos);
        const dx = worldPos.x - lastWorldPos.x;
        const dy = worldPos.y - lastWorldPos.y;
        onScaleLabelPositionChange({
            x: scaleInfo.labelPosition.x + dx,
            y: scaleInfo.labelPosition.y + dy
        });
    } else if (isDraggingItem && selectedItemId) {
        // Use optimistic updates for immediate visual feedback
        if (draggedHandle) {
            // Dragging a zone handle
            if (draggedHandle.zoneId) {
                setOptimisticZones(prevZones => prevZones.map(zone => {
                    if (zone.id === draggedHandle.zoneId) {
                        const newPoints = [...zone.points];
                        newPoints[draggedHandle.pointIndex] = worldPos;
                        return { ...zone, points: newPoints, area: calculatePolygonArea(newPoints) };
                    }
                    return zone;
                }));
                
                // Debounced commit to actual state
                if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
                pendingUpdateRef.current = setTimeout(() => {
                    setZones(prevZones => prevZones.map(zone => {
                        if (zone.id === draggedHandle.zoneId) {
                            const newPoints = [...zone.points];
                            newPoints[draggedHandle.pointIndex] = worldPos;
                            return { ...zone, points: newPoints, area: calculatePolygonArea(newPoints) };
                        }
                        return zone;
                    }), false);
                }, 16); // ~60fps
            }
            // Dragging a cable handle
            else if (draggedHandle.lineId) {
                setOptimisticLines(prevLines => prevLines.map(line => {
                    if (line.id === draggedHandle.lineId) {
                        const newPoints = [...line.points];
                        newPoints[draggedHandle.pointIndex] = worldPos;
                        
                        // Recalculate the cable length
                        let totalLength = 0;
                        for (let i = 0; i < newPoints.length - 1; i++) {
                            const p1 = newPoints[i];
                            const p2 = newPoints[i + 1];
                            totalLength += Math.hypot(p2.x - p1.x, p2.y - p1.y);
                        }
                        
                        const lengthInMeters = scaleInfo.ratio ? totalLength * scaleInfo.ratio : totalLength;
                        const pathLength = lengthInMeters;
                        const totalLengthWithRiseDrop = pathLength + (line.startHeight || 0) + (line.endHeight || 0);
                        
                        return { 
                            ...line, 
                            points: newPoints, 
                            pathLength: pathLength,
                            length: totalLengthWithRiseDrop
                        };
                    }
                    return line;
                }));
                
                // Debounced commit
                if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
                pendingUpdateRef.current = setTimeout(() => {
                    setLines(prevLines => prevLines.map(line => {
                        if (line.id === draggedHandle.lineId) {
                            const newPoints = [...line.points];
                            newPoints[draggedHandle.pointIndex] = worldPos;
                            
                            let totalLength = 0;
                            for (let i = 0; i < newPoints.length - 1; i++) {
                                const p1 = newPoints[i];
                                const p2 = newPoints[i + 1];
                                totalLength += Math.hypot(p2.x - p1.x, p2.y - p1.y);
                            }
                            
                            const lengthInMeters = scaleInfo.ratio ? totalLength * scaleInfo.ratio : totalLength;
                            const pathLength = lengthInMeters;
                            const totalLengthWithRiseDrop = pathLength + (line.startHeight || 0) + (line.endHeight || 0);
                            
                            return { 
                                ...line, 
                                points: newPoints, 
                                pathLength: pathLength,
                                length: totalLengthWithRiseDrop
                            };
                        }
                        return line;
                    }), false);
                }, 16);
            }
            // Dragging a containment handle
            else if (draggedHandle.containmentId) {
                setContainment(prevContainment => prevContainment.map(item => {
                    if (item.id === draggedHandle.containmentId) {
                        const newPoints = [...item.points];
                        newPoints[draggedHandle.pointIndex] = worldPos;
                        
                        // Recalculate length
                        let totalLength = 0;
                        for (let i = 0; i < newPoints.length - 1; i++) {
                            const p1 = newPoints[i];
                            const p2 = newPoints[i + 1];
                            totalLength += Math.hypot(p2.x - p1.x, p2.y - p1.y);
                        }
                        const lengthInMeters = scaleInfo.ratio ? totalLength * scaleInfo.ratio : totalLength;
                        
                        return { 
                            ...item, 
                            points: newPoints, 
                            length: lengthInMeters
                        };
                    }
                    return item;
                }), false);
            }
        } else {
            const lastWorldPos = toWorld(lastMousePos);
            const dx = worldPos.x - lastWorldPos.x;
            const dy = worldPos.y - lastWorldPos.y;

            if (optimisticZones.some(z => z.id === selectedItemId)) {
                setOptimisticZones(prev => prev.map(zone => {
                    if (zone.id === selectedItemId) {
                        const newPoints = zone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                        return { ...zone, points: newPoints };
                    }
                    return zone;
                }));
                
                if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
                pendingUpdateRef.current = setTimeout(() => {
                    setZones(prev => prev.map(zone => {
                        if (zone.id === selectedItemId) {
                            const newPoints = zone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                            return { ...zone, points: newPoints };
                        }
                        return zone;
                    }), false);
                }, 16);
            } else if (optimisticEquipment.some(eq => eq.id === selectedItemId)) {
                setOptimisticEquipment(prev => prev.map(item => 
                    item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item
                ));
                
                if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
                pendingUpdateRef.current = setTimeout(() => {
                    setEquipment(prev => prev.map(item => 
                        item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item
                    ), false);
                }, 16);
            } else if (optimisticPvArrays.some(arr => arr.id === selectedItemId)) {
                setOptimisticPvArrays(prev => prev.map(item => 
                    item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item
                ));
                
                if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
                pendingUpdateRef.current = setTimeout(() => {
                    setPvArrays(prev => prev.map(item => 
                        item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item
                    ), false);
                }, 16);
            }
        }
    } else if (isDrawingShape && currentDrawing.length > 0) {
        // Check for snap to PV arrays for walkways
        let finalPreviewPos = worldPos;
        if (activeTool === Tool.TOOL_WALKWAY) {
            const snapResult = findWalkwaySnap(worldPos, pvArrays, pvPanelConfig, roofMasks, scaleInfo, viewState.zoom);
            if (snapResult) {
                finalPreviewPos = snapResult.snappedPosition;
                setSnapLines(snapResult.snapLines);
            } else if (snapLines.length > 0) {
                setSnapLines([]);
            }
        }
        setPreviewPoint(finalPreviewPos);
    } else if (activeTool === Tool.TOOL_ROOF_DIRECTION && directionLine.length > 0) {
        setPreviewPoint(worldPos);
    } else if (previewPoint) {
        setPreviewPoint(null);
        if (snapLines.length > 0) {
            setSnapLines([]);
        }
    }
    
    if (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig && pvPanelConfig && scaleInfo.ratio) {
        // Calculate rotation to be perpendicular to roof direction if on a roof
        const calculatedRotation = calculateArrayRotationForRoof(worldPos, roofMasks, placementRotation);
        const arrayToPlaceConfig = { ...pendingPvArrayConfig, rotation: calculatedRotation };
        if (isSnappingEnabled) {
            const snapResult = findSnap(
                worldPos, arrayToPlaceConfig, pvArrays, 
                pvPanelConfig, roofMasks, scaleInfo, viewState.zoom
            );

            if (snapResult) {
                setPreviewPvArray({ id: 'preview', ...arrayToPlaceConfig, position: snapResult.snappedPosition });
                setSnapLines(snapResult.snapLines);
            } else {
                setPreviewPvArray({ id: 'preview', ...arrayToPlaceConfig, position: worldPos });
                setSnapLines([]);
            }
        } else {
             setPreviewPvArray({ id: 'preview', ...arrayToPlaceConfig, position: worldPos });
             setSnapLines([]);
        }
        setPreviewEquipment(null);
    }
    else {
        const equipmentType = (Object.keys(purposeConfig.equipmentToToolMap) as EquipmentType[]).find(key => purposeConfig.equipmentToToolMap[key] === activeTool);
        if (equipmentType && scaleInfo.ratio) {
            setPreviewEquipment({ type: equipmentType, position: worldPos, rotation: placementRotation });
        } else {
            setPreviewEquipment(null);
        }
        setPreviewPvArray(null);
        setSnapLines([]);
    }

    // Check if hovering over scale label or resize handles
    if (scaleLine && scaleInfo.labelPosition && scaleInfo.ratio) {
      const defaultMidX = (scaleLine.start.x + scaleLine.end.x) / 2;
      const defaultMidY = (scaleLine.start.y + scaleLine.end.y) / 2;
      const labelX = scaleInfo.labelPosition?.x ?? defaultMidX;
      const labelY = scaleInfo.labelPosition?.y ?? defaultMidY;
      
      const fontSize = 12;
      const label = `${(Math.hypot(scaleLine.end.x - scaleLine.start.x, scaleLine.end.y - scaleLine.start.y) * scaleInfo.ratio).toFixed(2)}m`;
      const scaleRatio = `(1:${(1 / scaleInfo.ratio).toFixed(0)})`;
      
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.font = `bold ${fontSize}px sans-serif`;
        const metrics = ctx.measureText(label);
        ctx.font = `${fontSize * 0.7}px sans-serif`;
        const scaleMetrics = ctx.measureText(scaleRatio);
        const maxWidth = Math.max(metrics.width, scaleMetrics.width);
        const padding = 8;
        const boxHeight = (fontSize * 2.5) + padding * 2;
        
        const boxWidth = scaleLabelSize?.width ?? (maxWidth + padding * 2);
        const finalBoxHeight = scaleLabelSize?.height ?? boxHeight;
        
        const isHovering = 
          worldPos.x >= labelX - boxWidth / 2 &&
          worldPos.x <= labelX + boxWidth / 2 &&
          worldPos.y >= labelY - finalBoxHeight / 2 &&
          worldPos.y <= labelY + finalBoxHeight / 2;
        
        setIsOverScaleLabel(isHovering);
        
        // Check if hovering over resize handles
        if (!isDraggingScaleLabel && !resizingScaleLabel) {
          const handleRadius = 8 / viewState.zoom;
          const corners = [
            { x: labelX - boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'nw' as const },
            { x: labelX + boxWidth / 2, y: labelY - finalBoxHeight / 2, type: 'ne' as const },
            { x: labelX - boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'sw' as const },
            { x: labelX + boxWidth / 2, y: labelY + finalBoxHeight / 2, type: 'se' as const },
          ];
          
          let overHandle = false;
          for (const corner of corners) {
            const dist = Math.hypot(worldPos.x - corner.x, worldPos.y - corner.y);
            if (dist <= handleRadius) {
              overHandle = true;
              // Set cursor based on corner
              if (containerRef.current) {
                const cursors = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };
                containerRef.current.style.cursor = cursors[corner.type];
              }
              break;
            }
          }
          
          if (!overHandle && containerRef.current && isHovering) {
            containerRef.current.style.cursor = 'move';
          }
        }
      }
    } else {
      setIsOverScaleLabel(false);
    }

    setLastMousePos(mousePos);
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
      return;
    }
    
    if (isDraggingScaleLabel) {
        setIsDraggingScaleLabel(false);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
        return;
    }
    
    if (resizingScaleLabel) {
        setResizingScaleLabel(null);
        setResizeStartPos(null);
        setResizeStartSize(null);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
        return;
    }
    
    if (isDraggingItem) {
        // Clear pending debounced update
        if (pendingUpdateRef.current) {
            clearTimeout(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
        }
        
        // Commit the final state of the drag to history with optimistic values
        if (optimisticZones.some(z => z.id === selectedItemId)) {
            setZones(() => optimisticZones, true);
        } else if (optimisticEquipment.some(eq => eq.id === selectedItemId)) {
            setEquipment(() => optimisticEquipment, true);
        } else if (optimisticPvArrays.some(arr => arr.id === selectedItemId)) {
            setPvArrays(() => optimisticPvArrays, true);
        } else if (optimisticLines.some(l => l.id === selectedItemId)) {
            setLines(() => optimisticLines, true);
        }
    }

    setIsPanning(false);
    setIsDraggingItem(false);
    setDraggedHandle(null);
  };

  const handleMouseLeave = () => {
    // Commit any pending updates before leaving
    if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
    }
    
    if (isDraggingItem) {
        // Commit optimistic state on leave
        if (optimisticZones.some(z => z.id === selectedItemId)) {
            setZones(() => optimisticZones, true);
        } else if (optimisticEquipment.some(eq => eq.id === selectedItemId)) {
            setEquipment(() => optimisticEquipment, true);
        } else if (optimisticPvArrays.some(arr => arr.id === selectedItemId)) {
            setPvArrays(() => optimisticPvArrays, true);
        } else if (optimisticLines.some(l => l.id === selectedItemId)) {
            setLines(() => optimisticLines, true);
        }
    }
    
    setIsPanning(false);
    setIsDraggingItem(false);
    setIsDraggingScaleLabel(false);
    setResizingScaleLabel(null);
    setResizeStartPos(null);
    setResizeStartSize(null);
    setDraggedHandle(null);
    setPreviewPoint(null);
    setPreviewEquipment(null);
    setPreviewPvArray(null);
    setSnapLines([]);
    setIsOverHandle(false);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    setViewState(prev => {
        const { zoom, offset } = prev;
        const newZoom = Math.max(0.1, Math.min(zoom * factor, 20));
        const worldX = (mousePos.x - offset.x) / zoom;
        const worldY = (mousePos.y - offset.y) / zoom;
        const newOffsetX = mousePos.x - worldX * newZoom;
        const newOffsetY = mousePos.y - worldY * newZoom;
        return { zoom: newZoom, offset: {x: newOffsetX, y: newOffsetY} };
    });
  };

  const getCursor = () => {
      if (isPanning) return 'grabbing';
      if (isDraggingItem || isDraggingScaleLabel) return 'grabbing';
      if (isOverHandle) return 'move';
      if (isOverScaleLabel) return 'move';
      if (activeTool === Tool.PAN) return 'grab';
      if (activeTool === Tool.SELECT) return 'default';
      const isPlacementTool = Object.values(purposeConfig.equipmentToToolMap).includes(activeTool);
      if(isPlacementTool || purposeConfig.availableDrawingTools.includes(activeTool) || (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig) || activeTool === Tool.TOOL_ROOF_DIRECTION){
          return 'crosshair';
      }
      return 'default';
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative overflow-hidden bg-gray-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: getCursor() }}
    >
        {isDrawingShape && [Tool.ZONE, Tool.TOOL_ROOF_MASK].includes(activeTool) && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-10 pointer-events-none animate-fade-in">
                Click to add points. Click the start point or press 'Enter' to finish. 'Esc' to cancel.
            </div>
        )}
        {activeTool === Tool.TOOL_ROOF_DIRECTION && (
             <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-10 pointer-events-none animate-fade-in">
                {directionDrawStep === 1 
                    ? "Click the HIGHEST point of the roof slope." 
                    : "Click the LOWEST point of the roof slope."}
                <span className="text-gray-400 ml-2">('Esc' to cancel)</span>
            </div>
        )}
        <div
            ref={canvasesWrapperRef}
            className="relative w-full h-full"
        >
            <canvas ref={pdfCanvasRef} className="absolute top-0 left-0" style={{ transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`, transformOrigin: 'top left' }}/>
            <canvas ref={drawingCanvasRef} width={containerRef.current?.clientWidth} height={containerRef.current?.clientHeight} className="absolute top-0 left-0" />
        </div>
    </div>
  );
});

export default Canvas;
