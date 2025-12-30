import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { EquipmentItem, SupplyLine, Containment, ScaleInfo, EquipmentType, ContainmentType } from '../types';
import { TOOL_COLORS, EQUIPMENT_REAL_WORLD_SIZES, CONTAINMENT_COLORS } from '../constants';

// Circuit type colors for visual distinction
const CIRCUIT_COLORS: Record<string, string> = {
  power: '#3b82f6',    // Blue
  lighting: '#22c55e', // Green
  data: '#f59e0b',     // Amber
  distribution: '#ef4444', // Red
  containment: '#8b5cf6', // Purple
  other: '#6b7280',    // Gray
};

// Equipment category mapping
const getEquipmentCategory = (type: EquipmentType): string => {
  const lightingTypes = [
    EquipmentType.GENERAL_LIGHT_SWITCH, EquipmentType.DIMMER_SWITCH,
    EquipmentType.TWO_WAY_LIGHT_SWITCH, EquipmentType.WATERTIGHT_LIGHT_SWITCH,
    EquipmentType.LED_STRIP_LIGHT, EquipmentType.FLUORESCENT_2_TUBE,
    EquipmentType.FLUORESCENT_1_TUBE, EquipmentType.CEILING_FLOODLIGHT,
    EquipmentType.CEILING_LIGHT, EquipmentType.POLE_MOUNTED_LIGHT,
    EquipmentType.WALL_MOUNTED_LIGHT, EquipmentType.RECESSED_LIGHT_600,
    EquipmentType.RECESSED_LIGHT_1200, EquipmentType.FLOODLIGHT,
    EquipmentType.PHOTO_CELL, EquipmentType.MOTION_SENSOR,
  ];
  
  const powerTypes = [
    EquipmentType.SOCKET_16A, EquipmentType.SOCKET_DOUBLE,
    EquipmentType.EMERGENCY_SOCKET, EquipmentType.UPS_SOCKET,
    EquipmentType.SINGLE_PHASE_OUTLET, EquipmentType.THREE_PHASE_OUTLET,
    EquipmentType.SOCKET_16A_TP, EquipmentType.GEYSER_OUTLET,
    EquipmentType.FLUSH_FLOOR_OUTLET, EquipmentType.BOX_FLUSH_FLOOR,
    EquipmentType.CLEAN_POWER_OUTLET, EquipmentType.WORKSTATION_OUTLET,
  ];
  
  const dataTypes = [
    EquipmentType.DATA_SOCKET, EquipmentType.TELEPHONE_OUTLET,
    EquipmentType.TV_OUTLET, EquipmentType.TELEPHONE_BOARD,
    EquipmentType.CCTV_CAMERA,
  ];
  
  const distributionTypes = [
    EquipmentType.DISTRIBUTION_BOARD, EquipmentType.MAIN_BOARD,
    EquipmentType.SUB_BOARD, EquipmentType.RMU,
    EquipmentType.SUBSTATION, EquipmentType.GENERATOR,
  ];
  
  if (lightingTypes.includes(type)) return 'lighting';
  if (powerTypes.includes(type)) return 'power';
  if (dataTypes.includes(type)) return 'data';
  if (distributionTypes.includes(type)) return 'distribution';
  return 'other';
};

interface DrawingSheet2DCanvasProps {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  containment: Containment[];
  scaleInfo: ScaleInfo;
  selectedItemId?: string | null;
  onItemSelect?: (id: string | null) => void;
  visibleCategories?: Set<string>;
}

