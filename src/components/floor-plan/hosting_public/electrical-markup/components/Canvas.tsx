
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import { Tool, type ViewState, type Point, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, EquipmentType, type Containment, ContainmentType, PVPanelConfig, RoofMask, PVArrayItem, PanelOrientation, Task } from '../types';
import { type PurposeConfig } from '../purpose.config';
import { TOOL_COLORS, EQUIPMENT_REAL_WORLD_SIZES, CONTAINMENT_COLORS } from '../constants';
import { getZoneColor } from '../utils/styleUtils';
import { PVArrayConfig } from './PVArrayModal';
import { findSnap, isPointInPolygon } from '../utils/geometry';
import { renderMarkupsToContext, drawPvArray, drawEquipmentIcon } from '../utils/drawing';


export interface CanvasHandles {
  getCanvases: () => {
    pdf: HTMLCanvasElement | null;
    drawing: HTMLCanvasElement | null;
  };
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
  scaleInfo: ScaleInfo;
  onScalingComplete: (line: {start: Point, end: Point}) => void;
  onLvLineComplete: (line: { points: Point[], length: number }) => void;
  onContainmentDrawComplete: (line: { points: Point[], length: number; type: ContainmentType; }) => void;
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
}

const Canvas = forwardRef<CanvasHandles, CanvasProps>(({
  pdfDoc, activeTool, viewState, setViewState,
  equipment, setEquipment, lines, setLines, zones, setZones, containment, setContainment,
  scaleInfo, onScalingComplete, onLvLineComplete, onContainmentDrawComplete, scaleLine, onInitialViewCalculated,
  selectedItemId, setSelectedItemId, placementRotation, purposeConfig,
  pvPanelConfig, roofMasks, pvArrays, setPvArrays, onRoofMaskDrawComplete, pendingPvArrayConfig, onPlacePvArray, isSnappingEnabled,
  pendingRoofMask, onRoofDirectionSet, onCancelRoofCreation, tasks
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasesWrapperRef = useRef<HTMLDivElement>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [draggedHandle, setDraggedHandle] = useState<{zoneId: string, pointIndex: number} | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [previewEquipment, setPreviewEquipment] = useState<{type: EquipmentType, position: Point, rotation: number} | null>(null);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isOverHandle, setIsOverHandle] = useState(false);
  // Snapping state
  const [previewPvArray, setPreviewPvArray] = useState<PVArrayItem | null>(null);
  const [snapLines, setSnapLines] = useState<{start: Point, end: Point}[]>([]);

  // State for drawing roof direction
  const [directionLine, setDirectionLine] = useState<Point[]>([]);
  const [directionDrawStep, setDirectionDrawStep] = useState(1);


  useImperativeHandle(ref, () => ({
    getCanvases: () => ({
      pdf: pdfCanvasRef.current,
      drawing: drawingCanvasRef.current,
    }),
  }));

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
    
    // Render all saved items
    if (scaleInfo.ratio) {
        renderMarkupsToContext(ctx, {
            equipment, lines, zones, containment, scaleInfo, roofMasks,
            pvPanelConfig, pvArrays, zoom: viewState.zoom, selectedItemId, tasks,
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
        
        // Draw dashed preview part
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
    
    if (scaleLine) {
        ctx.beginPath();
        ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
        ctx.lineTo(scaleLine.end.x, scaleLine.end.y);
        ctx.strokeStyle = TOOL_COLORS.SCALE;
        ctx.lineWidth = 4 / viewState.zoom;
        ctx.stroke();
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
  }, [viewState, equipment, lines, zones, containment, roofMasks, pvArrays, isDrawingShape, currentDrawing, activeTool, scaleLine, previewPoint, selectedItemId, previewEquipment, purposeConfig, scaleInfo, pvPanelConfig, pendingPvArrayConfig, placementRotation, snapLines, previewPvArray, pendingRoofMask, directionLine, tasks]);

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
                    else if ([Tool.LINE_MV, Tool.LINE_DC].includes(activeTool)) {
                        const type = activeTool === Tool.LINE_MV ? 'mv' : 'dc';
                        setLines(prev => [...prev, { id: `line-${Date.now()}`, type, points: currentDrawing, length: lineLength, name: `${type.toUpperCase()} line` }]);
                    } else if(purposeConfig.toolToContainmentMap[activeTool]) {
                        onContainmentDrawComplete({ points: currentDrawing, length: lineLength, type: purposeConfig.toolToContainmentMap[activeTool]! });
                    }
                    resetDrawingState();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawingShape, activeTool, currentDrawing, onRoofMaskDrawComplete, completeZoneDrawing, onLvLineComplete, onContainmentDrawComplete, purposeConfig, scaleInfo.ratio, setLines, resetDrawingState, onCancelRoofCreation]);


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
        
        setSelectedItemId(null);
        return;
    }
    
    if (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig) {
        const finalPosition = previewPvArray ? previewPvArray.position : worldPos;
        onPlacePvArray({
            position: finalPosition,
            rotation: placementRotation,
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

        setIsDrawingShape(true);
        setCurrentDrawing(prev => [...prev, worldPos]);
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
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);

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
        setIsOverHandle(overHandle);
    } else if (isOverHandle) {
        setIsOverHandle(false);
    }

    if (isPanning) {
        const dx = mousePos.x - lastMousePos.x;
        const dy = mousePos.y - lastMousePos.y;
        setViewState(prev => ({ ...prev, offset: { x: prev.offset.x + dx, y: prev.offset.y + dy } }));
    } else if (isDraggingItem && selectedItemId) {
        const commitChange = false; // Do not create history entries for every mouse move
        if (draggedHandle) {
            setZones(prevZones => prevZones.map(zone => {
                if (zone.id === draggedHandle.zoneId) {
                    const newPoints = [...zone.points];
                    newPoints[draggedHandle.pointIndex] = worldPos;
                    return { ...zone, points: newPoints, area: calculatePolygonArea(newPoints) };
                }
                return zone;
            }), commitChange);
        } else {
            const lastWorldPos = toWorld(lastMousePos);
            const dx = worldPos.x - lastWorldPos.x;
            const dy = worldPos.y - lastWorldPos.y;

            if (zones.some(z => z.id === selectedItemId)) {
                setZones(prev => prev.map(zone => {
                    if (zone.id === selectedItemId) {
                        const newPoints = zone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                        return { ...zone, points: newPoints };
                    }
                    return zone;
                }), commitChange);
            } else if (equipment.some(eq => eq.id === selectedItemId)) {
                 setEquipment(prev => prev.map(item => item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item), commitChange);
            } else if (pvArrays.some(arr => arr.id === selectedItemId)) {
                setPvArrays(prev => prev.map(item => item.id === selectedItemId ? { ...item, position: { x: item.position.x + dx, y: item.position.y + dy } } : item), commitChange);
            }
        }
    } else if (isDrawingShape && currentDrawing.length > 0) {
        setPreviewPoint(worldPos);
    } else if (activeTool === Tool.TOOL_ROOF_DIRECTION && directionLine.length > 0) {
        setPreviewPoint(worldPos);
    }
    
    if (activeTool === Tool.TOOL_PV_ARRAY && pendingPvArrayConfig && pvPanelConfig && scaleInfo.ratio) {
        const arrayToPlaceConfig = { ...pendingPvArrayConfig, rotation: placementRotation };
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

    setLastMousePos(mousePos);
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
      return;
    }
    
    if (isDraggingItem) {
        // Commit the final state of the drag to history
        const finalUpdater = (s: any) => s; // Identity function, state is already updated
        if (zones.some(z => z.id === selectedItemId)) setZones(finalUpdater, true);
        else if (equipment.some(eq => eq.id === selectedItemId)) setEquipment(finalUpdater, true);
        else if (pvArrays.some(arr => arr.id === selectedItemId)) setPvArrays(finalUpdater, true);
    }

    setIsPanning(false);
    setIsDraggingItem(false);
    setDraggedHandle(null);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsDraggingItem(false);
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
      if (isDraggingItem) return 'grabbing';
      if (isOverHandle) return 'move';
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
            style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `translate(0px, 0px) scale(1)`,
                transformOrigin: 'top left'
            }}
        >
            <canvas ref={pdfCanvasRef} className="absolute top-0 left-0" style={{ transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`, transformOrigin: 'top left' }}/>
            <canvas ref={drawingCanvasRef} width={containerRef.current?.clientWidth} height={containerRef.current?.clientHeight} className="absolute top-0 left-0" />
        </div>
    </div>
  );
});

export default Canvas;
