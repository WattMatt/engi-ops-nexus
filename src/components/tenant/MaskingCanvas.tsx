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

interface Zone {
  id: string;
  points: Point[];
  color: string;
  tenantId?: string | null;
  tenantName?: string | null;
  category?: string | null;
}

interface MaskingCanvasProps {
  pdfDoc: PDFDocumentProxy | null;
  onScaleLineComplete?: (start: Point, end: Point) => void;
  isScaleMode: boolean;
  existingScale: number | null;
  scaleLine: { start: Point | null; end: Point | null };
  onScaleLineUpdate: (line: { start: Point | null; end: Point | null }) => void;
  isZoneMode: boolean;
  onZoneComplete?: (points: Point[]) => void;
  activeTool: 'select' | 'pan' | 'scale' | 'zone';
  projectId: string;
  onZoneSelected?: (zoneId: string, tenantId: string | null) => void;
  zones: Zone[];
  onZonesChange: (zones: Zone[]) => void;
}

export const MaskingCanvas = ({ 
  pdfDoc, 
  onScaleLineComplete,
  isScaleMode,
  existingScale,
  scaleLine,
  onScaleLineUpdate,
  isZoneMode,
  onZoneComplete,
  activeTool,
  projectId,
  onZoneSelected,
  zones,
  onZonesChange
}: MaskingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasesWrapperRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isDrawingScale, setIsDrawingScale] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [currentZoneDrawing, setCurrentZoneDrawing] = useState<Point[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [draggedHandle, setDraggedHandle] = useState<{zoneId: string, pointIndex: number} | null>(null);

  // Helper to check if tenant is complete
  const isTenantComplete = (tenantId: string, tenants: any[]): boolean => {
    const tenant = tenants.find((t: any) => t.id === tenantId);
    if (!tenant) return false;
    
    return !!(
      tenant.sow_received &&
      tenant.layout_received &&
      tenant.db_ordered &&
      tenant.lighting_ordered &&
      tenant.cost_reported &&
      tenant.area &&
      tenant.db_cost &&
      tenant.lighting_cost
    );
  };

  // Expose method to update zone with tenant info
  useEffect(() => {
    (window as any).updateZoneTenant = (zoneId: string, tenantId: string, tenantName: string, category: string, tenants: any[]) => {
      const isComplete = isTenantComplete(tenantId, tenants);
      const color = isComplete ? '#16A34A' : '#DC2626'; // Green-600 for complete, Red-600 for incomplete
      
      const updatedZones = zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            tenantId,
            tenantName,
            category,
            color
          };
        }
        return zone;
      });
      onZonesChange(updatedZones);
    };

    return () => {
      delete (window as any).updateZoneTenant;
    };
  }, [zones, onZonesChange]);

  // Expose function to get composite canvas with legend for preview generation
  useEffect(() => {
    (window as any).getCompositeCanvas = (tenants = []) => {
      const pdfCanvas = pdfCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      
      if (!pdfCanvas || !overlayCanvas) return null;
      
      const legendWidth = 350;
      const margin = 20;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = pdfCanvas.width + legendWidth + margin * 3;
      tempCanvas.height = Math.max(pdfCanvas.height, 800);
      
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;
      
      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw PDF background
      ctx.drawImage(pdfCanvas, margin, margin);
      
      // Draw zones directly (without transform)
      zones.forEach(zone => {
        ctx.save();
        ctx.translate(margin, margin);
        ctx.beginPath();
        zone.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = `${zone.color}40`; // 25% opacity
        ctx.fill();
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw tenant name if assigned
        if (zone.tenantName) {
          const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
          const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
          
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = 3;
          ctx.strokeText(zone.tenantName, centerX, centerY);
          ctx.fillText(zone.tenantName, centerX, centerY);
        }
        ctx.restore();
      });
      
      // Draw scale line on PDF if it exists
      if (existingScale && scaleLine.start && scaleLine.end) {
        ctx.save();
        ctx.translate(margin, margin);
        
        const angle = Math.atan2(scaleLine.end.y - scaleLine.start.y, scaleLine.end.x - scaleLine.start.x);
        const perpAngle = angle + Math.PI / 2;
        const tickLength = 15;
        
        // Draw main line
        ctx.beginPath();
        ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
        ctx.lineTo(scaleLine.end.x, scaleLine.end.y);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw ticks
        ctx.lineWidth = 3;
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
        
        // Draw endpoints
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(scaleLine.start.x, scaleLine.start.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(scaleLine.end.x, scaleLine.end.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw label
        const midX = (scaleLine.start.x + scaleLine.end.x) / 2;
        const midY = (scaleLine.start.y + scaleLine.end.y) / 2;
        const labelOffset = 25;
        const labelX = midX + Math.cos(perpAngle) * labelOffset;
        const labelY = midY + Math.sin(perpAngle) * labelOffset;
        
        const scaleText = `${existingScale.toFixed(2)} px/m`;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(scaleText);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(
          labelX - metrics.width / 2 - 6,
          labelY - 7 - 6,
          metrics.width + 12,
          14 + 12
        );
        
        ctx.fillStyle = '#ffff00';
        ctx.fillText(scaleText, labelX, labelY);
        
        ctx.restore();
      }
      
      // Draw legend
      const legendX = pdfCanvas.width + margin * 2;
      let legendY = margin + 10;

      // Legend title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Zone Legend', legendX, legendY);
      legendY += 40;

      // Helper to get tenant status
      const getTenantStatus = (tenantId: string) => {
        const tenant = tenants.find((t: any) => t.id === tenantId);
        if (!tenant) return { label: 'Unknown', color: '#6B7280' };

        const allComplete = tenant.sow_received && 
                           tenant.layout_received && 
                           tenant.db_ordered && 
                           tenant.lighting_ordered &&
                           tenant.cost_reported &&
                           tenant.area &&
                           tenant.db_cost &&
                           tenant.lighting_cost;

        return allComplete 
          ? { label: 'Complete', color: '#16A34A' }
          : { label: 'In Progress', color: '#DC2626' };
      };

      // Draw each assigned zone in the legend
      const assignedZones = zones.filter(z => z.tenantId && z.tenantName);
      
      assignedZones.forEach((zone, index) => {
        // Color box
        ctx.fillStyle = zone.color;
        ctx.fillRect(legendX, legendY - 14, 24, 24);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY - 14, 24, 24);

        // Tenant name
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(zone.tenantName || 'Unknown', legendX + 34, legendY);

        // Category badge
        if (zone.category) {
          const categoryLabels: Record<string, string> = {
            standard: "Standard",
            fast_food: "Fast Food",
            restaurant: "Restaurant",
            national: "National"
          };
          const categoryLabel = categoryLabels[zone.category] || zone.category;
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#666666';
          ctx.fillText(categoryLabel, legendX + 34, legendY + 16);
        }

        // Status indicator
        if (zone.tenantId) {
          const status = getTenantStatus(zone.tenantId);
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = status.color;
          
          // Draw status dot
          ctx.beginPath();
          ctx.arc(legendX + 34, legendY + 32, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw status text
          ctx.fillText(status.label, legendX + 44, legendY + 35);
        }

        legendY += 55;
      });

      // Unassigned zones count
      const unassignedCount = zones.length - assignedZones.length;
      if (unassignedCount > 0) {
        legendY += 10;
        ctx.font = '13px Arial';
        ctx.fillStyle = '#999999';
        ctx.fillText(
          `${unassignedCount} unassigned zone${unassignedCount !== 1 ? 's' : ''}`,
          legendX,
          legendY
        );
      }
      
      return tempCanvas;
    };

    return () => {
      delete (window as any).getCompositeCanvas;
    };
  }, [zones]);

  // Get zone color for unassigned zones (gray)
  const getZoneColor = (index: number): string => {
    return '#9ca3af'; // gray-400 for unassigned
  };

  // Check if a point is inside a polygon
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };


  // Render PDF to canvas
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || !containerRef.current) return;

    const renderPdf = async () => {
      const page = await pdfDoc.getPage(1);
      const renderScale = 2.0;
      const viewport = page.getViewport({ scale: renderScale });
      const pdfCanvas = pdfCanvasRef.current!;
      
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      
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

  // Reset zone drawing when switching tools
  useEffect(() => {
    if (!isZoneMode) {
      setIsDrawingZone(false);
      setCurrentZoneDrawing([]);
    }
  }, [isZoneMode]);

  // Draw overlay (scale line, etc.)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Draw completed zones
    zones.forEach(zone => {
      ctx.beginPath();
      zone.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = `${zone.color}40`; // 25% opacity
      ctx.fill();
      
      const isSelected = zone.id === selectedZoneId;
      ctx.strokeStyle = isSelected ? '#34D399' : zone.color; // Emerald-400 for selection
      ctx.lineWidth = (isSelected ? 3 : 2) / viewState.zoom;
      ctx.stroke();

      // Draw zone label (tenant name) at center - scales with zoom
      if (zone.tenantName) {
        const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
        
        // Smaller size to fit within zone boundaries
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 3;
        ctx.strokeText(zone.tenantName, centerX, centerY);
        ctx.fillText(zone.tenantName, centerX, centerY);
      }

      // Draw resize handles for selected zone
      if (isSelected) {
        zone.points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 / viewState.zoom, 0, 2 * Math.PI);
          ctx.fillStyle = '#34D399';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / viewState.zoom;
          ctx.stroke();
        });
      }
    });

    // Draw scale line (matching floor plan markup style)
    if (scaleLine.start) {
      const endPoint = scaleLine.end ?? scaleLine.start;
      
      // Calculate angle and perpendicular for dimension ticks
      const angle = Math.atan2(endPoint.y - scaleLine.start.y, endPoint.x - scaleLine.start.x);
      const perpAngle = angle + Math.PI / 2;
      const tickLength = 15 / viewState.zoom;

      // Draw the main line (thicker and bright yellow)
      ctx.beginPath();
      ctx.moveTo(scaleLine.start.x, scaleLine.start.y);
      ctx.lineTo(endPoint.x, endPoint.y);
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
      if (scaleLine.end) {
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
      }

      // Draw endpoints (filled circles with outline)
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(scaleLine.start.x, scaleLine.start.y, 8 / viewState.zoom, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.stroke();
      
      if (scaleLine.end) {
        ctx.beginPath();
        ctx.arc(scaleLine.end.x, scaleLine.end.y, 8 / viewState.zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      // Draw scale measurement label at midpoint (if scale is set)
      if (scaleLine.end && existingScale) {
        const midX = (scaleLine.start.x + scaleLine.end.x) / 2;
        const midY = (scaleLine.start.y + scaleLine.end.y) / 2;
        
        // Calculate offset perpendicular to line for label
        const labelOffset = 25 / viewState.zoom;
        const labelX = midX + Math.cos(perpAngle) * labelOffset;
        const labelY = midY + Math.sin(perpAngle) * labelOffset;
        
        const scaleText = `${existingScale.toFixed(2)} px/m`;
        
        // Draw text background
        ctx.font = `bold ${14 / viewState.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(scaleText);
        const textHeight = 14 / viewState.zoom;
        const padding = 6 / viewState.zoom;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(
          labelX - metrics.width / 2 - padding,
          labelY - textHeight / 2 - padding,
          metrics.width + padding * 2,
          textHeight + padding * 2
        );
        
        // Draw text
        ctx.fillStyle = '#ffff00';
        ctx.fillText(scaleText, labelX, labelY);
      }
    }

    // Draw zone polygon preview
    if (currentZoneDrawing.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentZoneDrawing[0].x, currentZoneDrawing[0].y);
      for (let i = 1; i < currentZoneDrawing.length; i++) {
        ctx.lineTo(currentZoneDrawing[i].x, currentZoneDrawing[i].y);
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3 / viewState.zoom;
      ctx.stroke();

      // Draw circles at each point
      currentZoneDrawing.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / viewState.zoom, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? '#10b981' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.stroke();
      });
    }

    ctx.restore();
  }, [viewState, scaleLine, currentZoneDrawing, zones, selectedZoneId, existingScale]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Handle keyboard events for zone drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoneMode && isDrawingZone) {
        if (e.key === 'Escape') {
          // Cancel drawing
          setIsDrawingZone(false);
          setCurrentZoneDrawing([]);
        } else if (e.key === 'Enter' && currentZoneDrawing.length >= 3) {
          // Complete the zone
          const newZone: Zone = {
            id: `zone-${Date.now()}`,
            points: currentZoneDrawing,
            color: getZoneColor(zones.length),
            tenantId: null,
            tenantName: null,
            category: null
          };
          onZonesChange([...zones, newZone]);
          
          if (onZoneComplete) {
            onZoneComplete(currentZoneDrawing);
          }
          setIsDrawingZone(false);
          setCurrentZoneDrawing([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoneMode, isDrawingZone, currentZoneDrawing, onZoneComplete]);

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
    setLastMousePos(mousePos);
    if (e.button === 1) { setIsPanning(true); e.preventDefault(); return; }
    const worldPos = toWorld(mousePos);

    if (activeTool === 'pan') {
      setIsPanning(true);
      return;
    }

    // Zone mode - drawing polygons
    if (isZoneMode) {
      setIsDrawingZone(true);
      
      // Check if clicking near the first point to close the polygon
      if (currentZoneDrawing.length >= 3) {
        const firstPoint = currentZoneDrawing[0];
        const distToStart = Math.hypot(worldPos.x - firstPoint.x, worldPos.y - firstPoint.y);
        if (distToStart < 10 / viewState.zoom) {
          // Close the polygon
          const newZone: Zone = {
            id: `zone-${Date.now()}`,
            points: currentZoneDrawing,
            color: getZoneColor(zones.length),
            tenantId: null,
            tenantName: null,
            category: null
          };
          onZonesChange([...zones, newZone]);
          
          if (onZoneComplete) {
            onZoneComplete(currentZoneDrawing);
          }
          setIsDrawingZone(false);
          setCurrentZoneDrawing([]);
          return;
        }
      }
      
      // Add point to current drawing
      setCurrentZoneDrawing(prev => [...prev, worldPos]);
      return;
    }

    // Select mode - check for zone selection and handle dragging
    if (activeTool === 'select' && !isScaleMode) {
      // First check if clicking on a handle of the selected zone
      if (selectedZoneId) {
        const selectedZone = zones.find(z => z.id === selectedZoneId);
        if (selectedZone) {
          for (let i = 0; i < selectedZone.points.length; i++) {
            const point = selectedZone.points[i];
            const handleRadius = 7 / viewState.zoom;
            if (Math.hypot(worldPos.x - point.x, worldPos.y - point.y) < handleRadius) {
              setIsDraggingZone(true);
              setDraggedHandle({ zoneId: selectedZone.id, pointIndex: i });
              return;
            }
          }
        }
      }

      // Check if clicking on a zone to select it
      const clickedZone = zones.slice().reverse().find(zone => isPointInPolygon(worldPos, zone.points));
      if (clickedZone) {
        setSelectedZoneId(clickedZone.id);
        setIsDraggingZone(true);
        
        // Notify parent about zone selection
        if (onZoneSelected) {
          onZoneSelected(clickedZone.id, clickedZone.tenantId || null);
        }
        return;
      }

      // Clicked on empty space - deselect
      setSelectedZoneId(null);
      return;
    }

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

  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);

    if (isScaleMode && isDrawingScale && scaleLine.start) {
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
    } else if (isDraggingZone && selectedZoneId) {
      // Dragging a zone handle or the whole zone
      if (draggedHandle) {
        // Dragging a specific point
        const updatedZones = zones.map(zone => {
          if (zone.id === draggedHandle.zoneId) {
            const newPoints = [...zone.points];
            newPoints[draggedHandle.pointIndex] = worldPos;
            return { ...zone, points: newPoints };
          }
          return zone;
        });
        onZonesChange(updatedZones);
      } else {
        // Dragging the whole zone
        const lastWorldPos = toWorld(lastMousePos);
        const dx = worldPos.x - lastWorldPos.x;
        const dy = worldPos.y - lastWorldPos.y;
        const updatedZones = zones.map(zone => {
          if (zone.id === selectedZoneId) {
            const newPoints = zone.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            return { ...zone, points: newPoints };
          }
          return zone;
        });
        onZonesChange(updatedZones);
      }
      setLastMousePos(mousePos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
      return;
    }
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingZone) {
      setIsDraggingZone(false);
      setDraggedHandle(null);
    }
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
      return { zoom: newZoom, offset: { x: newOffsetX, y: newOffsetY } };
    });
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
        cursor: isScaleMode ? 'crosshair' : isZoneMode ? 'crosshair' : (isPanning ? 'grabbing' : 'grab')
      }}
    >
      {isDrawingZone && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-10 pointer-events-none">
          Click to add points. Click the start point or press 'Enter' to finish. 'Esc' to cancel.
        </div>
      )}
      <div
        ref={canvasesWrapperRef}
        className="relative w-full h-full"
      >
        <canvas 
          ref={pdfCanvasRef} 
          className="absolute top-0 left-0" 
          style={{ 
            transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`, 
            transformOrigin: 'top left' 
          }}
        />
        <canvas 
          ref={overlayCanvasRef} 
          width={containerRef.current?.clientWidth} 
          height={containerRef.current?.clientHeight} 
          className="absolute top-0 left-0" 
        />
      </div>

      {existingScale && (
        <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-2 text-sm">
          Scale: {existingScale.toFixed(2)} px/m
        </div>
      )}
    </div>
  );
};