export function DrawingSheet2DCanvas({
  equipment,
  lines,
  containment,
  scaleInfo,
  selectedItemId,
  onItemSelect,
  visibleCategories = new Set(['power', 'lighting', 'data', 'distribution', 'containment', 'other']),
}: DrawingSheet2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [viewState, setViewState] = useState({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Calculate bounds for auto-fit
  const bounds = useMemo(() => {
    const PADDING = 50; // pixels
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    equipment.forEach(item => {
      minX = Math.min(minX, item.position.x);
      maxX = Math.max(maxX, item.position.x);
      minY = Math.min(minY, item.position.y);
      maxY = Math.max(maxY, item.position.y);
    });
    
    containment.forEach(item => {
      item.points.forEach(pt => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      });
    });
    
    lines.forEach(line => {
      line.points.forEach(pt => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      });
    });
    
    if (!isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }
    
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
    };
  }, [equipment, containment, lines]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-fit view when content changes
  useEffect(() => {
    if (bounds.width > 0 && canvasSize.width > 0) {
      const scaleX = canvasSize.width / bounds.width;
      const scaleY = canvasSize.height / bounds.height;
      const zoom = Math.min(scaleX, scaleY, 2) * 0.9; // 90% to add some margin
      
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      setViewState({
        zoom,
        offset: {
          x: canvasSize.width / 2 - centerX * zoom,
          y: canvasSize.height / 2 - centerY * zoom,
        },
      });
    }
  }, [bounds, canvasSize]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewState(prev => ({
        ...prev,
        offset: {
          x: prev.offset.x + dx,
          y: prev.offset.y + dy,
        },
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, viewState.zoom * zoomFactor));
    
    const worldX = (mouseX - viewState.offset.x) / viewState.zoom;
    const worldY = (mouseY - viewState.offset.y) / viewState.zoom;
    
    setViewState({
      zoom: newZoom,
      offset: {
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom,
      },
    });
  }, [viewState]);

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const { zoom, offset } = viewState;
    
    // Clear canvas
    ctx.fillStyle = '#f8fafc'; // Light background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    
    // Grid
    const gridSize = 50;
    const startX = Math.floor(bounds.minX / gridSize) * gridSize;
    const startY = Math.floor(bounds.minY / gridSize) * gridSize;
    const endX = Math.ceil(bounds.maxX / gridSize) * gridSize;
    const endY = Math.ceil(bounds.maxY / gridSize) * gridSize;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 / zoom;
    
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
    
    // Draw containment
    if (visibleCategories.has('containment')) {
      containment.forEach(item => {
        if (item.points.length < 2) return;
        
        ctx.strokeStyle = CIRCUIT_COLORS.containment;
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([10 / zoom, 5 / zoom]);
        
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw label
        const midIdx = Math.floor(item.points.length / 2);
        const midPoint = item.points[midIdx];
        ctx.fillStyle = CIRCUIT_COLORS.containment;
        ctx.font = `${12 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${item.type} ${item.size}`, midPoint.x, midPoint.y - 8 / zoom);
      });
    }
    
    // Draw supply lines
    lines.forEach(line => {
      if (line.points.length < 2) return;
      
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2 / zoom;
      
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });
    
    // Draw equipment
    equipment.forEach(item => {
      const category = getEquipmentCategory(item.type);
      if (!visibleCategories.has(category)) return;
      
      const size = 20;
      const isSelected = item.id === selectedItemId;
      const color = CIRCUIT_COLORS[category] || CIRCUIT_COLORS.other;
      
      ctx.save();
      ctx.translate(item.position.x, item.position.y);
      if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
      
      // Draw equipment shape based on category
      if (category === 'distribution') {
        // Rectangle for distribution boards
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeStyle = isSelected ? '#fff' : '#000';
        ctx.lineWidth = isSelected ? 3 / zoom : 1 / zoom;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
      } else if (category === 'lighting') {
        // Circle with rays for lighting
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#000';
        ctx.lineWidth = isSelected ? 3 / zoom : 1 / zoom;
        ctx.stroke();
        
        // Rays
        const rayLen = size * 0.3;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / zoom;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * size / 2, Math.sin(angle) * size / 2);
          ctx.lineTo(Math.cos(angle) * (size / 2 + rayLen), Math.sin(angle) * (size / 2 + rayLen));
          ctx.stroke();
        }
      } else if (category === 'power') {
        // Double circle for power outlets
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(-size / 4, 0, size / 3, 0, Math.PI * 2);
        ctx.arc(size / 4, 0, size / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#000';
        ctx.lineWidth = isSelected ? 3 / zoom : 1 / zoom;
        ctx.stroke();
      } else if (category === 'data') {
        // Triangle for data
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#000';
        ctx.lineWidth = isSelected ? 3 / zoom : 1 / zoom;
        ctx.stroke();
      } else {
        // Default circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : '#000';
        ctx.lineWidth = isSelected ? 3 / zoom : 1 / zoom;
        ctx.stroke();
      }
      
      // Draw equipment name
      ctx.fillStyle = '#000';
      ctx.font = `bold ${10 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const shortName = item.name || item.type.slice(0, 3).toUpperCase();
      ctx.fillText(shortName, 0, size / 2 + 4 / zoom);
      
      ctx.restore();
    });
    
    ctx.restore();
    
    // Draw scale bar
    if (scaleInfo.ratio) {
      const scaleBarLength = 100;
      const realLength = scaleBarLength / scaleInfo.ratio;
      
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      
      const x = 20;
      const y = canvas.height - 30;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + scaleBarLength, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + scaleBarLength, y - 5);
      ctx.lineTo(x + scaleBarLength, y + 5);
      ctx.stroke();
      
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${realLength.toFixed(1)}m`, x + scaleBarLength / 2, y - 10);
      ctx.restore();
    }
    
  }, [equipment, lines, containment, viewState, canvasSize, bounds, scaleInfo, selectedItemId, visibleCategories]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Info overlay */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
        Zoom: {(viewState.zoom * 100).toFixed(0)}% • Scroll to zoom, drag to pan
      </div>
    </div>
  );
}
