import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Undo, Redo, FileText, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Canvas as FabricCanvas, Polyline, Polygon, Text, Group, FabricImage, Point as FabricPoint } from "fabric";
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
import { LineEditDialog } from "@/components/floorplan/LineEditDialog";
import { ZoneEditDialog } from "@/components/floorplan/ZoneEditDialog";
import { ScaleEditDialog } from "@/components/floorplan/ScaleEditDialog";
import { saveFloorPlanState, loadFloorPlanState } from "@/lib/supabaseFloorPlan";
import { generateBoq } from "@/lib/boqGenerator";
import { createIECSymbol } from "@/components/floorplan/iecSymbols";
import { Tool, DesignPurpose, DesignState, Point, EquipmentItem, SupplyLine, SupplyZone, Containment, PVArray, RoofMask, PVPanelConfig } from "@/components/floorplan/types";
import { EQUIPMENT_SIZES, CABLE_COLORS, CONTAINMENT_COLORS, ZONE_COLORS, SNAP_GRID_SIZE } from "@/components/floorplan/constants";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FloorPlanNew() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
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
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Edit dialogs
  const [lineEditOpen, setLineEditOpen] = useState(false);
  const [zoneEditOpen, setZoneEditOpen] = useState(false);
  const [scaleEditOpen, setScaleEditOpen] = useState(false);
  
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
  
  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      selection: activeTool === 'select',
    });
    
    // Pan & Zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      newZoom = Math.max(0.1, Math.min(5, newZoom));
      canvas.zoomToPoint(new FabricPoint(opt.e.offsetX, opt.e.offsetY), newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    
    // Selection handling
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        setSelectedId((obj as any).data?.id || null);
        setSelectedType((obj as any).data?.type || null);
      }
    });
    
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        setSelectedId((obj as any).data?.id || null);
        setSelectedType((obj as any).data?.type || null);
      }
    });
    
    canvas.on('selection:cleared', () => {
      setSelectedId(null);
      setSelectedType(null);
    });
    
    // Double-click to edit
    canvas.on('mouse:dblclick', (e) => {
      const obj = e.target;
      if (obj && (obj as any).data) {
        const data = (obj as any).data;
        if (data.type === 'line' || data.type === 'containment') {
          setLineEditOpen(true);
        } else if (data.type === 'zone') {
          setZoneEditOpen(true);
        }
      }
    });
    
    setFabricCanvas(canvas);
    
    return () => {
      canvas.dispose();
    };
  }, [canvasRef.current]);
  
  // Load PDF background
  useEffect(() => {
    if (pdfUrl && fabricCanvas) {
      loadPDFBackground();
    }
  }, [pdfUrl, fabricCanvas]);
  
  const loadPDFBackground = async () => {
    if (!fabricCanvas || !pdfUrl) return;
    
    try {
      const pdf = await pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Create temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;
      const context = tempCanvas.getContext('2d')!;
      await page.render({ canvasContext: context, viewport } as any).promise;
      
      // Set Fabric canvas size
      fabricCanvas.setWidth(viewport.width);
      fabricCanvas.setHeight(viewport.height);
      
      // Set PDF as background
      FabricImage.fromURL(tempCanvas.toDataURL()).then((img) => {
        img.set({
          scaleX: 1,
          scaleY: 1,
        });
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      });
      
      toast.success('PDF loaded successfully');
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
    }
  };
  
  // Render all elements on canvas
  const renderCanvas = () => {
    if (!fabricCanvas) return;
    
    // Clear all objects except background
    fabricCanvas.getObjects().forEach(obj => fabricCanvas.remove(obj));
    
    // Render zones
    state.zones.forEach(zone => {
      const points = zone.points.map(p => new FabricPoint(p.x, p.y));
      const polygon = new Polygon(points, {
        fill: ZONE_COLORS[zone.type] || 'rgba(0,0,0,0.1)',
        stroke: '#000',
        strokeWidth: 2,
        selectable: activeTool === 'select',
        hasControls: false,
      });
      (polygon as any).data = { id: zone.id, type: 'zone' };
      fabricCanvas.add(polygon);
      
      // Add label
      if (zone.name) {
        const centroid = getCentroid(zone.points);
        const label = new Text(zone.name, {
          left: centroid.x,
          top: centroid.y,
          fontSize: 14,
          fill: '#000',
          selectable: false,
        });
        fabricCanvas.add(label);
      }
    });
    
    // Render cables
    state.lines.forEach(line => {
      const points = line.points.flatMap(p => [p.x, p.y]);
      const polyline = new Polyline(line.points.map(p => new FabricPoint(p.x, p.y)), {
        stroke: line.color || CABLE_COLORS[line.type] || '#000',
        strokeWidth: 3,
        fill: '',
        selectable: activeTool === 'select',
        hasControls: false,
      });
      (polyline as any).data = { id: line.id, type: 'line' };
      fabricCanvas.add(polyline);
    });
    
    // Render containment
    state.containment.forEach(cont => {
      const polyline = new Polyline(cont.points.map(p => new FabricPoint(p.x, p.y)), {
        stroke: CONTAINMENT_COLORS[cont.type] || '#666',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        fill: '',
        selectable: activeTool === 'select',
        hasControls: false,
      });
      (polyline as any).data = { id: cont.id, type: 'containment' };
      fabricCanvas.add(polyline);
    });
    
    // Render equipment with IEC symbols
    state.equipment.forEach(eq => {
      const symbol = createIECSymbol(eq.type, 1);
      symbol.set({
        left: eq.x,
        top: eq.y,
        angle: eq.rotation || 0,
        selectable: activeTool === 'select',
      });
      (symbol as any).data = { id: eq.id, type: 'equipment' };
      
      const label = new Text(eq.name || eq.type.replace(/-/g, ' '), {
        left: eq.x,
        top: eq.y + 25,
        fontSize: 10,
        fill: '#000',
        selectable: false,
        originX: 'center',
        originY: 'top',
      });
      
      fabricCanvas.add(symbol);
      fabricCanvas.add(label);
    });
    
    fabricCanvas.renderAll();
  };
  
  useEffect(() => {
    renderCanvas();
  }, [state, fabricCanvas, activeTool]);
  
  // Helper: Calculate centroid
  const getCentroid = (points: Point[]): Point => {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  };
  
  // Mouse handlers for drawing mode
  useEffect(() => {
    if (!fabricCanvas) return;
    
    if (activeTool === 'select') {
      fabricCanvas.selection = true;
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = true;
      });
    } else {
      fabricCanvas.selection = false;
      fabricCanvas.discardActiveObject();
      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = false;
      });
      
      // Equipment placement on click
      if (EQUIPMENT_SIZES[activeTool as any]) {
        const handleClick = (e: any) => {
          const pointer = fabricCanvas.getPointer(e.e);
          let x = pointer.x;
          let y = pointer.y;
          
          if (snapEnabled) {
            x = Math.round(x / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
            y = Math.round(y / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
          }
          
          const newEquipment: EquipmentItem = {
            id: Math.random().toString(),
            type: activeTool as any,
            x,
            y,
            rotation,
            properties: {},
          };
          pushHistory({ ...state, equipment: [...state.equipment, newEquipment] });
        };
        
        fabricCanvas.on('mouse:down', handleClick);
        return () => {
          fabricCanvas.off('mouse:down', handleClick);
        };
      }
    }
  }, [fabricCanvas, activeTool, snapEnabled, rotation]);
  
  // Delete selected
  const handleDelete = () => {
    if (!selectedId || !fabricCanvas) return;
    
    const newState = { ...state };
    
    if (selectedType === 'equipment') {
      newState.equipment = state.equipment.filter(eq => eq.id !== selectedId);
    } else if (selectedType === 'line') {
      newState.lines = state.lines.filter(line => line.id !== selectedId);
    } else if (selectedType === 'zone') {
      newState.zones = state.zones.filter(zone => zone.id !== selectedId);
    } else if (selectedType === 'containment') {
      newState.containment = state.containment.filter(cont => cont.id !== selectedId);
    }
    
    pushHistory(newState);
    setSelectedId(null);
    setSelectedType(null);
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(5, zoom * 1.2);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
    fabricCanvas.renderAll();
  };
  
  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(0.1, zoom / 1.2);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
    fabricCanvas.renderAll();
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
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex === 0}>
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex === history.length - 1}>
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>
          {selectedId && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
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
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          <div className="absolute inset-0 overflow-auto">
            <canvas ref={canvasRef} />
          </div>
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
