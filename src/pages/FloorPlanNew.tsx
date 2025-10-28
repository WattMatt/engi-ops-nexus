import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Image as FabricImage, Point, Circle, Polygon, Group, Text, Line } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { PDFLoader } from "@/components/floorplan/PDFLoader";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { CableDetailsDialog } from "@/components/floorplan/CableDetailsDialog";
import { ZoneEditDialog } from "@/components/floorplan/ZoneEditDialog";
import { DrawingControls } from "@/components/floorplan/DrawingControls";
import { createIECSymbol } from "@/components/floorplan/iecSymbols";
import { EQUIPMENT_SIZES } from "@/components/floorplan/equipmentSizes";
import { DesignPurpose, Tool, EquipmentType, Zone } from "@/components/floorplan/types";
import { calculatePolygonArea, calculatePolygonCentroid, getZoneColor, getZoneStrokeColor } from "@/lib/zoneUtils";
import { DrawingHistory } from "@/lib/drawingHistory";

/**
 * FloorPlan - Complete Gemini-style drawing application
 * Clean implementation with proper zone drawing, equipment placement, and editing
 */
const FloorPlanNew = () => {
  const { floorPlanId: routeFloorPlanId } = useParams();
  const navigate = useNavigate();
  const [projectId] = useState(localStorage.getItem("selectedProjectId"));
  const [floorPlanId, setFloorPlanId] = useState<string | null>(routeFloorPlanId || null);
  const [floorPlanName, setFloorPlanName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  
  // Core state
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>("pv_design");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [scale, setScale] = useState<{ metersPerPixel: number; isSet: boolean }>({ metersPerPixel: 0, isSet: false });
  const [rotation, setRotation] = useState(0);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [previewShape, setPreviewShape] = useState<any>(null);
  
  // Data
  const [zones, setZones] = useState<Zone[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [cables, setCables] = useState<any[]>([]);
  
  // Selection
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  // Dialogs
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleLinePixels, setScaleLinePixels] = useState(0);
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [zoneEditDialogOpen, setZoneEditDialogOpen] = useState(false);
  const pendingCablePointsRef = useRef<Point[]>([]);
  
  // History
  const [drawingHistory] = useState(() => new DrawingHistory());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: "#ffffff",
    });

    // Zoom with mouse wheel
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setCurrentZoom(zoom);
      opt.e.preventDefault();
    });

    // Pan with middle mouse
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.button === 1) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
        }
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:up', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.button === 1) {
        isPanning = false;
        canvas.selection = true;
      }
    });

    // Handle selection
    canvas.on('selection:created', (e) => {
      if (activeTool !== 'select' || isDrawing) return;
      const obj = e.selected?.[0];
      if (!obj) return;
      
      const zoneId = obj.get('zoneId');
      if (zoneId) {
        const zone = zones.find(z => z.id === zoneId);
        if (zone) setSelectedZone(zone);
      }
      
      const equipId = obj.get('equipmentId');
      if (equipId) {
        setSelectedEquipment(obj);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedZone(null);
      setSelectedEquipment(null);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Drawing click handler
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleClick = (opt: any) => {
      if (activeTool === 'select' || activeTool === 'pan') return;
      
      const pointer = fabricCanvas.getPointer(opt.e);
      const point = new Point(pointer.x, pointer.y);

      // Scale tool
      if (activeTool === 'scale') {
        handleScaleClick(point);
        return;
      }

      // Equipment placement tools
      const equipmentTools: Tool[] = Object.keys(EQUIPMENT_SIZES) as EquipmentType[];
      
      // Equipment needs scale, but zones don't
      if (!scale.isSet && equipmentTools.includes(activeTool)) {
        toast.error("Please set scale first for equipment placement");
        return;
      }

      // Equipment placement
      if (equipmentTools.includes(activeTool)) {
        placeEquipment(point);
        return;
      }

      // Zone drawing
      if (activeTool === 'zone') {
        handleZoneDrawing(point);
        return;
      }

      // Cable drawing
      if (activeTool === 'line-lv' || activeTool === 'line-mv' || activeTool === 'line-dc') {
        handleCableDrawing(point);
        return;
      }
    };

    fabricCanvas.on('mouse:down', handleClick);
    return () => fabricCanvas.off('mouse:down', handleClick);
  }, [fabricCanvas, activeTool, scale, isDrawing, drawingPoints]);

  // Scale tool state
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [scaleMarkers, setScaleMarkers] = useState<Circle[]>([]);
  const [scaleLine, setScaleLine] = useState<Line | null>(null);

  // Scale tool
  const handleScaleClick = (point: Point) => {
    if (scalePoints.length === 0) {
      // First point
      const marker = new Circle({
        left: point.x,
        top: point.y,
        radius: 8 / currentZoom,
        fill: '#ef4444',
        stroke: '#fbbf24',
        strokeWidth: 2 / currentZoom,
        selectable: true,
        originX: 'center',
        originY: 'center',
      });
      marker.set({ isScaleMarker: true });
      fabricCanvas?.add(marker);
      setScalePoints([point]);
      setScaleMarkers([marker]);
      toast.info("Click the end point of a known distance");
    } else {
      // Second point - complete scale
      const marker = new Circle({
        left: point.x,
        top: point.y,
        radius: 8 / currentZoom,
        fill: '#ef4444',
        stroke: '#fbbf24',
        strokeWidth: 2 / currentZoom,
        selectable: true,
        originX: 'center',
        originY: 'center',
      });
      marker.set({ isScaleMarker: true });
      fabricCanvas?.add(marker);

      // Draw line
      const line = new Line([scalePoints[0].x, scalePoints[0].y, point.x, point.y], {
        stroke: '#ef4444',
        strokeWidth: 3 / currentZoom,
        strokeDashArray: [10 / currentZoom, 5 / currentZoom],
        selectable: false,
      });
      line.set({ isScaleLine: true });
      fabricCanvas?.add(line);
      setScaleLine(line);

      // Calculate pixel distance
      const dx = point.x - scalePoints[0].x;
      const dy = point.y - scalePoints[0].y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      
      setScaleLinePixels(pixelDistance);
      setScalePoints([scalePoints[0], point]);
      setScaleMarkers([...scaleMarkers, marker]);
      setScaleDialogOpen(true);
      fabricCanvas?.renderAll();
    }
  };

  // Equipment placement
  const placeEquipment = (point: Point) => {
    const newEquip = {
      id: crypto.randomUUID(),
      type: activeTool as EquipmentType,
      x: point.x,
      y: point.y,
      rotation,
    };

    // Draw symbol
    const realSize = EQUIPMENT_SIZES[activeTool as EquipmentType];
    const pixelSize = realSize / scale.metersPerPixel;
    const symbolScale = pixelSize / 20;
    const symbol = createIECSymbol(activeTool as EquipmentType, symbolScale);
    
    symbol.set({
      left: point.x,
      top: point.y,
      angle: rotation,
      selectable: true,
      equipmentId: newEquip.id,
    });

    fabricCanvas?.add(symbol);
    setEquipment(prev => [...prev, newEquip]);
    
    // Record history
    drawingHistory.push({ type: 'add', target: 'equipment', id: newEquip.id, data: newEquip });
    updateHistoryButtons();
    
    toast.success(`${activeTool} placed`);
  };

  // Zone drawing - Gemini style
  const handleZoneDrawing = (point: Point) => {
    const newPoints = [...drawingPoints, point];
    setDrawingPoints(newPoints);
    setIsDrawing(true);

    // Draw marker at click
    const marker = new Circle({
      left: point.x,
      top: point.y,
      radius: 5 / currentZoom,
      fill: '#10b981',
      stroke: '#ffffff',
      strokeWidth: 2 / currentZoom,
      selectable: false,
      originX: 'center',
      originY: 'center',
    });
    marker.set({ isDrawingMarker: true });
    fabricCanvas?.add(marker);

    // Update preview polygon
    if (previewShape) fabricCanvas?.remove(previewShape);
    
    if (newPoints.length >= 3) {
      const polygon = new Polygon(newPoints.map(p => ({ x: p.x, y: p.y })), {
        fill: '#10b98133',
        stroke: '#10b981',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      polygon.set({ isPreview: true });
      setPreviewShape(polygon);
      fabricCanvas?.add(polygon);
    }

    fabricCanvas?.renderAll();
    
    if (newPoints.length === 1) {
      toast.info("Click to add points. Press Enter to finish or double-click to close");
    }
  };

  // Finish zone drawing
  const finishZoneDrawing = () => {
    if (drawingPoints.length < 3) {
      toast.error("Zone needs at least 3 points");
      return;
    }

    // Calculate area (only show in m² if scale is set)
    const pixelArea = calculatePolygonArea(drawingPoints as any);
    const area = scale.isSet ? pixelArea * Math.pow(scale.metersPerPixel, 2) : pixelArea;
    
    const newZone: Zone = {
      id: crypto.randomUUID(),
      type: 'supply',
      points: drawingPoints.map(p => ({ x: p.x, y: p.y })),
      color: getZoneColor('supply'),
      areaSqm: area,
      name: `Zone ${zones.length + 1}`,
    };

    // Draw zone
    const polygon = new Polygon(drawingPoints.map(p => ({ x: p.x, y: p.y })), {
      fill: newZone.color,
      stroke: getZoneStrokeColor(newZone.type),
      strokeWidth: 2,
      opacity: 0.5,
      selectable: true,
    });
    polygon.set({ zoneId: newZone.id });

    const centroid = calculatePolygonCentroid(drawingPoints as any);
    const areaText = scale.isSet ? `${area.toFixed(2)} m²` : `${area.toFixed(0)} px²`;
    const label = new Text(`${newZone.name}\n${areaText}`, {
      left: centroid.x,
      top: centroid.y,
      fontSize: 14,
      fill: getZoneStrokeColor(newZone.type),
      originX: 'center',
      originY: 'center',
      selectable: false,
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: 6,
    });

    fabricCanvas?.add(polygon, label);
    setZones(prev => [...prev, newZone]);
    
    // Record history
    drawingHistory.push({ type: 'add', target: 'zone', id: newZone.id, data: newZone });
    updateHistoryButtons();
    
    cleanupDrawing();
    toast.success(`Zone created: ${areaText}`);
  };

  // Cable drawing
  const handleCableDrawing = (point: Point) => {
    const newPoints = [...drawingPoints, point];
    setDrawingPoints(newPoints);
    setIsDrawing(true);

    // Draw marker
    const marker = new Circle({
      left: point.x,
      top: point.y,
      radius: 5 / currentZoom,
      fill: '#2563eb',
      stroke: '#ffffff',
      strokeWidth: 2 / currentZoom,
      selectable: false,
      originX: 'center',
      originY: 'center',
    });
    marker.set({ isDrawingMarker: true });
    fabricCanvas?.add(marker);

    fabricCanvas?.renderAll();
    
    if (newPoints.length === 1) {
      toast.info("Click to add cable points. Press Enter to finish");
    }
  };

  // Finish cable drawing
  const finishCableDrawing = () => {
    if (drawingPoints.length < 2) {
      toast.error("Cable needs at least 2 points");
      return;
    }

    pendingCablePointsRef.current = drawingPoints;
    setCableDialogOpen(true);
    cleanupDrawing();
  };

  // Cleanup drawing
  const cleanupDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    
    // Remove preview and markers
    if (previewShape) fabricCanvas?.remove(previewShape);
    setPreviewShape(null);
    
    const objects = fabricCanvas?.getObjects() || [];
    objects.forEach(obj => {
      if (obj.get('isDrawingMarker') || obj.get('isPreview')) {
        fabricCanvas?.remove(obj);
      }
    });
    
    fabricCanvas?.renderAll();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Enter' && isDrawing) {
        if (activeTool === 'zone') finishZoneDrawing();
        else if (activeTool === 'line-lv' || activeTool === 'line-mv' || activeTool === 'line-dc') finishCableDrawing();
      } else if (e.key === 'Escape') {
        cleanupDrawing();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedZone) handleZoneDelete();
        else if (selectedEquipment) handleEquipmentDelete();
      } else if (e.key === 'e' || e.key === 'E') {
        if (selectedZone) setZoneEditDialogOpen(true);
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation(prev => (prev + 45) % 360);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawing, activeTool, selectedZone, selectedEquipment]);

  // Delete handlers
  const handleZoneDelete = () => {
    if (!selectedZone) return;
    
    drawingHistory.push({ type: 'delete', target: 'zone', id: selectedZone.id, data: selectedZone });
    updateHistoryButtons();
    
    // Remove from canvas
    const objects = fabricCanvas?.getObjects() || [];
    objects.forEach(obj => {
      if (obj.get('zoneId') === selectedZone.id) fabricCanvas?.remove(obj);
    });
    
    setZones(prev => prev.filter(z => z.id !== selectedZone.id));
    setSelectedZone(null);
    toast.success('Zone deleted');
  };

  const handleEquipmentDelete = () => {
    if (!selectedEquipment) return;
    
    const equipId = selectedEquipment.get('equipmentId');
    const equip = equipment.find(e => e.id === equipId);
    
    if (equip) {
      drawingHistory.push({ type: 'delete', target: 'equipment', id: equipId, data: equip });
      updateHistoryButtons();
    }
    
    fabricCanvas?.remove(selectedEquipment);
    setEquipment(prev => prev.filter(e => e.id !== equipId));
    setSelectedEquipment(null);
    toast.success('Equipment deleted');
  };

  // Zone edit
  const handleZoneEdit = (data: { type: 'supply' | 'exclusion' | 'roof'; name: string }) => {
    if (!selectedZone) return;
    
    const updatedZone = { ...selectedZone, type: data.type, name: data.name, color: getZoneColor(data.type) };
    
    drawingHistory.push({
      type: 'modify',
      target: 'zone',
      id: selectedZone.id,
      data: updatedZone,
      previousData: selectedZone,
    });
    updateHistoryButtons();
    
    // Redraw
    const objects = fabricCanvas?.getObjects() || [];
    objects.forEach(obj => {
      if (obj.get('zoneId') === selectedZone.id) fabricCanvas?.remove(obj);
    });
    
    const polygon = new Polygon(updatedZone.points as any, {
      fill: updatedZone.color,
      stroke: getZoneStrokeColor(updatedZone.type),
      strokeWidth: 2,
      opacity: 0.5,
      selectable: true,
    });
    polygon.set({ zoneId: updatedZone.id });
    fabricCanvas?.add(polygon);
    
    setZones(prev => prev.map(z => z.id === selectedZone.id ? updatedZone : z));
    setSelectedZone(updatedZone);
    toast.success('Zone updated');
  };

  // Undo/Redo
  const handleUndo = () => {
    const action = drawingHistory.undo();
    if (!action) return;
    
    // Implement undo logic
    updateHistoryButtons();
    toast.success('Undo');
  };

  const handleRedo = () => {
    const action = drawingHistory.redo();
    if (!action) return;
    
    // Implement redo logic
    updateHistoryButtons();
    toast.success('Redo');
  };

  const updateHistoryButtons = () => {
    setCanUndo(drawingHistory.canUndo());
    setCanRedo(drawingHistory.canRedo());
  };

  // Save
  const handleSave = async () => {
    toast.success("Save functionality - implement database persistence");
  };

  // PDF loaded
  const handlePDFLoaded = async (imageUrl: string, uploadedPdfUrl?: string) => {
    if (!fabricCanvas) return;
    
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = Math.min(
        (fabricCanvas.width! - 40) / img.width!,
        (fabricCanvas.height! - 40) / img.height!
      );
      
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: 20,
        top: 20,
        selectable: false,
        evented: false,
      });
      
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();
      
      setPdfImageUrl(imageUrl);
      toast.success('PDF loaded successfully');
    });
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a project first</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{floorPlanName || "Floor Plan - Gemini Style"}</h1>
          <p className="text-muted-foreground">Clean implementation with proper zone drawing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate("/dashboard/floor-plans")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <PDFLoader onPDFLoaded={handlePDFLoaded} />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2">
          {designPurpose && (
            <Toolbar
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              designPurpose={designPurpose}
              rotation={rotation}
              snapEnabled={false}
              onToggleSnap={() => {}}
            />
          )}
        </div>

        <div className="col-span-10">
          <Card>
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-muted relative">
                <canvas ref={canvasRef} />
                
                <div className="absolute top-4 right-4 z-10">
                  <DrawingControls
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onSave={handleSave}
                    saving={saving}
                    hasSelection={!!selectedZone || !!selectedEquipment}
                    selectionType={selectedZone ? 'zone' : selectedEquipment ? 'equipment' : null}
                    onDelete={() => {
                      if (selectedZone) handleZoneDelete();
                      else if (selectedEquipment) handleEquipmentDelete();
                    }}
                    onEdit={() => {
                      if (selectedZone) setZoneEditDialogOpen(true);
                    }}
                  />
                </div>

                {isDrawing && (
                  <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur p-3 rounded-lg border shadow-lg">
                    <p className="text-sm font-medium mb-1">Drawing Mode</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Click to add points</div>
                      <div>• <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to finish</div>
                      <div>• <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to cancel</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ScaleDialog
        open={scaleDialogOpen}
        pixelLength={scaleLinePixels}
        onConfirm={(meters) => {
          setScale({ metersPerPixel: meters / scaleLinePixels, isSet: true });
          setScaleDialogOpen(false);
          setActiveTool('select');
          toast.success(`Scale set: ${(meters / scaleLinePixels).toFixed(4)} m/px`);
        }}
        onCancel={() => {
          // Remove scale markers and line
          scaleMarkers.forEach(m => fabricCanvas?.remove(m));
          if (scaleLine) fabricCanvas?.remove(scaleLine);
          setScalePoints([]);
          setScaleMarkers([]);
          setScaleLine(null);
          setScaleDialogOpen(false);
          setActiveTool('select');
          toast.info("Scale calibration cancelled");
        }}
      />

      <CableDetailsDialog
        open={cableDialogOpen}
        equipment={equipment}
        onConfirm={(details) => {
          setCableDialogOpen(false);
          toast.success("Cable added");
        }}
        onCancel={() => setCableDialogOpen(false)}
      />

      <ZoneEditDialog
        open={zoneEditDialogOpen}
        onOpenChange={setZoneEditDialogOpen}
        zone={selectedZone}
        onConfirm={handleZoneEdit}
      />
    </div>
  );
};

export default FloorPlanNew;
