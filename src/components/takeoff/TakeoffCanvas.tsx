/**
 * Takeoff Canvas: PDF drawing viewer with scale calibration,
 * point counting, linear measurement, and zone drawing tools.
 * Uses percentage-based coordinates for resolution independence.
 * 
 * PDF files are rendered via pdfjs-dist at dynamic DPI for crisp zoom.
 * Image files use standard <img> rendering.
 * 
 * Navigation:
 * - Mouse wheel: zoom in/out
 * - Left mouse button drag (select tool): pan
 * - Double-click scroll wheel: zoom extents (fit to view)
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Maximize, Move, RotateCcw, Loader2 } from 'lucide-react';
import type {
  TakeoffTool, TakeoffMeasurement, TakeoffZone, TakeoffCatalogItem,
  TakeoffAssembly, ScaleCalibration,
} from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { usePdfRenderer } from '@/hooks/usePdfRenderer';

interface Props {
  imageUrl: string | null;
  activeTool: TakeoffTool;
  selectedCatalogId: string | null;
  selectedAssemblyId: string | null;
  catalog: TakeoffCatalogItem[];
  assemblies: TakeoffAssembly[];
  measurements: TakeoffMeasurement[];
  zones: TakeoffZone[];
  scaleRatio: number | null;
  measurementUnit: string;
  onAddMeasurement: (m: Partial<TakeoffMeasurement>) => void;
  onAddZone: (z: { name: string; polygon: any; color: string }) => void;
  onScaleSet: (ratio: number) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.15;

export function TakeoffCanvas({
  imageUrl, activeTool, selectedCatalogId, selectedAssemblyId,
  catalog, assemblies, measurements, zones,
  scaleRatio, measurementUnit,
  onAddMeasurement, onAddZone, onScaleSet,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Track container size for PDF rendering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // PDF renderer — renders at zoom-appropriate DPI
  const pdfState = usePdfRenderer({
    url: imageUrl,
    pageNumber: 1,
    zoom,
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
  });

  // Attach rendered PDF canvas to DOM
  useEffect(() => {
    const host = pdfCanvasRef.current;
    if (!host || !pdfState.canvas || !pdfState.isPdf) return;
    host.innerHTML = '';
    pdfState.canvas.style.display = 'block';
    host.appendChild(pdfState.canvas);
    if (pdfState.pageSize) {
      setImgSize({ width: pdfState.pageSize.width, height: pdfState.pageSize.height });
    }
  }, [pdfState.canvas, pdfState.isPdf, pdfState.pageSize]);

  // Scale calibration state
  const [scaleCal, setScaleCal] = useState<ScaleCalibration>({ point1: null, point2: null, realWorldDistance: null });
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scaleInput, setScaleInput] = useState('');

  // Linear drawing state
  const [linearPoints, setLinearPoints] = useState<{ x: number; y: number }[]>([]);

  // Zone drawing state
  const [zonePoints, setZonePoints] = useState<{ x: number; y: number }[]>([]);
  const [showZoneNameDialog, setShowZoneNameDialog] = useState(false);
  const [zoneName, setZoneName] = useState('');

  const catalogMap = new Map(catalog.map(c => [c.id, c]));
  const assemblyMap = new Map(assemblies.map(a => [a.id, a]));

  // --- Zoom helpers ---
  const zoomTo = useCallback((newZoom: number, centerX?: number, centerY?: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom towards the cursor position
      const scale = clamped / zoom;
      setPan(prev => ({
        x: centerX - (centerX - prev.x) * scale,
        y: centerY - (centerY - prev.y) * scale,
      }));
    }
    setZoom(clamped);
  }, [zoom]);

  const zoomExtents = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    toast.info('View reset to fit extents');
  }, []);

  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomTo(zoom * (1 + ZOOM_STEP), rect.width / 2, rect.height / 2);
  }, [zoom, zoomTo]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomTo(zoom * (1 - ZOOM_STEP), rect.width / 2, rect.height / 2);
  }, [zoom, zoomTo]);

  // --- Mouse wheel zoom ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = zoom * (1 + direction * ZOOM_STEP);
      zoomTo(newZoom, cursorX, cursorY);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, zoomTo]);

  // --- Middle mouse double-click for zoom extents ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMiddleDouble = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        zoomExtents();
      }
    };
    container.addEventListener('dblclick', handleMiddleDouble);
    // Also prevent middle-click default (auto-scroll)
    const preventMiddle = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    container.addEventListener('mousedown', preventMiddle);
    return () => {
      container.removeEventListener('dblclick', handleMiddleDouble);
      container.removeEventListener('mousedown', preventMiddle);
    };
  }, [zoomExtents]);

  // --- Get relative position accounting for zoom/pan ---
  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || !imgSize.width) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    // Get position relative to the transformed content
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    return {
      x: (rawX / rect.width) * 100 * zoom,  // convert back to percentage of original
      y: (rawY / rect.height) * 100 * zoom,
    };
  }, [imgSize, zoom, pan]);

  // --- Pan with left mouse button (select tool) ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with left button in select mode, or always with middle button
    if (e.button === 0 && activeTool === 'select') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      e.preventDefault();
    }
  }, [activeTool, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Release pan if mouse leaves
  useEffect(() => {
    if (!isPanning) return;
    const handleUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isPanning]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Don't process tool clicks if we were panning
    if (activeTool === 'select') return;
    
    const pos = getRelativePos(e);

    if (activeTool === 'scale') {
      if (!scaleCal.point1) {
        setScaleCal({ ...scaleCal, point1: pos });
        toast.info('Click second point for scale reference');
      } else if (!scaleCal.point2) {
        setScaleCal({ ...scaleCal, point2: pos });
        setShowScaleDialog(true);
      }
      return;
    }

    if (activeTool === 'count') {
      if (!selectedCatalogId && !selectedAssemblyId) {
        toast.warning('Select a catalog item or assembly first');
        return;
      }
      onAddMeasurement({
        type: 'count',
        catalog_id: selectedCatalogId,
        assembly_id: selectedAssemblyId,
        x_pos: pos.x,
        y_pos: pos.y,
        final_quantity: 1,
      });
      return;
    }

    if (activeTool === 'linear') {
      if (!selectedCatalogId) {
        toast.warning('Select a conduit/cable type first');
        return;
      }
      setLinearPoints(prev => [...prev, pos]);
      return;
    }

    if (activeTool === 'zone') {
      setZonePoints(prev => [...prev, pos]);
      return;
    }
  }, [activeTool, scaleCal, selectedCatalogId, selectedAssemblyId, getRelativePos, onAddMeasurement]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Ignore middle-button double-clicks (handled by zoom extents)
    if ((e as any).button === 1) return;
    
    if (activeTool === 'linear' && linearPoints.length >= 2 && scaleRatio) {
      const catItem = selectedCatalogId ? catalogMap.get(selectedCatalogId) : null;
      let totalPxLength = 0;
      for (let i = 1; i < linearPoints.length; i++) {
        const dx = linearPoints[i].x - linearPoints[i - 1].x;
        const dy = linearPoints[i].y - linearPoints[i - 1].y;
        totalPxLength += Math.sqrt(dx * dx + dy * dy);
      }
      const measuredLength = totalPxLength / scaleRatio;
      const verticalDrop = (catItem?.default_vertical_drop || 0) * linearPoints.length;
      const waste = catItem?.waste_percentage || 0;
      const finalQty = (measuredLength + verticalDrop) * (1 + waste);

      onAddMeasurement({
        type: 'linear',
        catalog_id: selectedCatalogId,
        points: linearPoints,
        measured_length: measuredLength,
        vertical_drop_total: verticalDrop,
        waste_added: (measuredLength + verticalDrop) * waste,
        final_quantity: finalQty,
      });
      setLinearPoints([]);
      return;
    }

    if (activeTool === 'zone' && zonePoints.length >= 3) {
      setShowZoneNameDialog(true);
      return;
    }
  }, [activeTool, linearPoints, zonePoints, scaleRatio, selectedCatalogId, catalogMap, onAddMeasurement]);

  const handleScaleConfirm = () => {
    if (!scaleCal.point1 || !scaleCal.point2 || !scaleInput) return;
    const dx = scaleCal.point2.x - scaleCal.point1.x;
    const dy = scaleCal.point2.y - scaleCal.point1.y;
    const pxDist = Math.sqrt(dx * dx + dy * dy);
    const realDist = parseFloat(scaleInput);
    if (realDist > 0) {
      const ratio = pxDist / realDist;
      onScaleSet(ratio);
      toast.success(`Scale set: ${realDist}${measurementUnit} calibrated`);
    }
    setScaleCal({ point1: null, point2: null, realWorldDistance: null });
    setShowScaleDialog(false);
    setScaleInput('');
  };

  const handleZoneConfirm = () => {
    onAddZone({
      name: zoneName || 'Zone',
      polygon: zonePoints,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    });
    setZonePoints([]);
    setShowZoneNameDialog(false);
    setZoneName('');
  };

  // Cancel current drawing with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinearPoints([]);
        setZonePoints([]);
        setScaleCal({ point1: null, point2: null, realWorldDistance: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cursorClass = isPanning ? 'cursor-grabbing' : {
    select: 'cursor-grab',
    scale: 'cursor-crosshair',
    count: 'cursor-cell',
    linear: 'cursor-crosshair',
    zone: 'cursor-crosshair',
  }[activeTool];

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <div className="relative w-full h-full flex flex-col">
        {/* Zoom toolbar */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-md px-1 py-0.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Zoom In</p>
                <p className="text-xs text-muted-foreground">Scroll wheel up</p>
              </TooltipContent>
            </Tooltip>

            <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center select-none">
              {zoomPercent}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Zoom Out</p>
                <p className="text-xs text-muted-foreground">Scroll wheel down</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomExtents}>
                  <Maximize className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Zoom Extents</p>
                <p className="text-xs text-muted-foreground">Double-click scroll wheel</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === 'select' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={zoomExtents}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Reset View</p>
                <p className="text-xs text-muted-foreground">Reset zoom & pan to default</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Pan hint when in select mode */}
        {activeTool === 'select' && zoom !== 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-popover/90 text-popover-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
            <Move className="h-3 w-3" />
            Click & drag to pan
          </div>
        )}

        {/* Canvas area */}
        <div
          ref={containerRef}
          className={`relative w-full h-full overflow-hidden bg-muted/30 ${cursorClass}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="relative origin-top-left"
            style={{
              transform: pdfState.isPdf
                ? `translate(${pan.x}px, ${pan.y}px)`  // PDF already rendered at zoom DPI
                : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: pdfState.isPdf && pdfState.pageSize ? `${pdfState.pageSize.width}px` : '100%',
              height: pdfState.isPdf && pdfState.pageSize ? `${pdfState.pageSize.height}px` : '100%',
              willChange: 'transform',
            }}
          >
            {/* PDF loading indicator */}
            {pdfState.isPdf && pdfState.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* PDF canvas mount point */}
            {pdfState.isPdf && (
              <div ref={pdfCanvasRef} className="w-full h-full" />
            )}

            {/* Regular image fallback */}
            {!pdfState.isPdf && imageUrl && (
              <img
                src={imageUrl}
                alt="Drawing"
                className="w-full h-full object-contain"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                draggable={false}
              />
            )}

            {/* No drawing selected */}
            {!imageUrl && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a drawing to begin takeoff
              </div>
            )}

            {/* SVG overlay for all markers */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Zones */}
              {zones.map(z => (
                <polygon
                  key={z.id}
                  points={z.polygon.map((p: any) => `${p.x},${p.y}`).join(' ')}
                  fill={z.color}
                  fillOpacity={0.15}
                  stroke={z.color}
                  strokeWidth={0.3}
                />
              ))}
              {/* Zone being drawn */}
              {zonePoints.length > 0 && (
                <polygon
                  points={zonePoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  stroke="hsl(var(--primary))"
                  strokeWidth={0.3}
                  strokeDasharray="0.5"
                />
              )}

              {/* Count markers */}
              {measurements.filter(m => m.type === 'count').map(m => {
                const color = m.assembly_id
                  ? (assemblyMap.get(m.assembly_id)?.color || '#3b82f6')
                  : '#ef4444';
                return (
                  <g key={m.id}>
                    <circle cx={m.x_pos!} cy={m.y_pos!} r={0.8} fill={color} opacity={0.9} />
                    <circle cx={m.x_pos!} cy={m.y_pos!} r={0.5} fill="white" opacity={0.8} />
                    <circle cx={m.x_pos!} cy={m.y_pos!} r={0.3} fill={color} />
                  </g>
                );
              })}

              {/* Linear measurements */}
              {measurements.filter(m => m.type === 'linear' && m.points).map(m => (
                <polyline
                  key={m.id}
                  points={(m.points as any[]).map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={0.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Linear being drawn */}
              {linearPoints.length > 0 && (
                <polyline
                  points={linearPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={0.3}
                  strokeDasharray="0.5"
                />
              )}

              {/* Scale calibration line */}
              {scaleCal.point1 && (
                <circle cx={scaleCal.point1.x} cy={scaleCal.point1.y} r={0.6} fill="#f59e0b" />
              )}
              {scaleCal.point1 && scaleCal.point2 && (
                <>
                  <line
                    x1={scaleCal.point1.x} y1={scaleCal.point1.y}
                    x2={scaleCal.point2.x} y2={scaleCal.point2.y}
                    stroke="#f59e0b" strokeWidth={0.3} strokeDasharray="0.5"
                  />
                  <circle cx={scaleCal.point2.x} cy={scaleCal.point2.y} r={0.6} fill="#f59e0b" />
                </>
              )}
            </svg>

            {/* Zone labels */}
            {zones.map(z => {
              const cx = z.polygon.reduce((s: number, p: any) => s + p.x, 0) / z.polygon.length;
              const cy = z.polygon.reduce((s: number, p: any) => s + p.y, 0) / z.polygon.length;
              return (
                <div
                  key={`label-${z.id}`}
                  className="absolute text-[10px] font-bold pointer-events-none px-1 rounded"
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: z.color,
                    color: 'white',
                    opacity: 0.85,
                  }}
                >
                  {z.name}
                </div>
              );
            })}
          </div>

          {/* Tool hint */}
          {activeTool !== 'select' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-popover/90 text-popover-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
              {activeTool === 'scale' && (scaleCal.point1 ? 'Click 2nd point' : 'Click 1st point for scale reference')}
              {activeTool === 'count' && 'Click to place marker'}
              {activeTool === 'linear' && (linearPoints.length > 0 ? 'Click to add points. Double-click to finish.' : 'Click to start a run')}
              {activeTool === 'zone' && (zonePoints.length > 0 ? 'Click to add corners. Double-click to close zone.' : 'Click to start zone boundary')}
            </div>
          )}
        </div>
      </div>

      {/* Scale Dialog */}
      <Dialog open={showScaleDialog} onOpenChange={setShowScaleDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Scale</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Real-world distance between the two points</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={scaleInput}
                onChange={e => setScaleInput(e.target.value)}
                placeholder="e.g. 3.0"
                autoFocus
              />
              <span className="flex items-center text-sm text-muted-foreground">{measurementUnit}</span>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setShowScaleDialog(false); setScaleCal({ point1: null, point2: null, realWorldDistance: null }); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleScaleConfirm} disabled={!scaleInput}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Name Dialog */}
      <Dialog open={showZoneNameDialog} onOpenChange={setShowZoneNameDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Name this Zone</DialogTitle>
          </DialogHeader>
          <Input
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            placeholder="e.g. Room 101, Meeting Room"
            autoFocus
          />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setShowZoneNameDialog(false); setZonePoints([]); }}>Cancel</Button>
            <Button size="sm" onClick={handleZoneConfirm}>Create Zone</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
