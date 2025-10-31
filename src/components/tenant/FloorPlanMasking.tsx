import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Save, Trash2, Download, Ruler, Square } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from "@/integrations/supabase/client";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Point {
  x: number;
  y: number;
}

interface TenantMask {
  id: string;
  tenantId: string;
  shopNumber: string;
  points: Point[];
  area: number;
  color: string;
}

interface ScaleInfo {
  pixelDistance: number | null;
  realDistance: number | null;
  ratio: number | null;
}

interface ViewState {
  zoom: number;
  offset: Point;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#a855f7', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#8b5cf6'
];

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({ pixelDistance: null, realDistance: null, ratio: null });
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scaleLineStart, setScaleLineStart] = useState<Point | null>(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [currentMask, setCurrentMask] = useState<Point[]>([]);
  const [masks, setMasks] = useState<TenantMask[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleDistance, setScaleDistance] = useState("");
  const [tempScaleLine, setTempScaleLine] = useState<{start: Point, end: Point} | null>(null);

  // Load existing masks from database
  useEffect(() => {
    loadMasks();
  }, [projectId]);

  const loadMasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_floor_plan_masks')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      if (data) {
        setMasks(data.map((m: any) => ({
          id: m.id,
          tenantId: m.tenant_id,
          shopNumber: m.shop_number,
          points: m.points,
          area: m.area,
          color: m.color
        })));
      }
    } catch (error: any) {
      console.error('Error loading masks:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      await renderPdf(pdf);
      toast.success("Floor plan loaded successfully");
    } catch (error: any) {
      console.error("PDF loading error:", error);
      toast.error("Failed to load PDF: " + error.message);
    }
  };

  const renderPdf = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;
    
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      drawingCanvas.width = viewport.width;
      drawingCanvas.height = viewport.height;
    }

    drawMasks();
  };

  const savePdfWithMasks = async () => {
    if (!pdfDoc) {
      toast.error("No floor plan loaded");
      return;
    }

    try {
      const pdfCanvas = pdfCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      
      if (!pdfCanvas || !drawingCanvas) return;

      // Create composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = pdfCanvas.width;
      compositeCanvas.height = pdfCanvas.height;
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) return;

      // Draw PDF background
      ctx.drawImage(pdfCanvas, 0, 0);
      
      // Draw masks
      ctx.save();
      masks.forEach(mask => {
        ctx.beginPath();
        mask.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = `${mask.color}33`;
        ctx.strokeStyle = mask.color;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw label
        const centerX = mask.points.reduce((sum, p) => sum + p.x, 0) / mask.points.length;
        const centerY = mask.points.reduce((sum, p) => sum + p.y, 0) / mask.points.length;
        ctx.fillStyle = '#000';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${mask.shopNumber}`, centerX, centerY - 5);
        ctx.fillText(`${mask.area.toFixed(2)} sqm`, centerX, centerY + 15);
      });
      ctx.restore();

      // Convert to blob and download
      compositeCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tenant-floor-plan-${new Date().getTime()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Floor plan saved");
        }
      }, 'image/png');
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save: " + error.message);
    }
  };

  const getMousePos = (e: React.MouseEvent): Point => {
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);

    if (isSettingScale) {
      if (!scaleLineStart) {
        setScaleLineStart(worldPos);
      } else {
        const distance = Math.sqrt(
          Math.pow(worldPos.x - scaleLineStart.x, 2) + 
          Math.pow(worldPos.y - scaleLineStart.y, 2)
        );
        setTempScaleLine({ start: scaleLineStart, end: worldPos });
        setShowScaleModal(true);
      }
      return;
    }

    if (isDrawingMask) {
      setCurrentMask(prev => [...prev, worldPos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const worldPos = toWorld(mousePos);

    if (isPanning) {
      const dx = mousePos.x - lastMousePos.x;
      const dy = mousePos.y - lastMousePos.y;
      setViewState(prev => ({
        ...prev,
        offset: { x: prev.offset.x + dx, y: prev.offset.y + dy }
      }));
      setLastMousePos(mousePos);
      return;
    }

    if (isDrawingMask && currentMask.length > 0) {
      setPreviewPoint(worldPos);
    }

    if (isSettingScale && scaleLineStart) {
      setPreviewPoint(worldPos);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.metaKey))) {
      setIsPanning(true);
      setLastMousePos(getMousePos(e));
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    const worldBefore = toWorld(mousePos);
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, viewState.zoom * zoomFactor));
    
    setViewState(prev => {
      const worldAfter = {
        x: (mousePos.x - prev.offset.x) / newZoom,
        y: (mousePos.y - prev.offset.y) / newZoom,
      };
      
      return {
        zoom: newZoom,
        offset: {
          x: prev.offset.x + (worldAfter.x - worldBefore.x) * newZoom,
          y: prev.offset.y + (worldAfter.y - worldBefore.y) * newZoom,
        }
      };
    });
  };

  const completeScaleSetting = () => {
    if (!tempScaleLine) return;
    
    const distance = parseFloat(scaleDistance);
    if (isNaN(distance) || distance <= 0) {
      toast.error("Please enter a valid distance");
      return;
    }

    const pixelDist = Math.sqrt(
      Math.pow(tempScaleLine.end.x - tempScaleLine.start.x, 2) + 
      Math.pow(tempScaleLine.end.y - tempScaleLine.start.y, 2)
    );

    setScaleInfo({
      pixelDistance: pixelDist,
      realDistance: distance,
      ratio: distance / pixelDist
    });

    setIsSettingScale(false);
    setScaleLineStart(null);
    setTempScaleLine(null);
    setShowScaleModal(false);
    setScaleDistance("");
    toast.success(`Scale set: 1 px = ${(distance / pixelDist).toFixed(4)} m`);
    drawMasks();
  };

  const completeMaskDrawing = async () => {
    if (currentMask.length < 3) {
      toast.error("Draw at least 3 points to create a mask");
      return;
    }

    const area = calculatePolygonArea(currentMask);
    const shopNumber = prompt("Enter shop number for this area:");
    
    if (!shopNumber) {
      toast.error("Shop number is required");
      return;
    }

    const newMask: TenantMask = {
      id: `mask-${Date.now()}`,
      tenantId: '',
      shopNumber,
      points: currentMask,
      area,
      color: COLORS[masks.length % COLORS.length]
    };

    try {
      const { data, error } = await supabase
        .from('tenant_floor_plan_masks')
        .insert([{
          project_id: projectId,
          shop_number: shopNumber,
          points: currentMask as any,
          area,
          color: newMask.color
        }])
        .select()
        .single();

      if (error) throw error;

      setMasks(prev => [...prev, { ...newMask, id: data.id }]);
      setCurrentMask([]);
      setIsDrawingMask(false);
      setPreviewPoint(null);
      toast.success(`Mask created for ${shopNumber}: ${area.toFixed(2)} sqm`);
      drawMasks();
    } catch (error: any) {
      toast.error("Failed to save mask");
    }
  };

  const deleteMask = async (maskId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_floor_plan_masks')
        .delete()
        .eq('id', maskId);

      if (error) throw error;

      setMasks(prev => prev.filter(m => m.id !== maskId));
      toast.success("Mask deleted");
      drawMasks();
    } catch (error: any) {
      toast.error("Failed to delete mask");
    }
  };

  const drawMasks = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Draw saved masks
    masks.forEach(mask => {
      ctx.beginPath();
      mask.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = `${mask.color}33`;
      ctx.strokeStyle = mask.color;
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.fill();
      ctx.stroke();

      // Draw label
      const centerX = mask.points.reduce((sum, p) => sum + p.x, 0) / mask.points.length;
      const centerY = mask.points.reduce((sum, p) => sum + p.y, 0) / mask.points.length;
      ctx.fillStyle = '#000';
      ctx.font = `${14 / viewState.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${mask.shopNumber}\n${mask.area.toFixed(2)} sqm`, centerX, centerY);
    });

    // Draw current drawing
    if (isDrawingMask && currentMask.length > 0) {
      const polygonToDraw = previewPoint ? [...currentMask, previewPoint] : currentMask;
      
      ctx.beginPath();
      polygonToDraw.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      if (previewPoint) ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.fill();
      ctx.stroke();

      // Draw points
      currentMask.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / viewState.zoom, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      });
    }

    // Draw scale line
    if (isSettingScale && scaleLineStart && previewPoint) {
      ctx.beginPath();
      ctx.moveTo(scaleLineStart.x, scaleLineStart.y);
      ctx.lineTo(previewPoint.x, previewPoint.y);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3 / viewState.zoom;
      ctx.stroke();
    }

    ctx.restore();
  }, [masks, currentMask, previewPoint, viewState, isDrawingMask, isSettingScale, scaleLineStart]);

  useEffect(() => {
    drawMasks();
  }, [drawMasks]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={() => fileInputRef.current?.click()} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Load Floor Plan
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <Button
          onClick={() => {
            setIsSettingScale(!isSettingScale);
            setIsDrawingMask(false);
          }}
          variant={isSettingScale ? "default" : "outline"}
          disabled={!pdfDoc}
        >
          <Ruler className="h-4 w-4 mr-2" />
          Set Scale
        </Button>

        <Button
          onClick={() => {
            setIsDrawingMask(!isDrawingMask);
            setIsSettingScale(false);
          }}
          variant={isDrawingMask ? "default" : "outline"}
          disabled={!scaleInfo.ratio}
        >
          <Square className="h-4 w-4 mr-2" />
          Draw Mask
        </Button>

        {currentMask.length > 0 && (
          <>
            <Button onClick={completeMaskDrawing} variant="default">
              <Save className="h-4 w-4 mr-2" />
              Complete Mask
            </Button>
            <Button
              onClick={() => {
                setCurrentMask([]);
                setIsDrawingMask(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </>
        )}

        <div className="ml-auto">
          <Button onClick={savePdfWithMasks} variant="outline" disabled={!pdfDoc || masks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Save Floor Plan
          </Button>
        </div>
      </div>

      {scaleInfo.ratio && (
        <div className="text-sm text-muted-foreground">
          Scale: 1 px = {scaleInfo.ratio.toFixed(4)} m
        </div>
      )}

      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-gray-100"
        style={{ 
          height: '600px', 
          cursor: isPanning ? 'grabbing' : isDrawingMask || isSettingScale ? 'crosshair' : 'default'
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={pdfCanvasRef} className="absolute top-0 left-0" />
        <canvas ref={drawingCanvasRef} className="absolute top-0 left-0" />
        
        {!pdfDoc && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Click "Load Floor Plan" to begin
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Masked Areas</h3>
        {masks.map(mask => (
          <div key={mask.id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: mask.color }} />
              <span className="font-medium">{mask.shopNumber}</span>
              <span className="text-sm text-muted-foreground">{mask.area.toFixed(2)} sqm</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteMask(mask.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {showScaleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Set Scale</h3>
            <Label htmlFor="scale-distance">Real-world distance (meters)</Label>
            <Input
              id="scale-distance"
              type="number"
              value={scaleDistance}
              onChange={(e) => setScaleDistance(e.target.value)}
              placeholder="e.g., 10"
              className="mt-2"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={completeScaleSetting}>Set Scale</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowScaleModal(false);
                  setTempScaleLine(null);
                  setScaleLineStart(null);
                  setIsSettingScale(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
