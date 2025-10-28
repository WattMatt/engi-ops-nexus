import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Download, Undo, Redo, FileText, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { EquipmentPanel } from "@/components/floorplan/EquipmentPanel";
import { BoqModal } from "@/components/floorplan/BoqModal";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { CableDetailsDialog } from "@/components/floorplan/CableDetailsDialog";
import { ContainmentSizeDialog } from "@/components/floorplan/ContainmentSizeDialog";
import { RoofMaskDialog } from "@/components/floorplan/RoofMaskDialog";
import { PVArrayDialog } from "@/components/floorplan/PVArrayDialog";
import { PVPanelConfigDialog } from "@/components/floorplan/PVPanelConfigDialog";
import { TaskModal } from "@/components/floorplan/TaskModal";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { saveFloorPlanState, loadFloorPlanState } from "@/lib/supabaseFloorPlan";
import { generateBoq } from "@/lib/boqGenerator";
import { Tool, DesignPurpose, DesignState, Point, EquipmentItem, SupplyLine, SupplyZone, Containment, PVArray, RoofMask, PVPanelConfig } from "@/components/floorplan/types";
import { EQUIPMENT_SIZES, CABLE_COLORS, CONTAINMENT_COLORS, ZONE_COLORS, SNAP_GRID_SIZE } from "@/components/floorplan/constants";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FloorPlanNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [floorPlanName, setFloorPlanName] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Design state
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [state, setState] = useState<DesignState>({
    equipment: [],
    lines: [],
    zones: [],
    containment: [],
    roofMasks: [],
    pvArrays: [],
    tasks: [],
  });
  
  // History for undo/redo
  const [history, setHistory] = useState<DesignState[]>([state]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Scale
  const [scale, setScale] = useState({ metersPerPixel: 0, isSet: false });
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scalePixelLength, setScalePixelLength] = useState(0);
  
  // Dialogs
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [containmentDialogOpen, setContainmentDialogOpen] = useState(false);
  const [roofDialogOpen, setRoofDialogOpen] = useState(false);
  const [pvArrayDialogOpen, setPvArrayDialogOpen] = useState(false);
  const [pvConfigDialogOpen, setPvConfigDialogOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [boqModalOpen, setBoqModalOpen] = useState(false);
  const [boqContent, setBoqContent] = useState("");
  
  // Settings
  const [rotation, setRotation] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [pvPanelConfig, setPvPanelConfig] = useState<PVPanelConfig>({ length: 1.7, width: 1.0, wattage: 400 });
  
  // Load floor plan
  useEffect(() => {
    if (id) {
      loadFloorPlan();
    }
  }, [id]);
  
  const loadFloorPlan = async () => {
    if (!id) return;
    
    try {
      const { data: floorPlan, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setFloorPlanName(floorPlan.name);
      setPdfUrl(floorPlan.pdf_url);
      
      if (floorPlan.design_purpose) {
        setDesignPurpose(floorPlan.design_purpose as DesignPurpose);
      }
      
      if (floorPlan.pv_panel_config) {
        setPvPanelConfig(floorPlan.pv_panel_config as unknown as PVPanelConfig);
      }
      
      if (floorPlan.scale_meters_per_pixel) {
        setScale({ metersPerPixel: floorPlan.scale_meters_per_pixel, isSet: true });
      }
      
      // Load state from database
      const { state: loadedState } = await loadFloorPlanState(id);
      if (loadedState) {
        setState(loadedState);
        setHistory([loadedState]);
        setHistoryIndex(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading floor plan:', error);
      toast.error('Failed to load floor plan');
      setLoading(false);
    }
  };
  
  // Load PDF
  useEffect(() => {
    if (pdfUrl && canvasRef.current) {
      loadPDF();
    }
  }, [pdfUrl]);
  
  const loadPDF = async () => {
    if (!canvasRef.current || !overlayCanvasRef.current || !pdfUrl) return;
    
    try {
      const pdf = await pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      overlay.width = viewport.width;
      overlay.height = viewport.height;
      
      const context = canvas.getContext('2d')!;
      await page.render({ canvasContext: context, viewport } as any).promise;
      
      redrawOverlay();
      toast.success('PDF loaded successfully');
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
    }
  };
  
  // Redraw overlay
  const redrawOverlay = () => {
    if (!overlayCanvasRef.current) return;
    
    const ctx = overlayCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    
    // Draw zones
    state.zones.forEach(zone => {
      ctx.fillStyle = ZONE_COLORS[zone.type] || 'rgba(0,0,0,0.1)';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      zone.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    
    // Draw cables
    state.lines.forEach(line => {
      ctx.strokeStyle = line.color || CABLE_COLORS[line.type] || '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      line.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
    
    // Draw containment
    state.containment.forEach(cont => {
      ctx.strokeStyle = CONTAINMENT_COLORS[cont.type] || '#666';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      cont.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
    
    // Draw equipment
    state.equipment.forEach(eq => {
      const size = EQUIPMENT_SIZES[eq.type] || { width: 20, height: 20 };
      ctx.fillStyle = '#4CAF50';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.fillRect(eq.x - size.width/2, eq.y - size.height/2, size.width, size.height);
      ctx.strokeRect(eq.x - size.width/2, eq.y - size.height/2, size.width, size.height);
    });
    
    // Draw current drawing
    if (currentPoints.length > 0) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      currentPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  };
  
  useEffect(() => {
    redrawOverlay();
  }, [state, currentPoints]);
  
  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    if (snapEnabled) {
      x = Math.round(x / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
      y = Math.round(y / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
    }
    
    if (activeTool === "select") {
      // Handle selection
      return;
    }
    
    // Equipment placement
    if (EQUIPMENT_SIZES[activeTool as any]) {
      const newEquipment: EquipmentItem = {
        id: Math.random().toString(),
        type: activeTool as any,
        x,
        y,
        rotation,
        properties: {},
      };
      pushHistory({ ...state, equipment: [...state.equipment, newEquipment] });
      return;
    }
    
    // Start drawing lines/zones
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    if (snapEnabled) {
      x = Math.round(x / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
      y = Math.round(y / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
    }
    
    setCurrentPoints([...currentPoints, { x, y }]);
  };
  
  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }
    
    setIsDrawing(false);
    
    // Handle different tools
    if (activeTool === "scale") {
      const length = Math.sqrt(
        Math.pow(currentPoints[currentPoints.length-1].x - currentPoints[0].x, 2) +
        Math.pow(currentPoints[currentPoints.length-1].y - currentPoints[0].y, 2)
      );
      setScalePixelLength(length);
      setScaleDialogOpen(true);
    } else if (activeTool.startsWith("line-")) {
      setCableDialogOpen(true);
    } else if (activeTool === "zone") {
      const newZone: SupplyZone = {
        id: Math.random().toString(),
        type: "supply",
        points: currentPoints,
        name: `Zone ${state.zones.length + 1}`,
      };
      pushHistory({ ...state, zones: [...state.zones, newZone] });
      setCurrentPoints([]);
    } else if (activeTool === "roof-mask") {
      setRoofDialogOpen(true);
    } else if (CONTAINMENT_COLORS[activeTool as any]) {
      setContainmentDialogOpen(true);
    }
  };
  
  // Push to history
  const pushHistory = (newState: DesignState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setState(newState);
  };
  
  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setState(history[historyIndex - 1]);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setState(history[historyIndex + 1]);
    }
  };
  
  // Save
  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    const result = await saveFloorPlanState(id, state);
    
    if (result.success) {
      toast.success('Floor plan saved successfully');
    } else {
      toast.error('Failed to save floor plan');
    }
    setSaving(false);
  };
  
  // Generate BOQ
  const handleGenerateBoq = () => {
    const boq = generateBoq(state, floorPlanName);
    setBoqContent(boq);
    setBoqModalOpen(true);
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!designPurpose) {
    return (
      <DesignPurposeDialog
        open={true}
        onSelect={(purpose) => {
          setDesignPurpose(purpose);
          if (id) {
            supabase.from('floor_plans').update({ design_purpose: purpose as any }).eq('id', id);
          }
        }}
      />
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{floorPlanName}</h1>
          <span className="text-sm text-muted-foreground">
            {designPurpose.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex === 0}>
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex === history.length - 1}>
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setState({ equipment: [], lines: [], zones: [], containment: [], roofMasks: [], pvArrays: [], tasks: [] })}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateBoq}>
            <FileText className="w-4 h-4 mr-2" />
            Generate BOQ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-64 overflow-y-auto border-r">
          <Toolbar
            activeTool={activeTool}
            onToolSelect={setActiveTool}
            designPurpose={designPurpose}
            rotation={rotation}
            snapEnabled={snapEnabled}
            onToggleSnap={() => setSnapEnabled(!snapEnabled)}
          />
        </div>
        
        {/* Canvas */}
        <div className="flex-1 relative overflow-auto">
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
          <canvas 
            ref={overlayCanvasRef} 
            className="absolute top-0 left-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
        
        {/* Right Panel */}
        <div className="w-80 overflow-y-auto border-l">
          <EquipmentPanel state={state} />
        </div>
      </div>
      
      {/* Dialogs */}
      <ScaleDialog
        open={scaleDialogOpen}
        pixelLength={scalePixelLength}
        onConfirm={(meters) => {
          setScale({ metersPerPixel: meters / scalePixelLength, isSet: true });
          if (id) {
            supabase.from('floor_plans').update({ scale_meters_per_pixel: meters / scalePixelLength }).eq('id', id);
          }
          setScaleDialogOpen(false);
          setCurrentPoints([]);
          toast.success('Scale set successfully');
        }}
        onCancel={() => {
          setScaleDialogOpen(false);
          setCurrentPoints([]);
        }}
      />
      
      <CableDetailsDialog
        open={cableDialogOpen}
        equipment={state.equipment}
        onConfirm={(details) => {
          const newLine: SupplyLine = {
            id: Math.random().toString(),
            type: activeTool.replace('line-', '') as any,
            points: currentPoints,
            cableSize: details.cableType,
            supplyFrom: details.from,
            supplyTo: details.to,
          };
          pushHistory({ ...state, lines: [...state.lines, newLine] });
          setCableDialogOpen(false);
          setCurrentPoints([]);
        }}
        onCancel={() => {
          setCableDialogOpen(false);
          setCurrentPoints([]);
        }}
      />
      
      <ContainmentSizeDialog
        open={containmentDialogOpen}
        containmentType={activeTool}
        onConfirm={(size) => {
          const newCont: Containment = {
            id: Math.random().toString(),
            type: activeTool as any,
            points: currentPoints,
            size,
          };
          pushHistory({ ...state, containment: [...state.containment, newCont] });
          setContainmentDialogOpen(false);
          setCurrentPoints([]);
        }}
        onCancel={() => {
          setContainmentDialogOpen(false);
          setCurrentPoints([]);
        }}
      />
      
      <RoofMaskDialog
        open={roofDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRoofDialogOpen(false);
            setCurrentPoints([]);
          }
        }}
        onConfirm={(pitch) => {
          const newMask: RoofMask = {
            id: Math.random().toString(),
            points: currentPoints,
            pitch,
            name: `Roof ${state.roofMasks.length + 1}`,
          };
          pushHistory({ ...state, roofMasks: [...state.roofMasks, newMask] });
          setRoofDialogOpen(false);
          setCurrentPoints([]);
        }}
      />
      
      <BoqModal
        open={boqModalOpen}
        onOpenChange={setBoqModalOpen}
        boqContent={boqContent}
      />
    </div>
  );
}
