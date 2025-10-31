import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Save, Trash2, Download, Ruler, Square } from "lucide-react";
import { toast } from "sonner";
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { supabase } from "@/integrations/supabase/client";
import { loadPdfFromFile, renderPdfToCanvas } from "./utils/pdfCanvas";
import ScaleModal from "@/components/floor-plan/components/ScaleModal";

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
  line: { start: Point; end: Point } | null;
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

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({ pixelDistance: null, realDistance: null, ratio: null, line: null });
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scaleLineStart, setScaleLineStart] = useState<Point | null>(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [currentMask, setCurrentMask] = useState<Point[]>([]);
  const [masks, setMasks] = useState<TenantMask[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [tempScaleLine, setTempScaleLine] = useState<{start: Point, end: Point} | null>(null);
  const [floorPlanRecord, setFloorPlanRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing floor plan and masks from database
  useEffect(() => {
    loadFloorPlan();
  }, [projectId]);

  // Keyboard handler for Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isDrawingMask && currentMask.length >= 3) {
        completeMaskDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMask, currentMask]);

  const loadFloorPlan = async () => {
    setIsLoading(true);
    try {
      // Load floor plan record
      const { data: floorPlan, error: floorPlanError } = await supabase
        .from('project_floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .single();
      
      if (floorPlanError && floorPlanError.code !== 'PGRST116') throw floorPlanError;
      
      setFloorPlanRecord(floorPlan);

      // Load masks
      const { data: masksData, error: masksError } = await supabase
        .from('tenant_floor_plan_masks')
        .select('*')
        .eq('project_id', projectId);
      
      if (masksError) throw masksError;
      
      if (masksData) {
        setMasks(masksData.map((m: any) => ({
          id: m.id,
          tenantId: m.tenant_id,
          shopNumber: m.shop_number,
          points: m.points,
          area: m.area,
          color: m.color
        })));
      }

      // Load base PDF if exists
      if (floorPlan?.base_pdf_url) {
        const { data: pdfBlob, error: downloadError } = await supabase.storage
          .from('floor-plans')
          .download(floorPlan.base_pdf_url.split('/floor-plans/')[1]);
        
        if (downloadError) throw downloadError;
        
        const pdf = await loadPdfFromFile(new File([pdfBlob], 'floor-plan.pdf', { type: 'application/pdf' }));
        setPdfDoc(pdf);
        await renderPdf(pdf);
      }
    } catch (error: any) {
      console.error('Error loading floor plan:', error);
      if (error.code !== 'PGRST116') {
        toast.error('Failed to load floor plan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const pdf = await loadPdfFromFile(file);
      setPdfDoc(pdf);
      await renderPdf(pdf);

      // Upload base PDF to storage
      const basePdfPath = `${projectId}/base.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(basePdfPath, file, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(basePdfPath);

      // Upsert floor plan record
      const { data, error: upsertError } = await supabase
        .from('project_floor_plans')
        .upsert({
          project_id: projectId,
          base_pdf_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      
      setFloorPlanRecord(data);
      toast.success("Floor plan uploaded successfully - masks preserved");
    } catch (error: any) {
      console.error("PDF loading error:", error);
      toast.error(error.message || "Failed to load PDF");
    }

    e.target.value = '';
  };

  const renderPdf = async (pdf: PDFDocumentProxy) => {
    const canvas = pdfCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas) return;

    try {
      await renderPdfToCanvas(pdf, {
        pdfCanvas: canvas,
        drawingCanvas: drawingCanvas || undefined,
        scale: 2
      });
      drawMasks();
    } catch (error: any) {
      console.error("PDF render error:", error);
      toast.error(error.message || "Failed to render PDF");
    }
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

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        compositeCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Upload composite image to storage (overwrite existing)
      const compositePath = `${projectId}/composite.png`;
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(compositePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(compositePath);

      // Update floor plan record with composite image URL
      const { error: updateError } = await supabase
        .from('project_floor_plans')
        .upsert({
          project_id: projectId,
          composite_image_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        });

      if (updateError) throw updateError;
      
      toast.success("Floor plan saved to storage successfully");

    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save floor plan: " + error.message);
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

  const completeScaleSetting = (distance: number) => {
    if (!tempScaleLine) return;

    const pixelDist = Math.sqrt(
      Math.pow(tempScaleLine.end.x - tempScaleLine.start.x, 2) + 
      Math.pow(tempScaleLine.end.y - tempScaleLine.start.y, 2)
    );

    setScaleInfo({
      pixelDistance: pixelDist,
      realDistance: distance,
      ratio: distance / pixelDist,
      line: tempScaleLine
    });

    setIsSettingScale(false);
    setScaleLineStart(null);
    setTempScaleLine(null);
    setShowScaleModal(false);
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
      console.error('Save mask error:', error);
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

    // Draw saved masks
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

    // Draw current drawing
    if (isDrawingMask && currentMask.length > 0) {
      const polygonToDraw = previewPoint ? [...currentMask, previewPoint] : currentMask;
      
      ctx.beginPath();
      polygonToDraw.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      if (previewPoint) ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Draw points
      currentMask.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      });
    }

    // Draw scale line (temporary while setting)
    if (isSettingScale && scaleLineStart && previewPoint) {
      ctx.beginPath();
      ctx.moveTo(scaleLineStart.x, scaleLineStart.y);
      ctx.lineTo(previewPoint.x, previewPoint.y);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw saved scale line (after scale is set)
    if (scaleInfo.line && scaleInfo.ratio) {
      ctx.beginPath();
      ctx.moveTo(scaleInfo.line.start.x, scaleInfo.line.start.y);
      ctx.lineTo(scaleInfo.line.end.x, scaleInfo.line.end.y);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      const midX = (scaleInfo.line.start.x + scaleInfo.line.end.x) / 2;
      const midY = (scaleInfo.line.start.y + scaleInfo.line.end.y) / 2;
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${scaleInfo.realDistance}m`, midX, midY - 10);
    }

    ctx.restore();
  }, [masks, currentMask, previewPoint, viewState, isDrawingMask, isSettingScale, scaleLineStart]);

  useEffect(() => {
    drawMasks();
  }, [drawMasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading floor plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {floorPlanRecord && (
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date(floorPlanRecord.updated_at).toLocaleString()}
        </div>
      )}
      
      <div className="flex gap-2 flex-wrap items-center">
        <Button onClick={() => fileInputRef.current?.click()} variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {pdfDoc ? 'Replace' : 'Upload'} Base PDF
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
          <Button onClick={savePdfWithMasks} variant="outline" disabled={!pdfDoc}>
            <Download className="h-4 w-4 mr-2" />
            Save Floor Plan
          </Button>
        </div>
      </div>

      {scaleInfo.ratio && (
        <div className="text-sm text-muted-foreground">
          Scale: 1 px = {scaleInfo.ratio.toFixed(4)} m ({scaleInfo.realDistance}m reference line shown in green)
        </div>
      )}

      {isDrawingMask && currentMask.length > 0 && (
        <div className="text-sm text-primary font-medium">
          Press Enter to complete mask ({currentMask.length} points)
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
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transformOrigin: '0 0',
            transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
          }}
        >
          <canvas ref={pdfCanvasRef} style={{ display: 'block' }} />
          <canvas ref={drawingCanvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
        </div>
        
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

      <ScaleModal
        isOpen={showScaleModal}
        onClose={() => {
          setShowScaleModal(false);
          setTempScaleLine(null);
          setScaleLineStart(null);
          setIsSettingScale(false);
        }}
        onSubmit={completeScaleSetting}
      />
    </div>
  );
};
