import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas, Image as FabricImage, Point, Line, Circle, Polyline, Rect } from "fabric";
import { supabase } from "@/integrations/supabase/client";
import { PDFLoader } from "@/components/floorplan/PDFLoader";
import { Toolbar } from "@/components/floorplan/Toolbar";
import { ProjectOverview } from "@/components/floorplan/ProjectOverview";
import { DesignPurposeDialog } from "@/components/floorplan/DesignPurposeDialog";
import { ScaleDialog } from "@/components/floorplan/ScaleDialog";
import { CableDetailsDialog } from "@/components/floorplan/CableDetailsDialog";
import { ContainmentSizeDialog } from "@/components/floorplan/ContainmentSizeDialog";
import { EQUIPMENT_SIZES } from "@/components/floorplan/equipmentSizes";
import { DesignPurpose, Tool, ProjectData, ScaleCalibration, EquipmentType, CableType, ContainmentSize } from "@/components/floorplan/types";

const FloorPlan = () => {
  const [projectId] = useState(localStorage.getItem("selectedProjectId"));
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
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
  const [scaleLinePixels, setScaleLinePixels] = useState(0);
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
  const pendingCablePointsRef = useRef<Point[]>([]);
  const pendingContainmentPointsRef = useRef<Point[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: "#f5f5f5",
    });

    // Enable zoom with mouse wheel
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      
      const point = new Point(opt.e.offsetX, opt.e.offsetY);
      canvas.zoomToPoint(point, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Enable panning
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.defaultCursor = "grab";
      }
    });

    canvas.on("mouse:move", (opt) => {
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

    canvas.on("mouse:up", () => {
      canvas.setViewportTransform(canvas.viewportTransform);
      isPanning = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
    });

    setFabricCanvas(canvas);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Handle canvas drawing interactions
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleCanvasClick = (opt: any) => {
      if (activeTool === "pan" || activeTool === "select" || !scaleCalibration.isSet) return;
      
      const pointer = fabricCanvas.getPointer(opt.e);
      const point = new Point(pointer.x, pointer.y);

      // Scale tool
      if (activeTool === "scale") {
        if (scalePoints.length === 0) {
          setScalePoints([point]);
          toast.info("Click the end point of the known distance");
        } else {
          const distance = Math.sqrt(
            Math.pow(point.x - scalePoints[0].x, 2) + 
            Math.pow(point.y - scalePoints[0].y, 2)
          );
          setScaleLinePixels(distance);
          setScaleDialogOpen(true);
          setScalePoints([]);
        }
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
    
    const symbol = new Circle({
      left: equipment.x - pixelSize / 2,
      top: equipment.y - pixelSize / 2,
      radius: pixelSize / 2,
      fill: "#3b82f6",
      stroke: "#1e40af",
      strokeWidth: 1,
      selectable: true,
      angle: equipment.rotation,
    });
    
    fabricCanvas.add(symbol);
    fabricCanvas.renderAll();
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

    const newCable = {
      id: crypto.randomUUID(),
      type: "lv" as const,
      points: points.map(p => ({ x: p.x, y: p.y })),
      cableType: details.cableType,
      supplyFrom: details.supplyFrom,
      supplyTo: details.supplyTo,
      color: getToolColor("line-lv"),
      lengthMeters: totalLength,
    };
    
    setProjectData(prev => ({
      ...prev,
      cables: [...prev.cables, newCable],
    }));
    
    setCableDialogOpen(false);
    pendingCablePointsRef.current = [];
    toast.success(`LV Cable added: ${totalLength.toFixed(2)}m`);
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
    if (!projectId || !fabricCanvas) return;

    const loadFloorPlan = async () => {
      const { data: floorPlans } = await supabase
        .from("floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (floorPlans && floorPlans.length > 0) {
        const fp = floorPlans[0];
        setFloorPlanId(fp.id);
        
        // Load scale
        if (fp.scale_meters_per_pixel) {
          setScaleCalibration({
            metersPerPixel: fp.scale_meters_per_pixel,
            isSet: true,
          });
        }
        
        // Load PDF
        if (fp.pdf_url) {
          // Load PDF image - implementation would be similar to handlePDFLoaded
        }
        
        // Load all markups
        await loadExistingMarkups(fp.id);
        
        // Render loaded items on canvas
        projectData.equipment.forEach(drawEquipmentSymbol);
      }
    };

    loadFloorPlan();
  }, [projectId, fabricCanvas]);

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
    
    // Render cables
    projectData.cables.forEach(cable => {
      const line = new Polyline(
        cable.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: cable.color || getToolColor(`line-${cable.type}`),
          strokeWidth: 2,
          fill: null,
          selectable: true,
        }
      );
      fabricCanvas.add(line);
    });
    
    // Render zones
    projectData.zones.forEach(zone => {
      const polygon = new Polyline(
        zone.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: zone.color || "#10b981",
          strokeWidth: 2,
          fill: `${zone.color || "#10b981"}33`,
          selectable: true,
        }
      );
      fabricCanvas.add(polygon);
    });
    
    // Render containment
    projectData.containment.forEach(route => {
      const line = new Polyline(
        route.points.map(p => ({ x: p.x, y: p.y })),
        {
          stroke: getToolColor(route.type),
          strokeWidth: 3,
          strokeDashArray: [5, 5],
          fill: null,
          selectable: true,
        }
      );
      fabricCanvas.add(line);
    });
    
    fabricCanvas.renderAll();
  }, [projectData, fabricCanvas, scaleCalibration]);

  const handlePDFLoaded = async (imageUrl: string, uploadedPdfUrl?: string) => {
    if (!fabricCanvas || !projectId) {
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

      // Create floor plan record if PDF was uploaded
      if (uploadedPdfUrl) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          toast.error("User not authenticated");
          return;
        }

        const { data: floorPlan, error: createError } = await supabase
          .from("floor_plans")
          .insert({
            project_id: projectId,
            name: `Floor Plan ${new Date().toLocaleDateString()}`,
            pdf_url: uploadedPdfUrl,
            design_purpose: "budget_markup",
            created_by: user.user.id,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating floor plan:", createError);
          toast.error("Failed to create floor plan record");
        } else if (floorPlan) {
          setFloorPlanId(floorPlan.id);
          toast.success("Floor plan loaded! Please select a design purpose.");
        }
      } else {
        toast.success("Floor plan image loaded! Now set the scale to begin.");
      }
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

  const handleScaleSet = (metersValue: number) => {
    if (!scaleLinePixels || scaleLinePixels === 0) {
      toast.error("Invalid scale line drawn");
      return;
    }
    
    const metersPerPixel = metersValue / scaleLinePixels;
    setScaleCalibration({ metersPerPixel, isSet: true });
    setScaleDialogOpen(false);
    setActiveTool("select");
    toast.success(`Scale calibrated: 1 pixel = ${metersPerPixel.toFixed(4)} meters. You can now draw and place equipment!`);
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Floor Plan Markup Tool</h1>
          <p className="text-muted-foreground">
            {designPurpose
              ? `Design Purpose: ${designPurpose.replace(/_/g, " ").toUpperCase()}`
              : "Upload a floor plan to begin"}
          </p>
        </div>
        <div className="flex gap-2">
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
          setActiveTool("select");
        }}
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
