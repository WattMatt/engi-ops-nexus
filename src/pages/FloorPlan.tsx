import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo, Redo, FileUp, Download, Sparkles, ArrowLeft } from "lucide-react";
import { DesignPurpose, Tool, Point, EquipmentItem, SupplyLine, Zone } from "@/components/floorplan/gemini/types";
import { CanvasRenderer } from "@/components/floorplan/gemini/CanvasRenderer";
import { DrawingState } from "@/components/floorplan/gemini/DrawingState";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { GeminiToolbar } from "@/components/floorplan/gemini/GeminiToolbar";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.mjs`;

export default function FloorPlan() {
  const { floorPlanId } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState("");
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [showPurposeDialog, setShowPurposeDialog] = useState(false);
  
  const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
  const [state] = useState(() => new DrawingState());
  
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [rotation, setRotation] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  
  const [, forceRender] = useState(0);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      forceRender(prev => prev + 1);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const newRenderer = new CanvasRenderer(canvas);
    setRenderer(newRenderer);
    
    loadFloorPlan();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [floorPlanId]);

  // Render loop
  useEffect(() => {
    if (!renderer) return;
    
    renderer.render(
      state.equipment,
      state.lines,
      state.zones,
      state.containment,
      state.roofMasks,
      state.pvArrays,
      state.scale,
      zoom,
      offset
    );
  }, [renderer, state.equipment, state.lines, state.zones, state.containment, state.roofMasks, state.pvArrays, state.scale, zoom, offset]);

  const loadFloorPlan = async () => {
    if (!floorPlanId) return;
    
    setLoading(true);
    try {
      const { data: fp, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', floorPlanId)
        .single();

      if (error) throw error;

      if (fp) {
        setFloorPlanName(fp.name);
        
        if (fp.design_purpose) {
          setDesignPurpose(fp.design_purpose as DesignPurpose);
        } else {
          setShowPurposeDialog(true);
        }

        if (fp.pdf_url) {
          await loadPDF(fp.pdf_url);
        }

        if (fp.scale_meters_per_pixel && fp.scale_point1 && fp.scale_point2) {
          const p1 = fp.scale_point1 as any;
          const p2 = fp.scale_point2 as any;
          state.setScale(
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p2.y },
            fp.scale_meters_per_pixel
          );
        }

        await Promise.all([
          loadEquipment(),
          loadLines(),
          loadZones(),
        ]);

        forceRender(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error loading floor plan:', error);
      toast.error(error.message || 'Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  };

  const loadPDF = async (url: string) => {
    try {
      const pdf = await getDocument(url).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;
      const context = tempCanvas.getContext('2d')!;

      await page.render({ canvasContext: context, viewport } as any).promise;

      const img = new Image();
      img.src = tempCanvas.toDataURL();
      await new Promise(resolve => { img.onload = resolve; });

      if (!canvasRef.current || !renderer) return;

      const scale = Math.min(
        (canvasRef.current.width - 40) / img.width,
        (canvasRef.current.height - 40) / img.height
      );

      renderer.setPDFImage(img, scale);
      forceRender(prev => prev + 1);
      toast.success('PDF loaded');
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
    }
  };

  const loadEquipment = async () => {
    const { data } = await supabase
      .from('equipment_placements')
      .select('*')
      .eq('floor_plan_id', floorPlanId);
    
    if (data) {
      state.equipment = data.map(e => ({
        id: e.id,
        type: e.equipment_type as any,
        x: Number(e.x_position),
        y: Number(e.y_position),
        rotation: e.rotation || 0,
        properties: (e.properties as any) || {}
      }));
    }
  };

  const loadLines = async () => {
    // Skip loading lines for now until Supabase types are regenerated
    state.lines = [];
  };

  const loadZones = async () => {
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('floor_plan_id', floorPlanId);
    
    if (data) {
      state.zones = data.map(z => ({
        id: z.id,
        type: z.zone_type as any,
        points: z.points as any,
        name: z.name || 'Zone',
        color: z.color || undefined,
        areaSqm: z.area_sqm ? Number(z.area_sqm) : undefined
      }));
    }
  };

  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { data, error } = await supabase.storage
          .from('floor_plans')
          .upload(`${floorPlanId}/${file.name}`, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('floor_plans')
          .getPublicUrl(data.path);

        await supabase
          .from('floor_plans')
          .update({ pdf_url: publicUrl })
          .eq('id', floorPlanId);

        await loadPDF(publicUrl);
        toast.success('PDF uploaded');
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload PDF');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!floorPlanId) return;

    setSaving(true);
    try {
      if (state.scale.isSet) {
        await supabase
          .from('floor_plans')
          .update({
            scale_meters_per_pixel: state.scale.metersPerPixel,
            scale_point1: state.scale.point1 as any,
            scale_point2: state.scale.point2 as any
          })
          .eq('id', floorPlanId);
      }

      toast.success('Floor plan saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || activeTool === "select" || activeTool === "pan") return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    if (activeTool === "scale") {
      handleScaleClick({ x, y });
    }
  };

  const handleScaleClick = (point: Point) => {
    if (scalePoints.length === 0) {
      setScalePoints([point]);
      toast.info('Click second point to set scale');
    } else if (scalePoints.length === 1) {
      setScalePoints([scalePoints[0], point]);
      setShowScaleDialog(true);
    }
  };

  const handleScaleConfirm = (meters: number) => {
    if (scalePoints.length === 2) {
      state.setScale(scalePoints[0], scalePoints[1], meters);
      setScalePoints([]);
      setShowScaleDialog(false);
      setActiveTool("select");
      forceRender(prev => prev + 1);
      toast.success('Scale set');
    }
  };

  const handleMouseWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan" || e.button === 1) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleUndo = () => {
    state.undo();
    forceRender(prev => prev + 1);
  };

  const handleRedo = () => {
    state.redo();
    forceRender(prev => prev + 1);
  };

  const handleDesignPurposeSelect = async (purpose: DesignPurpose) => {
    setDesignPurpose(purpose);
    setShowPurposeDialog(false);

    if (floorPlanId) {
      await supabase
        .from('floor_plans')
        .update({ design_purpose: purpose as any })
        .eq('id', floorPlanId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/floor-plans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{floorPlanName}</h1>
          {designPurpose && (
            <span className="text-sm text-muted-foreground">
              {designPurpose.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-2" />
            Load PDF
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={!state.canUndo()}>
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={!state.canRedo()}>
            <Redo className="h-4 w-4" />
          </Button>
          
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {designPurpose && (
          <GeminiToolbar
            designPurpose={designPurpose}
            activeTool={activeTool}
            onToolSelect={setActiveTool}
            rotation={rotation}
            onRotationChange={setRotation}
            snapEnabled={snapEnabled}
            onToggleSnap={setSnapEnabled}
          />
        )}

        <div className="flex-1 relative overflow-hidden bg-muted">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
            onWheel={handleMouseWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePDFUpload}
      />

      <DesignPurposeDialog open={showPurposeDialog} onSelect={handleDesignPurposeSelect} />

      <ScaleDialog
        open={showScaleDialog}
        pixelLength={0}
        onConfirm={handleScaleConfirm}
        onCancel={() => {
          setShowScaleDialog(false);
          setScalePoints([]);
        }}
      />
    </div>
  );
}
