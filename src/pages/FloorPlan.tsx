import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, Sparkles, Loader2, ArrowLeft, Ruler, Edit } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Image as FabricImage, Point, Line, Circle, Polyline, Rect, Group, Text } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { PDFLoader } from "@/components/floorplan/PDFLoader";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { ProjectOverview } from "@/components/floorplan/ProjectOverview";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { ScaleEditDialog } from "@/components/floorplan/ScaleEditDialog";
import { CableDetailsDialog } from "@/components/floorplan/CableDetailsDialog";
import { ContainmentSizeDialog } from "@/components/floorplan/ContainmentSizeDialog";
import { EQUIPMENT_SIZES } from "@/components/floorplan/equipmentSizes";
import { CABLE_STYLES, SPECIAL_CABLE_STYLES } from "@/components/floorplan/cableStyles";
import { createIECSymbol } from "@/components/floorplan/iecSymbols";
import { DesignPurpose, Tool, ProjectData, ScaleCalibration, EquipmentType, CableType, ContainmentSize, Zone } from "@/components/floorplan/types";

const FloorPlan = () => {
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
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [rotation, setRotation] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [scaleCalibration, setScaleCalibration] = useState<ScaleCalibration>({
    metersPerPixel: 0,
    isSet: false,
  });
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleEditDialogOpen, setScaleEditDialogOpen] = useState(false);
  const [scaleLinePixels, setScaleLinePixels] = useState(0);
  const [scaleCalibrationPoints, setScaleCalibrationPoints] = useState<Point[]>([]);
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [containmentDialogOpen, setContainmentDialogOpen] = useState(false);
  const [currentContainmentType, setCurrentContainmentType] = useState("");
  const [projectData, setProjectData] = useState<ProjectData>({
    equipment: [],
    cables: [],
    zones: [],
    containment: [],
    pvArrays: [],
  });
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [previewLine, setPreviewLine] = useState<Polyline | null>(null);
  const [equipmentPreview, setEquipmentPreview] = useState<Circle | Rect | null>(null);
  const [scalePoints, setScalePoints] = useState<Point[]>([]);
  const [scaleObjects, setScaleObjects] = useState<{ line: Line | null; markers: Circle[]; label: Text | null }>({
    line: null,
    markers: [],
    label: null
  });
  const [currentZoom, setCurrentZoom] = useState(1);
  const pendingCablePointsRef = useRef<Point[]>([]);
  const pendingContainmentPointsRef = useRef<Point[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: "#f5f5f5",
      fireMiddleClick: true, // CRITICAL: Enable middle button events
      stopContextMenu: true, // Prevent right-click menu
    });

    // Enhanced zoom with mouse wheel
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      
      zoom *= 0.999 ** delta;
      
      if (zoom > 20) zoom = 20;
      if (zoom < 0.05) zoom = 0.05;
      
      const point = new Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, zoom);
      setCurrentZoom(zoom);
      
      opt.e.preventDefault();
      opt.e.stopPropagation();
      
      const zoomPercent = Math.round(zoom * 100);
      if (zoomPercent % 10 === 0 || delta > 50) {
        toast(`Zoom: ${zoomPercent}%`, { duration: 500 });
      }
    });

    // Panning with middle mouse button (works even during drawing)
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let hasMoved = false;

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.button === 1) { // Middle button - always enable panning
        isPanning = true;
        hasMoved = false;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.setCursor('grab');
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        hasMoved = true;
        canvas.setCursor('grabbing');
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
        }
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        // Stop event propagation to prevent drawing while panning
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

    canvas.on('mouse:up', (opt) => {
      const evt = opt.e as MouseEvent;
      if (isPanning && evt.button === 1) {
        canvas.setViewportTransform(canvas.viewportTransform);
        isPanning = false;
        canvas.selection = true;
        canvas.setCursor('default');
        
        // Prevent click event if we moved during pan
        if (hasMoved) {
          setTimeout(() => {
            hasMoved = false;
          }, 50);
        }
      }
    });

    setFabricCanvas(canvas);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Handle scale marker movement to update calibration
  useEffect(() => {
    if (!fabricCanvas || scaleObjects.markers.length !== 2 || !floorPlanId) return;

    let saveTimeout: NodeJS.Timeout;

    const updateScaleLine = async () => {
      const [marker1, marker2] = scaleObjects.markers;
      const line = scaleObjects.line;
      const label = scaleObjects.label;
      
      if (!line || !marker1 || !marker2) return;

      // Update line position
      line.set({
        x1: marker1.left!,
        y1: marker1.top!,
        x2: marker2.left!,
        y2: marker2.top!,
      });

      // Calculate new distance
      const distance = Math.sqrt(
        Math.pow(marker2.left! - marker1.left!, 2) + 
        Math.pow(marker2.top! - marker1.top!, 2)
      );

      // Update label position and text
      if (label && scaleCalibration.isSet && scaleCalibration.metersPerPixel > 0) {
        const midX = (marker1.left! + marker2.left!) / 2;
        const midY = (marker1.top! + marker2.top!) / 2;
        const realWorldDistance = distance * scaleCalibration.metersPerPixel;
        
        label.set({
          left: midX,
          top: midY - 40,
          text: `SCALE: ${realWorldDistance.toFixed(2)}m\n1px = ${scaleCalibration.metersPerPixel.toFixed(4)}m`
        });
      }

      fabricCanvas.renderAll();

      // Update scale calibration if it was already set
      if (scaleCalibration.isSet && scaleCalibration.metersPerPixel > 0) {
        // Save to database after short delay (debounce)
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          try {
            const [marker1, marker2] = scaleObjects.markers;
            const { error } = await supabase
              .from("floor_plans")
              .update({ 
                scale_meters_per_pixel: scaleCalibration.metersPerPixel,
                scale_point1: { x: marker1.left, y: marker1.top },
                scale_point2: { x: marker2.left, y: marker2.top }
              })
              .eq("id", floorPlanId);
            
            if (!error) {
              toast.success(`Scale updated: 1px = ${scaleCalibration.metersPerPixel.toFixed(4)}m`, {
                duration: 1500
              });
            }
          } catch (err) {
            console.error("Error saving scale:", err);
          }
        }, 1000);
      }
    };

    const handleMarkerMove = () => {
      updateScaleLine();
    };

    scaleObjects.markers.forEach(marker => {
      marker.on('moving', handleMarkerMove);
      marker.on('modified', handleMarkerMove);
    });

    return () => {
      clearTimeout(saveTimeout);
      scaleObjects.markers.forEach(marker => {
        marker.off('moving', handleMarkerMove);
        marker.off('modified', handleMarkerMove);
      });
    };
  }, [fabricCanvas, scaleObjects, scaleCalibration, floorPlanId]);

  // Handle canvas drawing interactions
  useEffect(() => {
    if (!fabricCanvas) return;

    // Track if we just finished panning to prevent accidental clicks
    let justPanned = false;

    const handleCanvasClick = (opt: any) => {
      // Ignore clicks right after panning
      if (justPanned) {
        justPanned = false;
        return;
      }
      
      // Ignore clicks from middle button
      const evt = opt.e as MouseEvent;
      if (evt.button === 1) return;
      
      if (activeTool === "pan" || activeTool === "select") return;
      
      const pointer = fabricCanvas.getPointer(opt.e);
      const point = new Point(pointer.x, pointer.y);

      // Scale tool (works even when scale is not set)
      if (activeTool === "scale") {
        // Draw a moveable marker at click point
        const marker = new Circle({
          left: point.x,
          top: point.y,
          radius: 8,
          fill: "#ef4444",
          stroke: "#dc2626",
          strokeWidth: 3,
          selectable: true,
          hasControls: false,
          hasBorders: false,
          lockRotation: true,
          originX: 'center',
          originY: 'center',
        });
        
        fabricCanvas.add(marker);
        fabricCanvas.renderAll();
        
        if (scalePoints.length === 0) {
          setScalePoints([point]);
          setScaleObjects(prev => ({ ...prev, markers: [marker] }));
          toast.info("Click the end point of the known distance");
        } else {
          // Draw line between the two points
          const line = new Line([scalePoints[0].x, scalePoints[0].y, point.x, point.y], {
            stroke: "#ef4444",
            strokeWidth: 3,
            selectable: false,
            evented: false,
            strokeDashArray: [10, 5],
          });
          fabricCanvas.add(line);
          
          // Update scale objects
          setScaleObjects(prev => ({ 
            line, 
            markers: [...prev.markers, marker],
            label: null
          }));
          
          const distance = Math.sqrt(
            Math.pow(point.x - scalePoints[0].x, 2) + 
            Math.pow(point.y - scalePoints[0].y, 2)
          );
          setScaleLinePixels(distance);
          setScaleDialogOpen(true);
          
          // Don't clear points yet - keep them for editing
        }
        return;
      }
      
      // All other tools require scale to be set
      if (!scaleCalibration.isSet) {
        toast.error("Please set the scale first using the Scale tool");
        return;
      }

      // Equipment placement
      const equipmentTools: Tool[] = Object.keys(EQUIPMENT_SIZES) as EquipmentType[];
      if (equipmentTools.includes(activeTool)) {
        const newEquipment = {
          id: crypto.randomUUID(),
          type: activeTool as EquipmentType,
          x: point.x,
          y: point.y,
          rotation,
          properties: {},
        };
        
        setProjectData(prev => ({
          ...prev,
          equipment: [...prev.equipment, newEquipment],
        }));
        
        // Draw the equipment symbol on canvas
        drawEquipmentSymbol(newEquipment);
        toast.success(`${activeTool} placed`);
        return;
      }

      // Line drawing tools
      const lineTools: Tool[] = ["line-mv", "line-lv", "line-dc", "zone", "cable-tray", "telkom-basket", "security-basket", "sleeves", "powerskirting", "p2000", "p8000", "p9000"];
      if (lineTools.includes(activeTool)) {
        setIsDrawing(true);
        const newPoints = [...drawingPoints, point];
        setDrawingPoints(newPoints);
        
        // Draw a visual marker at click point
        const marker = new Circle({
          left: point.x - 4,
          top: point.y - 4,
          radius: 4,
          fill: getToolColor(activeTool),
          stroke: "#ffffff",
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(marker);
        
        // Update preview
        if (previewLine) {
          fabricCanvas.remove(previewLine);
        }
        
        const line = new Polyline(newPoints.map(p => ({ x: p.x, y: p.y })), {
          stroke: getToolColor(activeTool),
          strokeWidth: 2,
          fill: null,
          selectable: false,
          evented: false,
        });
        
        setPreviewLine(line);
        fabricCanvas.add(line);
        fabricCanvas.renderAll();
        
        if (newPoints.length === 1) {
          toast.info("Continue clicking to draw. Double-click to finish");
        }
      }
    };

    const handleMouseMove = (opt: any) => {
      if (!scaleCalibration.isSet) return;
      
      const pointer = fabricCanvas.getPointer(opt.e);
      const point = new Point(pointer.x, pointer.y);

      // Equipment preview
      const equipmentTools: Tool[] = Object.keys(EQUIPMENT_SIZES) as EquipmentType[];
      if (equipmentTools.includes(activeTool)) {
        if (equipmentPreview) {
          fabricCanvas.remove(equipmentPreview);
        }
        
        const realSize = EQUIPMENT_SIZES[activeTool as EquipmentType];
        const pixelSize = realSize / scaleCalibration.metersPerPixel;
        
        const preview = new Circle({
          left: point.x - pixelSize / 2,
          top: point.y - pixelSize / 2,
          radius: pixelSize / 2,
          fill: "rgba(59, 130, 246, 0.3)",
          stroke: "#3b82f6",
          strokeWidth: 2,
          selectable: false,
          evented: false,
          angle: rotation,
        });
        
        setEquipmentPreview(preview);
        fabricCanvas.add(preview);
        fabricCanvas.renderAll();
      }

      // Line drawing preview
      if (isDrawing && drawingPoints.length > 0) {
        if (previewLine) {
          fabricCanvas.remove(previewLine);
        }
        
        const allPoints = [...drawingPoints, point];
        const line = new Polyline(allPoints.map(p => ({ x: p.x, y: p.y })), {
          stroke: getToolColor(activeTool),
          strokeWidth: 2,
          fill: null,
          selectable: false,
          evented: false,
        });
        
        setPreviewLine(line);
        fabricCanvas.add(line);
        fabricCanvas.renderAll();
      }
    };

    fabricCanvas.on("mouse:down", handleCanvasClick);
    
    // Double-click to finish drawing
    fabricCanvas.on("mouse:dblclick", (opt) => {
      if (!isDrawing || drawingPoints.length < 2) return;
      
      const lineTools: Tool[] = ["line-mv", "line-lv", "line-dc"];
      const isCableTool = lineTools.includes(activeTool);
      
      if (isCableTool) {
        // For cables, store points and open dialog for from/to details
        pendingCablePointsRef.current = drawingPoints;
        setCableDialogOpen(true);
      } else if (activeTool === "zone") {
        // For zones, save immediately with default type
        const newZone: Zone = {
          id: crypto.randomUUID(),
          type: "supply",
          points: drawingPoints,
          color: "#10b981",
        };
        
        setProjectData(prev => ({
          ...prev,
          zones: [...prev.zones, newZone],
        }));
        
        toast.success("Zone created");
      } else {
        // For containment types, store points and open dialog
        const containmentTools: Tool[] = ["cable-tray", "telkom-basket", "security-basket", "sleeves", "powerskirting", "p2000", "p8000", "p9000"];
        if (containmentTools.includes(activeTool)) {
          pendingContainmentPointsRef.current = drawingPoints;
          setCurrentContainmentType(activeTool);
          setContainmentDialogOpen(true);
        }
      }
      
      // Clean up drawing state
      setIsDrawing(false);
      setDrawingPoints([]);
      if (previewLine) {
        fabricCanvas.remove(previewLine);
        setPreviewLine(null);
      }
      fabricCanvas.renderAll();
      
      toast.success("Line completed - enter details");
    });
    fabricCanvas.on("mouse:move", handleMouseMove);

    return () => {
      fabricCanvas.off("mouse:down", handleCanvasClick);
      fabricCanvas.off("mouse:move", handleMouseMove);
    };
  }, [fabricCanvas, activeTool, scaleCalibration, drawingPoints, isDrawing, rotation, scalePoints, previewLine, equipmentPreview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setRotation((prev) => (prev + 45) % 360);
      } else if (e.key === "Escape") {
        cancelDrawing();
      } else if (e.key === "Enter" && isDrawing) {
        finishDrawing();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isDrawing, drawingPoints, activeTool]);

  const getToolColor = (tool: Tool): string => {
    const colors: Record<string, string> = {
      "line-mv": "#dc2626",
      "line-lv": "#2563eb",
      "line-dc": "#ea580c",
      "zone": "#10b981",
      "cable-tray": "#8b5cf6",
      "telkom-basket": "#f59e0b",
      "security-basket": "#ec4899",
      "sleeves": "#14b8a6",
      "powerskirting": "#6366f1",
      "p2000": "#84cc16",
      "p8000": "#06b6d4",
      "p9000": "#a855f7",
    };
    return colors[tool] || "#000000";
  };

  const drawEquipmentSymbol = (equipment: any) => {
    if (!fabricCanvas || !scaleCalibration.isSet) return;
    
    const realSize = EQUIPMENT_SIZES[equipment.type as EquipmentType];
    const pixelSize = realSize / scaleCalibration.metersPerPixel;
    
    // Calculate scale factor for IEC symbol rendering
    // Base IEC symbols are designed at 20px, scale them proportionally
    const symbolScale = pixelSize / 20;
    
    // Create IEC 60617 compliant symbol
    const symbol = createIECSymbol(equipment.type as EquipmentType, symbolScale);
    
    symbol.set({
      left: equipment.x,
      top: equipment.y,
      angle: equipment.rotation || 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
    });
    
    // Store equipment data with the symbol for later reference
    symbol.set({ equipmentId: equipment.id, equipmentType: equipment.type });
    
    fabricCanvas.add(symbol);
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 2) {
      toast.error("Draw at least 2 points");
      return;
    }

    const length = calculatePathLength(drawingPoints);
    const lengthMeters = length * scaleCalibration.metersPerPixel;

    // Handle LV/AC cables
    if (activeTool === "line-lv") {
      pendingCablePointsRef.current = drawingPoints;
      setCableDialogOpen(true);
      cleanupDrawing();
      return;
    }

    // Handle containment with size selection
    if (["cable-tray", "telkom-basket", "security-basket"].includes(activeTool)) {
      pendingContainmentPointsRef.current = drawingPoints;
      setCurrentContainmentType(activeTool);
      setContainmentDialogOpen(true);
      cleanupDrawing();
      return;
    }

    // Handle other line types
    if (["line-mv", "line-dc"].includes(activeTool)) {
      const newCable = {
        id: crypto.randomUUID(),
        type: activeTool.replace("line-", "") as "mv" | "dc",
        points: drawingPoints.map(p => ({ x: p.x, y: p.y })),
        color: getToolColor(activeTool),
        lengthMeters,
      };
      
      setProjectData(prev => ({
        ...prev,
        cables: [...prev.cables, newCable],
      }));
      
      toast.success(`Cable added: ${lengthMeters.toFixed(2)}m`);
    }

    // Handle other containment types (no size needed)
    if (["sleeves", "powerskirting", "p2000", "p8000", "p9000"].includes(activeTool)) {
      const newContainment = {
        id: crypto.randomUUID(),
        type: activeTool as any,
        points: drawingPoints.map(p => ({ x: p.x, y: p.y })),
        lengthMeters,
      };
      
      setProjectData(prev => ({
        ...prev,
        containment: [...prev.containment, newContainment],
      }));
      
      toast.success(`${activeTool} added: ${lengthMeters.toFixed(2)}m`);
    }

    // Handle zones
    if (activeTool === "zone") {
      const area = calculatePolygonArea(drawingPoints);
      const areaSqm = area * Math.pow(scaleCalibration.metersPerPixel, 2);
      
      const newZone = {
        id: crypto.randomUUID(),
        type: "supply" as const,
        points: drawingPoints.map(p => ({ x: p.x, y: p.y })),
        color: getToolColor(activeTool),
        areaSqm,
      };
      
      setProjectData(prev => ({
        ...prev,
        zones: [...prev.zones, newZone],
      }));
      
      toast.success(`Zone added: ${areaSqm.toFixed(2)}m²`);
    }

    cleanupDrawing();
  };

  const cancelDrawing = () => {
    cleanupDrawing();
    setActiveTool("select");
    toast.info("Drawing cancelled");
  };

  const cleanupDrawing = () => {
    if (previewLine && fabricCanvas) {
      fabricCanvas.remove(previewLine);
      fabricCanvas.renderAll();
    }
    setIsDrawing(false);
    setDrawingPoints([]);
    setPreviewLine(null);
  };

  const calculatePathLength = (points: Point[]): number => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  };

  const calculatePolygonArea = (points: Point[]): number => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  const handleCableDetails = (details: any) => {
    const points = pendingCablePointsRef.current;
    if (points.length < 2) return;

    const pathLength = calculatePathLength(points) * scaleCalibration.metersPerPixel;
    const totalLength = pathLength + details.startHeight + details.endHeight;

    // Determine cable type based on which tool was used
    let cableRouteType: "lv" | "mv" | "dc" = "lv";
    let colorOverride = getToolColor("line-lv");
    
    if (activeTool === "line-mv") {
      cableRouteType = "mv";
      colorOverride = SPECIAL_CABLE_STYLES.mv.color;
    } else if (activeTool === "line-dc") {
      cableRouteType = "dc";
      colorOverride = SPECIAL_CABLE_STYLES.dc.color;
    }

    const newCable = {
      id: crypto.randomUUID(),
      type: cableRouteType,
      points: points.map(p => ({ x: p.x, y: p.y })),
      cableType: details.cableType,
      supplyFrom: details.supplyFrom,
      supplyTo: details.supplyTo,
      color: colorOverride,
      lengthMeters: totalLength,
    };
    
    setProjectData(prev => ({
      ...prev,
      cables: [...prev.cables, newCable],
    }));
    
    setCableDialogOpen(false);
    pendingCablePointsRef.current = [];
    toast.success(`${cableRouteType.toUpperCase()} Cable added: ${details.supplyFrom} → ${details.supplyTo} (${totalLength.toFixed(2)}m)`);
  };

  const handleContainmentSize = (size: ContainmentSize) => {
    const points = pendingContainmentPointsRef.current;
    if (points.length < 2) return;

    const lengthMeters = calculatePathLength(points) * scaleCalibration.metersPerPixel;

    const newContainment = {
      id: crypto.randomUUID(),
      type: currentContainmentType as any,
      points: points.map(p => ({ x: p.x, y: p.y })),
      size,
      lengthMeters,
    };
    
    setProjectData(prev => ({
      ...prev,
      containment: [...prev.containment, newContainment],
    }));
    
    setContainmentDialogOpen(false);
    pendingContainmentPointsRef.current = [];
    setCurrentContainmentType("");
    toast.success(`${currentContainmentType} added: ${lengthMeters.toFixed(2)}m (${size})`);
  };

  // Load existing floor plan and markups on component mount
  useEffect(() => {
    if (!fabricCanvas || !floorPlanId) return;

    const loadFloorPlan = async () => {
      setLoading(true);
      try {
        const { data: fp, error } = await supabase
          .from("floor_plans")
          .select("*")
          .eq("id", floorPlanId)
          .single();

        if (error) throw error;

        if (fp) {
          setFloorPlanName(fp.name);
          setDesignPurpose(fp.design_purpose as DesignPurpose);
          
          // Load scale and recreate visual indicators
          if (fp.scale_meters_per_pixel) {
            setScaleCalibration({
              metersPerPixel: fp.scale_meters_per_pixel,
              isSet: true,
            });
            
            // Recreate scale line and markers if points are saved
            if (fp.scale_point1 && fp.scale_point2) {
              const point1 = fp.scale_point1 as { x: number; y: number };
              const point2 = fp.scale_point2 as { x: number; y: number };
              
              // Create markers with dynamic sizing
              const marker1 = new Circle({
                left: point1.x,
                top: point1.y,
                radius: 10 / currentZoom,
                fill: "#22c55e",
                stroke: "#16a34a",
                strokeWidth: 3 / currentZoom,
                selectable: true,
                hasControls: false,
                hasBorders: false,
                lockRotation: true,
                originX: 'center',
                originY: 'center',
              });
              
              const marker2 = new Circle({
                left: point2.x,
                top: point2.y,
                radius: 10 / currentZoom,
                fill: "#22c55e",
                stroke: "#16a34a",
                strokeWidth: 3 / currentZoom,
                selectable: true,
                hasControls: false,
                hasBorders: false,
                lockRotation: true,
                originX: 'center',
                originY: 'center',
              });
              
              // Create line with dynamic stroke width
              const line = new Line([point1.x, point1.y, point2.x, point2.y], {
                stroke: "#22c55e",
                strokeWidth: 3 / currentZoom,
                selectable: false,
                evented: false,
                strokeDashArray: [10 / currentZoom, 5 / currentZoom],
              });
              
              // Calculate distance for label
              const distance = Math.sqrt(
                Math.pow(point2.x - point1.x, 2) + 
                Math.pow(point2.y - point1.y, 2)
              );
              const realWorldDistance = distance * fp.scale_meters_per_pixel;
              const midX = (point1.x + point2.x) / 2;
              const midY = (point1.y + point2.y) / 2;
              
              // Create label with dynamic sizing
              const label = new Text(`SCALE: ${realWorldDistance.toFixed(2)}m\n1px = ${fp.scale_meters_per_pixel.toFixed(4)}m`, {
                left: midX,
                top: midY - 40 / currentZoom,
                fontSize: 16 / currentZoom,
                fontWeight: 'bold',
                fill: '#22c55e',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: 8 / currentZoom,
                textAlign: 'center',
                selectable: false,
                evented: false,
                stroke: '#16a34a',
                strokeWidth: 0.5 / currentZoom,
                originX: 'center',
                originY: 'center',
              });
              
              fabricCanvas.add(line, marker1, marker2, label);
              setScaleObjects({ line, markers: [marker1, marker2], label });
              
              toast.success(`Scale loaded: 1px = ${fp.scale_meters_per_pixel.toFixed(4)}m`);
            } else {
              toast.success(`Scale loaded: 1px = ${fp.scale_meters_per_pixel.toFixed(4)}m (no visual reference)`);
            }
          }
          
          // Load PDF image
          if (fp.pdf_url) {
            const img = await FabricImage.fromURL(fp.pdf_url, { crossOrigin: "anonymous" });
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
            setPdfImageUrl(fp.pdf_url);
          }
          
          // Load all markups
          await loadExistingMarkups(fp.id);
          
          toast.success("Floor plan loaded successfully");
        }
      } catch (error: any) {
        console.error("Error loading floor plan:", error);
        toast.error(error.message || "Failed to load floor plan");
      } finally {
        setLoading(false);
      }
    };

    loadFloorPlan();
  }, [fabricCanvas, floorPlanId]);

  // Render loaded items on canvas when projectData changes
  useEffect(() => {
    if (!fabricCanvas || !scaleCalibration.isSet) return;
    
    // Clear existing objects (except PDF background)
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (obj !== objects[0]) { // Keep first object (PDF image)
        fabricCanvas.remove(obj);
      }
    });
    
    // Render equipment
    projectData.equipment.forEach(equipment => {
      drawEquipmentSymbol(equipment);
    });
    
    // Render cables with color-coded sizes and line types
    projectData.cables.forEach(cable => {
      let strokeStyle, strokeWidth, dashArray;
      
      // Determine cable style based on type and size
      if (cable.type === "mv") {
        const style = SPECIAL_CABLE_STYLES.mv;
        strokeStyle = style.color;
        strokeWidth = style.strokeWidth;
        dashArray = style.dashArray;
      } else if (cable.type === "dc") {
        const style = SPECIAL_CABLE_STYLES.dc;
        strokeStyle = style.color;
        strokeWidth = style.strokeWidth;
        dashArray = style.dashArray;
      } else if (cable.cableType) {
        // LV cable with specific size
        const style = CABLE_STYLES[cable.cableType];
        strokeStyle = style.color;
        strokeWidth = style.strokeWidth;
        dashArray = style.dashArray;
      } else {
        // Default LV cable
        strokeStyle = "#2563EB";
        strokeWidth = 2;
        dashArray = undefined;
      }
      
      const line = new Polyline(
        cable.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: strokeStyle,
          strokeWidth: strokeWidth / currentZoom,
          strokeDashArray: dashArray ? dashArray.map(d => d / currentZoom) : undefined,
          fill: null,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          cornerSize: 10 / currentZoom,
          cornerColor: strokeStyle,
          cornerStyle: 'circle',
          transparentCorners: false,
          objectCaching: false,
        }
      );
      
      // Store cable ID on the line for updates
      line.set('cableId', cable.id);
      
      // Handle line point modifications
      line.on('modified', async () => {
        const points = line.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        // Update local state
        setProjectData(prev => ({
          ...prev,
          cables: prev.cables.map(c => 
            c.id === cable.id ? { ...c, points } : c
          )
        }));
        
        // Save to database
        try {
          const { error } = await supabase
            .from('cable_routes')
            .update({ points: points })
            .eq('id', cable.id);
            
          if (!error) {
            toast.success('Cable updated', { duration: 1000 });
          }
        } catch (err) {
          console.error('Error updating cable:', err);
        }
      });
      
      fabricCanvas.add(line);
    });
    
    // Render zones with dynamic node sizing
    projectData.zones.forEach(zone => {
      const polygon = new Polyline(
        zone.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: zone.color || "#10b981",
          strokeWidth: 2 / currentZoom,
          fill: `${zone.color || "#10b981"}33`,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          cornerSize: 10 / currentZoom,
          cornerColor: zone.color || "#10b981",
          cornerStyle: 'circle',
          transparentCorners: false,
          objectCaching: false,
        }
      );
      
      polygon.set('zoneId', zone.id);
      
      // Handle zone modifications
      polygon.on('modified', async () => {
        const points = polygon.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        setProjectData(prev => ({
          ...prev,
          zones: prev.zones.map(z => 
            z.id === zone.id ? { ...z, points } : z
          )
        }));
        
        // Zones are saved in floor_plan_data table, trigger a full save
        toast.success('Zone updated - click Save to persist changes', { duration: 2000 });
      });
      
      fabricCanvas.add(polygon);
    });
    
    // Render containment with dynamic node sizing
    projectData.containment.forEach(route => {
      const line = new Polyline(
        route.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: getToolColor(route.type),
          strokeWidth: 3 / currentZoom,
          strokeDashArray: [5 / currentZoom, 5 / currentZoom],
          fill: null,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          cornerSize: 10 / currentZoom,
          cornerColor: getToolColor(route.type),
          cornerStyle: 'circle',
          transparentCorners: false,
          objectCaching: false,
        }
      );
      
      line.set('containmentId', route.id);
      
      // Handle containment modifications
      line.on('modified', async () => {
        const points = line.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        setProjectData(prev => ({
          ...prev,
          containment: prev.containment.map(c => 
            c.id === route.id ? { ...c, points } : c
          )
        }));
        
        // Containment is saved in floor_plan_data table, trigger a full save
        toast.success('Containment updated - click Save to persist changes', { duration: 2000 });
      });
      
      fabricCanvas.add(line);
    });
    
    fabricCanvas.renderAll();
  }, [projectData, fabricCanvas, scaleCalibration]);

  // Update node sizes when zoom changes
  useEffect(() => {
    if (!fabricCanvas) return;

    // Update scale markers and line
    if (scaleObjects.markers.length === 2 && scaleObjects.line) {
      scaleObjects.markers.forEach(marker => {
        marker.set({
          radius: 10 / currentZoom,
          strokeWidth: 3 / currentZoom,
        });
      });
      
      scaleObjects.line.set({
        strokeWidth: 3 / currentZoom,
        strokeDashArray: [10 / currentZoom, 5 / currentZoom],
      });
      
      if (scaleObjects.label) {
        scaleObjects.label.set({
          fontSize: 16 / currentZoom,
          padding: 8 / currentZoom,
          strokeWidth: 0.5 / currentZoom,
        });
      }
    }

    // Update all polylines (cables, zones, and containment)
    fabricCanvas.getObjects().forEach(obj => {
      if (obj instanceof Polyline) {
        const isCable = obj.get('cableId');
        const isZone = obj.get('zoneId');
        const isContainment = obj.get('containmentId');
        
        // Different stroke widths for different types
        let baseStrokeWidth = 3;
        if (isZone) {
          baseStrokeWidth = 2;
        } else if (isCable) {
          // Cables might have different widths based on type
          baseStrokeWidth = obj.strokeWidth ? obj.strokeWidth * currentZoom : 2;
        }
        
        obj.set({
          strokeWidth: baseStrokeWidth / currentZoom,
          cornerSize: 10 / currentZoom,
        });
        
        // Update dash arrays if present
        if (obj.strokeDashArray && obj.strokeDashArray.length > 0) {
          const baseDashLength = isContainment ? 5 : 10;
          obj.set({
            strokeDashArray: [baseDashLength / currentZoom, baseDashLength / currentZoom],
          });
        }
      }
    });

    fabricCanvas.renderAll();
  }, [currentZoom, fabricCanvas, scaleObjects]);

  const handlePDFLoaded = async (imageUrl: string, uploadedPdfUrl?: string) => {
    // This function is now only for replacing the PDF on an existing floor plan
    if (!fabricCanvas) {
      toast.error("Canvas not ready. Please refresh the page and try again.");
      return;
    }

    try {
      setPdfImageUrl(imageUrl);
      const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });

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

      fabricCanvas.remove(...fabricCanvas.getObjects());
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();

      toast.success("PDF updated! Please set the scale to begin marking up.");
    } catch (error) {
      console.error("PDF loading error:", error);
      toast.error("Failed to display PDF on canvas");
    }
  };

  const loadExistingMarkups = async (fpId: string) => {
    setLoading(true);
    try {
      // Load equipment
      const { data: equipment } = await supabase
        .from("equipment_placements")
        .select("*")
        .eq("floor_plan_id", fpId);

      // Load cables (excluding containment routes stored as 'tray')
      const { data: cables } = await supabase
        .from("cable_routes")
        .select("*")
        .eq("floor_plan_id", fpId)
        .neq("route_type", "tray");

      // Load zones (may not exist yet in types)
      let zonesQuery: any[] = [];
      try {
        const { data } = await supabase
          .from("zones" as any)
          .select("*")
          .eq("floor_plan_id", fpId);
        zonesQuery = data || [];
      } catch (e) {
        console.log("Zones table not ready yet");
      }

      // Load PV arrays (may not exist yet in types)
      let pvQuery: any[] = [];
      try {
        const { data } = await supabase
          .from("pv_arrays" as any)
          .select("*")
          .eq("floor_plan_id", fpId);
        pvQuery = data || [];
      } catch (e) {
        console.log("PV arrays table not ready yet");
      }

      // Load containment from cable_routes with type 'tray'
      const { data: containmentQuery } = await supabase
        .from("cable_routes")
        .select("*")
        .eq("floor_plan_id", fpId)
        .eq("route_type", "tray");

      // Update project data
      setProjectData({
        equipment: equipment?.map((item: any) => ({
          id: item.id,
          type: item.equipment_type as any,
          x: Number(item.x_position),
          y: Number(item.y_position),
          rotation: item.rotation || 0,
          properties: item.properties as any,
        })) || [],
        cables: cables?.map((cable: any) => ({
          id: cable.id,
          type: cable.route_type === "lv_ac" ? "lv" : cable.route_type,
          points: cable.points as any,
          cableType: cable.cable_spec as any,
          supplyFrom: cable.supply_from,
          supplyTo: cable.supply_to,
          color: cable.color,
          lengthMeters: Number(cable.length_meters),
        })) || [],
        zones: zonesQuery?.map((zone: any) => ({
          id: zone.id,
          type: zone.zone_type as any,
          name: zone.name,
          points: zone.points as any,
          color: zone.color,
          areaSqm: Number(zone.area_sqm),
          roofPitch: Number(zone.roof_pitch),
          roofAzimuth: Number(zone.roof_azimuth),
        })) || [],
        containment: containmentQuery?.map((route: any) => ({
          id: route.id,
          type: route.name || "cable-tray",
          points: route.points as any,
          size: route.size as any,
          lengthMeters: Number(route.length_meters),
        })) || [],
        pvArrays: pvQuery?.map((array: any) => ({
          id: array.id,
          x: Number(array.x_position),
          y: Number(array.y_position),
          rows: array.rows,
          columns: array.columns,
          rotation: array.rotation || 0,
          orientation: array.orientation as any,
        })) || [],
      });

      toast.success("Loaded existing markups");
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load existing markups");
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = (tool: Tool) => {
    if (tool === "rotate") {
      setRotation((prev) => (prev + 45) % 360);
      return;
    }
    
    // Clean up any active drawing when switching tools
    if (isDrawing) {
      cleanupDrawing();
    }
    
    // Remove equipment preview when switching away from equipment tools
    if (equipmentPreview && fabricCanvas) {
      fabricCanvas.remove(equipmentPreview);
      setEquipmentPreview(null);
    }
    
    setActiveTool(tool);
    
    // Provide guidance for scale tool
    if (tool === "scale" && !scaleCalibration.isSet) {
      toast.info("Click two points on a known distance to set scale");
    } else if (tool === "scale" && scaleCalibration.isSet) {
      toast.info("Click two points to recalibrate the scale");
    }
    
    // Provide guidance for drawing tools
    const drawingTools = ["line-mv", "line-lv", "line-dc", "zone", "cable-tray", "telkom-basket", "security-basket", "sleeves", "powerskirting", "p2000", "p8000", "p9000"];
    if (drawingTools.includes(tool)) {
      toast.info("Click to add points. Press Enter to finish, Escape to cancel");
    }
    
    // Provide guidance for equipment tools
    const equipmentTools = Object.keys(EQUIPMENT_SIZES) as EquipmentType[];
    if (equipmentTools.includes(tool as EquipmentType)) {
      if (!scaleCalibration.isSet) {
        toast.error("Please set the scale first");
        setActiveTool("select");
        return;
      }
      toast.info("Click to place equipment. Press R to rotate");
    }
  };

  const handleToggleSnap = () => {
    setSnapEnabled((prev) => !prev);
  };

  const handleDesignPurposeSelect = (purpose: DesignPurpose) => {
    setDesignPurpose(purpose);
    toast.success(`Design purpose set to: ${purpose.replace(/_/g, " ")}`);
  };

  const handleScaleSet = async (metersValue: number) => {
    if (!scaleLinePixels || scaleLinePixels === 0) {
      toast.error("Invalid scale line drawn");
      return;
    }
    
    const metersPerPixel = metersValue / scaleLinePixels;
    setScaleCalibration({ metersPerPixel, isSet: true });
    setScaleCalibrationPoints(scalePoints);
    setScaleDialogOpen(false);
    setScaleLinePixels(0);
    // Don't clear scalePoints - keep them for the markers
    setActiveTool("select");
    
    // The scale line and markers are already on the canvas and editable
    // Update their appearance and add annotation label
    if (fabricCanvas && scaleObjects.line && scaleObjects.markers.length === 2) {
      const [marker1, marker2] = scaleObjects.markers;
      
      scaleObjects.line.set({
        stroke: "#22c55e",
        strokeWidth: 3 / currentZoom,
      });
      
      scaleObjects.markers.forEach(marker => {
        marker.set({
          fill: "#22c55e",
          stroke: "#16a34a",
          radius: 10 / currentZoom,
          strokeWidth: 3 / currentZoom,
        });
      });
      
      // Calculate midpoint for label placement
      const midX = (marker1.left! + marker2.left!) / 2;
      const midY = (marker1.top! + marker2.top!) / 2;
      
      // Create annotation label showing scale with dynamic sizing
      const scaleLabel = new Text(`SCALE: ${metersValue.toFixed(2)}m\n1px = ${metersPerPixel.toFixed(4)}m`, {
        left: midX,
        top: midY - 40 / currentZoom,
        fontSize: 16 / currentZoom,
        fontWeight: 'bold',
        fill: '#22c55e',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 8 / currentZoom,
        textAlign: 'center',
        selectable: false,
        evented: false,
        stroke: '#16a34a',
        strokeWidth: 0.5 / currentZoom,
      });
      
      fabricCanvas.add(scaleLabel);
      setScaleObjects(prev => ({ ...prev, label: scaleLabel }));
      
      fabricCanvas.renderAll();
    }
    
    // Save scale to database if floor plan exists
    if (floorPlanId) {
      const { error } = await supabase
        .from("floor_plans")
        .update({ 
          scale_meters_per_pixel: metersPerPixel,
          scale_point1: { x: scaleObjects.markers[0].left, y: scaleObjects.markers[0].top },
          scale_point2: { x: scaleObjects.markers[1].left, y: scaleObjects.markers[1].top }
        })
        .eq("id", floorPlanId);
      
      if (error) {
        console.error("Error saving scale:", error);
        toast.error("Scale set but failed to save to database");
      } else {
        toast.success(`Scale calibrated and saved: 1px = ${metersPerPixel.toFixed(4)}m (drag markers to adjust)`);
      }
    } else {
      toast.success(`Scale calibrated: 1px = ${metersPerPixel.toFixed(4)}m (drag markers to adjust)`);
    }
  };

  const handleScaleEdit = async (newScale: number) => {
    if (newScale <= 0) {
      toast.error("Invalid scale value");
      return;
    }
    
    const oldScale = scaleCalibration.metersPerPixel;
    const scaleFactor = oldScale / newScale;
    
    // Update scale calibration
    setScaleCalibration({ metersPerPixel: newScale, isSet: true });
    setScaleEditDialogOpen(false);
    
    // Rescale all equipment
    const rescaledEquipment = projectData.equipment.map(eq => ({
      ...eq,
      // Equipment positions don't change, but their rendered size will
    }));
    
    // Recalculate cable lengths
    const rescaledCables = projectData.cables.map(cable => {
      if (cable.lengthMeters) {
        // Length in meters stays the same, but pixel length changes
        return cable;
      }
      return cable;
    });
    
    setProjectData(prev => ({
      ...prev,
      equipment: rescaledEquipment,
      cables: rescaledCables,
    }));
    
    // Save new scale to database
    if (floorPlanId) {
      const { error } = await supabase
        .from("floor_plans")
        .update({ scale_meters_per_pixel: newScale })
        .eq("id", floorPlanId);
      
      if (error) {
        console.error("Error saving scale:", error);
        toast.error("Failed to save new scale");
      } else {
        toast.success(`Scale updated: 1 pixel = ${newScale.toFixed(6)} meters. All equipment rescaled.`);
      }
    }
  };

  const handleSave = async () => {
    if (!projectId || !floorPlanId) {
      toast.error("No project or floor plan selected");
      return;
    }

    if (!scaleCalibration.isSet) {
      toast.error("Please set the scale before saving");
      return;
    }

    setSaving(true);
    try {
      // Save scale to floor plan
      const { error: updateError } = await supabase
        .from("floor_plans")
        .update({
          scale_meters_per_pixel: scaleCalibration.metersPerPixel,
        })
        .eq("id", floorPlanId);

      if (updateError) throw updateError;
      // Save equipment placements
      const { error: equipmentError } = await supabase
        .from("equipment_placements")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (equipmentError) throw equipmentError;

      if (projectData.equipment.length > 0) {
        const { error: insertEquipmentError } = await supabase
          .from("equipment_placements")
          .insert(
            projectData.equipment.map((item) => ({
              floor_plan_id: floorPlanId,
              equipment_type: item.type,
              x_position: item.x,
              y_position: item.y,
              rotation: item.rotation,
              properties: item.properties || {},
              name: item.properties?.name,
            }))
          );

        if (insertEquipmentError) throw insertEquipmentError;
      }

      // Save cable routes
      const { error: cablesError } = await supabase
        .from("cable_routes")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (cablesError) throw cablesError;

      if (projectData.cables.length > 0) {
        const { error: insertCablesError } = await supabase
          .from("cable_routes")
          .insert(
            projectData.cables.map((cable) => ({
              floor_plan_id: floorPlanId,
              route_type: (cable.type === "lv" ? "lv_ac" : cable.type) as "dc" | "lv_ac" | "mv",
              points: cable.points as any,
              cable_spec: cable.cableType,
              supply_from: cable.supplyFrom,
              supply_to: cable.supplyTo,
              color: cable.color,
              length_meters: cable.lengthMeters,
            }))
          );

        if (insertCablesError) throw insertCablesError;
      }

      // Save zones
      const { error: zonesError } = await supabase
        .from("zones")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (zonesError) throw zonesError;

      if (projectData.zones.length > 0) {
        const { error: insertZonesError } = await supabase
          .from("zones")
          .insert(
            projectData.zones.map((zone) => ({
              floor_plan_id: floorPlanId,
              zone_type: zone.type,
              name: zone.name,
              points: zone.points,
              color: zone.color,
              area_sqm: zone.areaSqm,
              roof_pitch: zone.roofPitch,
              roof_azimuth: zone.roofAzimuth,
            }))
          );

        if (insertZonesError) throw insertZonesError;
      }

      // Save containment routes
      if (projectData.containment.length > 0) {
        // Save as cable_routes with tray type since containment_routes table may not be in types yet
        for (const route of projectData.containment) {
          await supabase.from("cable_routes").insert({
            floor_plan_id: floorPlanId,
            route_type: "tray" as const,
            points: route.points as any,
            size: route.size,
            length_meters: route.lengthMeters,
            name: route.type,
          });
        }
      }

      // Save PV arrays
      const { error: pvError } = await supabase
        .from("pv_arrays")
        .delete()
        .eq("floor_plan_id", floorPlanId);

      if (pvError) throw pvError;

      if (projectData.pvArrays.length > 0) {
        const { error: insertPvError } = await supabase
          .from("pv_arrays")
          .insert(
            projectData.pvArrays.map((array) => ({
              floor_plan_id: floorPlanId,
              x_position: array.x,
              y_position: array.y,
              rows: array.rows,
              columns: array.columns,
              rotation: array.rotation,
              orientation: array.orientation,
              total_panels: array.rows * array.columns,
            }))
          );

        if (insertPvError) throw insertPvError;
      }

      toast.success("All markups saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save markups");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    toast.info("PDF export functionality coming soon");
  };

  const handleGenerateBoQ = () => {
    toast.info("AI Bill of Quantities generation coming soon");
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setRotation((prev) => (prev + 45) % 360);
      } else if (e.key === "Escape") {
        setActiveTool("select");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a project first</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {floorPlanName || "Floor Plan Markup Tool"}
          </h1>
          <p className="text-muted-foreground">
            {designPurpose
              ? `Design Purpose: ${designPurpose.replace(/_/g, " ").toUpperCase()}`
              : "Upload a floor plan to begin"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate("/dashboard/floor-plans")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Floor Plans
          </Button>
          
          {scaleCalibration.isSet && (
            <Button 
              variant="outline" 
              onClick={() => setScaleEditDialogOpen(true)}
              className="gap-2"
            >
              <Ruler className="h-4 w-4" />
              <Badge variant="secondary">
                1:{Math.round(1 / scaleCalibration.metersPerPixel)}
              </Badge>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          <PDFLoader onPDFLoaded={handlePDFLoaded} />
          <Button variant="outline" onClick={handleSave} disabled={saving || !floorPlanId}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleGenerateBoQ}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate BoQ (AI)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2">
          {designPurpose && (
            <Toolbar
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
              designPurpose={designPurpose}
              rotation={rotation}
              snapEnabled={snapEnabled}
              onToggleSnap={handleToggleSnap}
            />
          )}
        </div>

        <div className="col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
              {scaleCalibration.isSet ? (
                <p className="text-xs text-muted-foreground">
                  Scale: {scaleCalibration.metersPerPixel.toFixed(4)} m/px | 
                  {designPurpose && ` Mode: ${designPurpose.replace(/_/g, " ").toUpperCase()}`} | 
                  Use mouse wheel to zoom, Alt+Drag to pan
                </p>
              ) : (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Scale not set - Click "Set Scale" in General tab → Draw 2 points on known distance → Enter meters
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-muted">
                <canvas ref={canvasRef} />
              </div>
              {!pdfImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground">Click "Load PDF" to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <ProjectOverview projectData={projectData} />
        </div>
      </div>

      {!pdfImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">1. Load PDF Floor Plan</h4>
              <p className="text-sm text-muted-foreground">
                Click "Load PDF" to upload your architectural floor plan
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Select Design Purpose</h4>
              <p className="text-sm text-muted-foreground">
                Choose from Budget Markup, PV Design, or Line Shop Measurements
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Set Scale</h4>
              <p className="text-sm text-muted-foreground">
                Calibrate measurements by marking a known distance
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Add Equipment & Routes</h4>
              <p className="text-sm text-muted-foreground">
                Use the toolbar to place equipment, draw cables, and define zones
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <DesignPurposeDialog
        open={pdfImageUrl !== null && designPurpose === null}
        onSelect={handleDesignPurposeSelect}
      />

      <ScaleDialog
        open={scaleDialogOpen}
        pixelLength={scaleLinePixels}
        onConfirm={handleScaleSet}
        onCancel={() => {
          setScaleDialogOpen(false);
          setScaleLinePixels(0);
          setScalePoints([]);
          setActiveTool("select");
          toast.info("Scale calibration cancelled");
        }}
      />

      <ScaleEditDialog
        open={scaleEditDialogOpen}
        currentScale={scaleCalibration.metersPerPixel}
        calibrationPoints={scaleCalibrationPoints}
        onConfirm={handleScaleEdit}
        onCancel={() => setScaleEditDialogOpen(false)}
      />

      <CableDetailsDialog
        open={cableDialogOpen}
        onConfirm={handleCableDetails}
        onCancel={() => {
          setCableDialogOpen(false);
          pendingCablePointsRef.current = [];
        }}
      />

      <ContainmentSizeDialog
        open={containmentDialogOpen}
        containmentType={currentContainmentType}
        onConfirm={handleContainmentSize}
        onCancel={() => {
          setContainmentDialogOpen(false);
          pendingContainmentPointsRef.current = [];
          setCurrentContainmentType("");
        }}
      />
    </div>
  );
};

export default FloorPlan;
