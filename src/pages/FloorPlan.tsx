import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, Sparkles, Loader2, ArrowLeft, Ruler, Edit, Trash2 } from "lucide-react";
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
import { ModificationDialog } from "@/components/floorplan/ModificationDialog";
import { LineEditDialog } from "@/components/floorplan/LineEditDialog";
import { EQUIPMENT_SIZES } from "@/components/floorplan/equipmentSizes";
import { CABLE_STYLES, SPECIAL_CABLE_STYLES } from "@/components/floorplan/cableStyles";
import { createIECSymbol } from "@/components/floorplan/iecSymbols";
import { DesignPurpose, Tool, ProjectData, ScaleCalibration, EquipmentType, CableType, ContainmentSize, Zone } from "@/components/floorplan/types";
import { canvasToPDF, pdfToCanvas, calculateMetersPerPDFUnit, PDFPoint } from "@/lib/pdfCoordinates";

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
  
  // PDF coordinate system - the source of truth
  const [pdfDimensions, setPdfDimensions] = useState<{
    width: number;
    height: number;
    canvasScale: number; // Scale factor applied to fit PDF on canvas
  } | null>(null);
  
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [rotation, setRotation] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
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
  const [modificationDialogOpen, setModificationDialogOpen] = useState(false);
  const [lineEditDialogOpen, setLineEditDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [modificationType, setModificationType] = useState<"scale" | "cable" | "zone" | "containment">("scale");
  const [modificationData, setModificationData] = useState<{ oldValue?: string; newValue?: string; onConfirm: () => void }>({
    onConfirm: () => {},
  });
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
  const [previewLine, setPreviewLine] = useState<Polyline | Line | null>(null);
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
      backgroundColor: "#ffffff",
      fireMiddleClick: true,
      stopContextMenu: true,
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

    // Handle object selection for line editing
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.get('isEditableLine') && activeTool === 'select') {
        setSelectedLine(selected);
        setLineEditDialogOpen(true);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected && selected.get('isEditableLine') && activeTool === 'select') {
        setSelectedLine(selected);
        setLineEditDialogOpen(true);
      }
    });

    setFabricCanvas(canvas);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Handle scale marker drag to dynamically update scale
  useEffect(() => {
    if (!fabricCanvas || scaleObjects.markers.length !== 2 || !pdfDimensions) return;

    const handleObjectMoving = (e: any) => {
      const obj = e.target;
      
      // Check if this is a scale marker
      const markerIndex = scaleObjects.markers.indexOf(obj);
      if (markerIndex === -1) return;
      
      // Get both markers
      const [marker1, marker2] = scaleObjects.markers;
      
      // Update the line in real-time
      if (scaleObjects.line) {
        scaleObjects.line.set({
          x1: marker1.left!,
          y1: marker1.top!,
          x2: marker2.left!,
          y2: marker2.top!,
        });
      }
      
      // Update label position and calculate new distance
      if (scaleObjects.label && scaleCalibration.isSet) {
        // Convert canvas positions to PDF coordinates
        const pdfPoint1 = canvasToPDF({ x: marker1.left!, y: marker1.top! }, pdfDimensions, fabricCanvas);
        const pdfPoint2 = canvasToPDF({ x: marker2.left!, y: marker2.top! }, pdfDimensions, fabricCanvas);
        
        // Calculate PDF distance
        const dx = pdfPoint2.x - pdfPoint1.x;
        const dy = pdfPoint2.y - pdfPoint1.y;
        const pdfDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate real-world distance
        const realWorldDistance = pdfDistance * scaleCalibration.metersPerPixel;
        
        // Update label text and position
        const midX = (marker1.left! + marker2.left!) / 2;
        const midY = (marker1.top! + marker2.top!) / 2;
        const angle = Math.atan2(marker2.top! - marker1.top!, marker2.left! - marker1.left!);
        const offsetDistance = 30 / fabricCanvas.getZoom();
        
        scaleObjects.label.set({
          text: `${realWorldDistance.toFixed(2)}m`,
          left: midX - Math.sin(angle) * offsetDistance,
          top: midY + Math.cos(angle) * offsetDistance,
        });
      }
      
      fabricCanvas.renderAll();
    };
    
    const handleObjectModified = (e: any) => {
      const obj = e.target;
      
      // Check if this is a scale marker
      const markerIndex = scaleObjects.markers.indexOf(obj);
      if (markerIndex === -1) return;
      
      // Marker was moved - open dialog to confirm new scale
      const [marker1, marker2] = scaleObjects.markers;
      
      // Convert canvas positions to PDF coordinates
      const pdfPoint1 = canvasToPDF({ x: marker1.left!, y: marker1.top! }, pdfDimensions, fabricCanvas);
      const pdfPoint2 = canvasToPDF({ x: marker2.left!, y: marker2.top! }, pdfDimensions, fabricCanvas);
      
      // Update stored PDF points on markers
      marker1.set('pdfX', pdfPoint1.x);
      marker1.set('pdfY', pdfPoint1.y);
      marker2.set('pdfX', pdfPoint2.x);
      marker2.set('pdfY', pdfPoint2.y);
      
      // Calculate new PDF distance
      const dx = pdfPoint2.x - pdfPoint1.x;
      const dy = pdfPoint2.y - pdfPoint1.y;
      const pdfDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Update state
      setScalePoints([new Point(pdfPoint1.x, pdfPoint1.y), new Point(pdfPoint2.x, pdfPoint2.y)]);
      setScaleCalibrationPoints([new Point(pdfPoint1.x, pdfPoint1.y), new Point(pdfPoint2.x, pdfPoint2.y)]);
      setScaleLinePixels(pdfDistance);
      
      // Open dialog to confirm/update scale
      setScaleEditDialogOpen(true);
      
      toast.info("Drag complete - confirm or update scale measurement");
    };
    
    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('object:modified', handleObjectModified);
    
    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, [fabricCanvas, scaleObjects, pdfDimensions, scaleCalibration]);

  // Handle equipment selection for deletion
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const handleObjectSelected = (e: any) => {
      const obj = e.selected?.[0];
      if (!obj) return;
      
      const equipmentId = obj.get('equipmentId');
      if (equipmentId) {
        setSelectedEquipment(obj);
      } else {
        setSelectedEquipment(null);
      }
    };
    
    const handleSelectionCleared = () => {
      setSelectedEquipment(null);
    };
    
    fabricCanvas.on('selection:created', handleObjectSelected);
    fabricCanvas.on('selection:updated', handleObjectSelected);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);
    
    return () => {
      fabricCanvas.off('selection:created', handleObjectSelected);
      fabricCanvas.off('selection:updated', handleObjectSelected);
      fabricCanvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [fabricCanvas]);

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

      // Scale tool (works even when scale is not set, uses PDF coordinates)
      if (activeTool === "scale") {
        if (!pdfDimensions) {
          console.error('❌ PDF dimensions not available:', { pdfDimensions, pdfImageUrl });
          toast.error("Please wait for PDF to finish loading");
          return;
        }

        console.log('✅ Using PDF dimensions:', pdfDimensions);

        // Convert canvas click to PDF coordinates
        const pdfPoint = canvasToPDF(point, pdfDimensions, fabricCanvas);
        console.log('Canvas point:', point, '→ PDF point:', pdfPoint);
        
        // Draw marker at canvas position (will be zoom-responsive and draggable)
        const baseRadius = 8;
        const marker = new Circle({
          left: point.x,
          top: point.y,
          radius: baseRadius / currentZoom,
          fill: "#ef4444",
          stroke: "#fbbf24",
          strokeWidth: 2 / currentZoom,
          selectable: true,       // Allow selection during setup
          evented: true,          // Enable events
          hasControls: false,     // No resize/rotate controls
          hasBorders: true,       // Show selection border
          hoverCursor: 'pointer', // Show pointer during setup
          lockRotation: true,
          originX: 'center',
          originY: 'center',
          borderColor: '#fbbf24',
          cornerColor: '#fbbf24',
        });
        
        // Store PDF coordinates on the marker
        marker.set('pdfX', pdfPoint.x);
        marker.set('pdfY', pdfPoint.y);
        
        fabricCanvas.add(marker);
        fabricCanvas.bringObjectToFront(marker);
        fabricCanvas.renderAll();
        
        if (scalePoints.length === 0) {
          setScalePoints([new Point(pdfPoint.x, pdfPoint.y)]);
          setScaleObjects(prev => ({ ...prev, markers: [marker] }));
          toast.info("Click the end point of the known distance");
        } else {
          // Get the first marker's PDF coordinates
          const firstMarker = scaleObjects.markers[0];
          const firstPdfX = firstMarker.get('pdfX');
          const firstPdfY = firstMarker.get('pdfY');
          
          // Remove preview line
          if (previewLine) {
            fabricCanvas.remove(previewLine);
            setPreviewLine(null);
          }
          
          // Draw line between PDF points (converted to canvas)
          const firstCanvasPoint = pdfToCanvas({ x: firstPdfX, y: firstPdfY }, pdfDimensions);
          const line = new Line([firstCanvasPoint.x, firstCanvasPoint.y, point.x, point.y], {
            stroke: "#ef4444", // Red color for final scale line
            strokeWidth: 3 / currentZoom,
            selectable: false,
            evented: false,
            strokeDashArray: [10 / currentZoom, 5 / currentZoom],
            visible: true,
            opacity: 1,
          });
          
          // Add line and ensure it's visible above PDF
          fabricCanvas.add(line);
          
          // Ensure PDF stays at the back
          const pdfImage = fabricCanvas.getObjects().find(obj => obj instanceof FabricImage);
          if (pdfImage) {
            fabricCanvas.sendObjectToBack(pdfImage);
          }
          
          // Bring markers and line to front
          fabricCanvas.bringObjectToFront(line);
          fabricCanvas.bringObjectToFront(firstMarker);
          fabricCanvas.bringObjectToFront(marker);
          fabricCanvas.renderAll();
          
          // Calculate distance in PDF coordinate space
          const dx = pdfPoint.x - firstPdfX;
          const dy = pdfPoint.y - firstPdfY;
          const pdfDistance = Math.sqrt(dx * dx + dy * dy);
          
          // Store objects
          setScaleObjects({ 
            line, 
            markers: [firstMarker, marker],
            label: null
          });
          
          setScaleLinePixels(pdfDistance); // This is now PDF distance, not pixel distance
          setScalePoints([new Point(firstPdfX, firstPdfY), new Point(pdfPoint.x, pdfPoint.y)]);
          setScaleDialogOpen(true);
          
          console.log('✅ Scale line drawn in PDF coordinates:', { 
            point1: { x: firstPdfX, y: firstPdfY },
            point2: pdfPoint,
            pdfDistance 
          });
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
        // Convert canvas coordinates to PDF coordinates for storage
        const pdfPoint = canvasToPDF(point, pdfDimensions!, fabricCanvas);
        
        const newEquipment = {
          id: crypto.randomUUID(),
          type: activeTool as EquipmentType,
          x: pdfPoint.x,  // Store PDF coordinates
          y: pdfPoint.y,  // Store PDF coordinates
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
          strokeWidth: 3,
          fill: null,
          selectable: true,
          evented: true,
          hoverCursor: 'pointer',
        });
        
        // Store metadata on the line
        line.set({
          lineType: activeTool,
          isEditableLine: true,
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
      const pointer = fabricCanvas.getPointer(opt.e);
      const point = new Point(pointer.x, pointer.y);
      
      // Scale tool live preview - show green line while drawing
      if (activeTool === "scale" && scaleObjects.markers.length === 1 && !scaleDialogOpen) {
        if (previewLine) {
          fabricCanvas.remove(previewLine);
        }
        
        const firstMarker = scaleObjects.markers[0];
        const preview = new Line([firstMarker.left!, firstMarker.top!, point.x, point.y], {
          stroke: "#22c55e", // Green color for scale preview
          strokeWidth: 3 / currentZoom,
          selectable: false,
          evented: false,
          strokeDashArray: [10 / currentZoom, 5 / currentZoom],
          opacity: 0.7,
          visible: true,
        });
        
        setPreviewLine(preview);
        fabricCanvas.add(preview);
        fabricCanvas.bringObjectToFront(preview);
        fabricCanvas.bringObjectToFront(firstMarker);
        fabricCanvas.renderAll();
        return;
      }
      
      if (!scaleCalibration.isSet) return;

      // Equipment preview
      const equipmentTools: Tool[] = Object.keys(EQUIPMENT_SIZES) as EquipmentType[];
      if (equipmentTools.includes(activeTool)) {
        if (equipmentPreview) {
          fabricCanvas.remove(equipmentPreview);
        }
        
        const realSize = EQUIPMENT_SIZES[activeTool as EquipmentType];
        const pixelSize = realSize / scaleCalibration.metersPerPixel;
        
      const preview = new Circle({
        left: point.x,
        top: point.y,
        radius: pixelSize / 2,
        fill: "rgba(59, 130, 246, 0.3)",
        stroke: "#3b82f6",
        strokeWidth: 2,
        selectable: false,
        evented: false,
        angle: rotation,
        originX: 'center',
        originY: 'center',
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
          strokeWidth: 3,
          fill: null,
          selectable: true,
          evented: true,
          hoverCursor: 'pointer',
        });
        
        // Store metadata on the line
        line.set({
          lineType: activeTool,
          isEditableLine: true,
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
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedEquipment) {
        e.preventDefault();
        handleEquipmentDelete();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isDrawing, drawingPoints, activeTool, selectedEquipment]);

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
    if (!fabricCanvas || !scaleCalibration.isSet || !pdfDimensions) return;
    
    // Convert PDF coordinates to canvas coordinates for rendering
    const canvasPoint = pdfToCanvas({ x: equipment.x, y: equipment.y }, pdfDimensions);
    
    const realSize = EQUIPMENT_SIZES[equipment.type as EquipmentType];
    const pixelSize = realSize / scaleCalibration.metersPerPixel;
    
    // Calculate scale factor for IEC symbol rendering
    // Base IEC symbols are designed at 20px, scale them proportionally
    const symbolScale = pixelSize / 20;
    
    // Create IEC 60617 compliant symbol
    const symbol = createIECSymbol(equipment.type as EquipmentType, symbolScale);
    
    symbol.set({
      left: canvasPoint.x,
      top: canvasPoint.y,
      angle: equipment.rotation || 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      borderColor: '#3b82f6',
      cornerColor: '#3b82f6',
      cornerSize: 10,
      cornerStyle: 'circle',
      transparentCorners: false,
      hoverCursor: 'move',
    });
    
    // Store equipment data with the symbol for later reference
    symbol.set({ equipmentId: equipment.id, equipmentType: equipment.type });
    
    fabricCanvas.add(symbol);
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 2 || !pdfDimensions || !fabricCanvas) {
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
      pendingCablePointsRef.current = drawingPoints;
      setCurrentContainmentType(activeTool);
      setContainmentDialogOpen(true);
      cleanupDrawing();
      return;
    }

    // Handle other line types (MV/DC cables)
    if (["line-mv", "line-dc"].includes(activeTool)) {
      // Convert canvas coordinates to PDF coordinates for storage
      const pdfPoints = drawingPoints.map(p => {
        const pdfPoint = canvasToPDF(p, pdfDimensions, fabricCanvas);
        return { x: pdfPoint.x, y: pdfPoint.y };
      });
      
      const newCable = {
        id: crypto.randomUUID(),
        type: activeTool.replace("line-", "") as "mv" | "dc",
        points: pdfPoints,  // Store PDF coordinates
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
      // Convert canvas coordinates to PDF coordinates for storage
      const pdfPoints = drawingPoints.map(p => {
        const pdfPoint = canvasToPDF(p, pdfDimensions, fabricCanvas);
        return { x: pdfPoint.x, y: pdfPoint.y };
      });
      
      const newContainment = {
        id: crypto.randomUUID(),
        type: activeTool as any,
        points: pdfPoints,  // Store PDF coordinates
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
      
      // Convert canvas coordinates to PDF coordinates for storage
      const pdfPoints = drawingPoints.map(p => {
        const pdfPoint = canvasToPDF(p, pdfDimensions, fabricCanvas);
        return { x: pdfPoint.x, y: pdfPoint.y };
      });
      
      const newZone = {
        id: crypto.randomUUID(),
        type: "supply" as const,
        points: pdfPoints,  // Store PDF coordinates
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
    if (points.length < 2 || !pdfDimensions) return;

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

    // Convert all canvas points to PDF coordinates for storage
    const pdfPoints = points.map(p => {
      const pdfPoint = canvasToPDF(p, pdfDimensions, fabricCanvas!);
      return { x: pdfPoint.x, y: pdfPoint.y };
    });

    const newCable = {
      id: crypto.randomUUID(),
      type: cableRouteType,
      points: pdfPoints,  // Store PDF coordinates
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
    if (points.length < 2 || !pdfDimensions || !fabricCanvas) return;

    const lengthMeters = calculatePathLength(points) * scaleCalibration.metersPerPixel;

    // Convert canvas coordinates to PDF coordinates for storage
    const pdfPoints = points.map(p => {
      const pdfPoint = canvasToPDF(p, pdfDimensions, fabricCanvas);
      return { x: pdfPoint.x, y: pdfPoint.y };
    });

    const newContainment = {
      id: crypto.randomUUID(),
      type: currentContainmentType as any,
      points: pdfPoints,  // Store PDF coordinates
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

  const handleLineEdit = (updatedData: {
    type: string;
    cableType?: CableType;
    cableSize?: string;
    cableCount?: number;
    containmentSize?: string;
  }) => {
    if (!selectedLine || !fabricCanvas) return;

    // Update visual properties
    selectedLine.set({
      stroke: getToolColor(updatedData.type as Tool),
      lineType: updatedData.type,
      cableType: updatedData.cableType,
      cableSize: updatedData.cableSize,
      cableCount: updatedData.cableCount,
      containmentSize: updatedData.containmentSize,
    });

    fabricCanvas.renderAll();
    toast.success("Line updated successfully");
  };

  const handleLineDelete = () => {
    if (!selectedLine || !fabricCanvas) return;

    fabricCanvas.remove(selectedLine);
    fabricCanvas.renderAll();
    
    setSelectedLine(null);
    setLineEditDialogOpen(false);
    toast.success("Line deleted");
  };

  const handleEquipmentDelete = async () => {
    if (!selectedEquipment || !fabricCanvas) return;
    
    const equipmentId = selectedEquipment.get('equipmentId');
    const equipmentType = selectedEquipment.get('equipmentType');
    
    fabricCanvas.remove(selectedEquipment);
    fabricCanvas.renderAll();
    
    setProjectData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e.id !== equipmentId)
    }));
    
    setSelectedEquipment(null);
    toast.success(`${equipmentType} deleted`);
    
    if (floorPlanId) {
      try {
        const { error } = await supabase
          .from('equipment_placements')
          .delete()
          .eq('id', equipmentId);
          
        if (error) {
          console.error('Error deleting equipment from database:', error);
        }
      } catch (err) {
        console.error('Error deleting equipment:', err);
      }
    }
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
          }
          
          // Load PDF image FIRST - with better error handling
          if (fp.pdf_url) {
            console.log('🔍 Starting PDF load from:', fp.pdf_url);
            
            try {
              // Load the image
              const img = await FabricImage.fromURL(fp.pdf_url, { 
                crossOrigin: "anonymous"
              });
              
              if (!img || !img.width || !img.height) {
                throw new Error('Invalid image loaded');
              }
              
              console.log('✅ PDF loaded successfully:', img.width, 'x', img.height);
              
              const scale = Math.min(
                (fabricCanvas.width! - 40) / img.width!,
                (fabricCanvas.height! - 40) / img.height!
              );
              
              console.log('📐 Calculated scale:', scale);
              
              // CRITICAL: Store PDF dimensions for coordinate system
              const pdfDims = {
                width: img.width!,
                height: img.height!,
                canvasScale: scale
              };
              setPdfDimensions(pdfDims);
              console.log('✅ PDF dimensions stored:', pdfDims);

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
              fabricCanvas.requestRenderAll();
              
              setPdfImageUrl(fp.pdf_url);
              
              console.log('✅ PDF rendered on canvas');
              toast.success('PDF loaded', { duration: 2000 });
              
            } catch (err: any) {
              console.error('❌ PDF Load Error:', err);
              toast.error(`Failed to load PDF: ${err.message}`);
              
              // Add a visible error rectangle so user knows canvas is working
              const errorRect = new Rect({
                left: 50,
                top: 50,
                width: 300,
                height: 100,
                fill: '#fee2e2',
                stroke: '#dc2626',
                strokeWidth: 2,
              });
              const errorText = new Text('PDF Failed to Load\nCheck console for details', {
                left: 200,
                top: 100,
                fontSize: 16,
                fill: '#dc2626',
                originX: 'center',
                originY: 'center',
              });
              fabricCanvas.add(errorRect, errorText);
              fabricCanvas.requestRenderAll();
            }
          } else {
            console.log('⚠️ No PDF URL in database');
            toast.error('No PDF found for this floor plan');
          }
          
          // Scale will be restored by separate useEffect once PDF dimensions are ready
          if (fp.scale_point1 && fp.scale_point2) {
            const pdfPoint1 = fp.scale_point1 as { x: number; y: number };
            const pdfPoint2 = fp.scale_point2 as { x: number; y: number };
            setScaleCalibrationPoints([
              new Point(pdfPoint1.x, pdfPoint1.y), 
              new Point(pdfPoint2.x, pdfPoint2.y)
            ]);
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

  // Restore scale markers once PDF dimensions are available
  useEffect(() => {
    if (!fabricCanvas || !floorPlanId || !pdfDimensions || !scaleCalibration.isSet) return;
    
    // Prevent duplicate scale markers
    if (scaleObjects.markers.length > 0) return;
    
    // Check if there are saved scale points to restore
    if (scaleCalibrationPoints.length !== 2) return;
    
    const restoreScaleMarkers = async () => {
      try {
        // Fetch scale points from database
        const { data: fp } = await supabase
          .from("floor_plans")
          .select("scale_point1, scale_point2, scale_meters_per_pixel")
          .eq("id", floorPlanId)
          .single();
        
        if (!fp || !fp.scale_point1 || !fp.scale_point2) return;
        
        console.log('🎯 Restoring scale markers from database');
        
        const pdfPoint1 = fp.scale_point1 as { x: number; y: number };
        const pdfPoint2 = fp.scale_point2 as { x: number; y: number };
        
        // Convert PDF coordinates to canvas coordinates
        const canvasPoint1 = pdfToCanvas(pdfPoint1, pdfDimensions);
        const canvasPoint2 = pdfToCanvas(pdfPoint2, pdfDimensions);
        
        const currentCanvasZoom = fabricCanvas.getZoom();
        
        // Create draggable marker 1
        const marker1 = new Circle({
          left: canvasPoint1.x,
          top: canvasPoint1.y,
          radius: 8 / currentCanvasZoom,
          fill: "#ef4444",
          stroke: "#fbbf24",
          strokeWidth: 2 / currentCanvasZoom,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          hoverCursor: 'move',
          lockRotation: true,
          originX: 'center',
          originY: 'center',
          visible: true,
          opacity: 1,
          borderColor: '#fbbf24',
          cornerColor: '#fbbf24',
        });
        marker1.set('pdfX', pdfPoint1.x);
        marker1.set('pdfY', pdfPoint1.y);
        
        // Create draggable marker 2
        const marker2 = new Circle({
          left: canvasPoint2.x,
          top: canvasPoint2.y,
          radius: 8 / currentCanvasZoom,
          fill: "#ef4444",
          stroke: "#fbbf24",
          strokeWidth: 2 / currentCanvasZoom,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          hoverCursor: 'move',
          lockRotation: true,
          originX: 'center',
          originY: 'center',
          visible: true,
          opacity: 1,
          borderColor: '#fbbf24',
          cornerColor: '#fbbf24',
        });
        marker2.set('pdfX', pdfPoint2.x);
        marker2.set('pdfY', pdfPoint2.y);
        
        // Create scale line
        const line = new Line([canvasPoint1.x, canvasPoint1.y, canvasPoint2.x, canvasPoint2.y], {
          stroke: "#ef4444",
          strokeWidth: 3 / currentCanvasZoom,
          selectable: false,
          evented: false,
          strokeDashArray: [10 / currentCanvasZoom, 5 / currentCanvasZoom],
          visible: true,
          opacity: 1
        });
        
        // Calculate real-world distance
        const dx = pdfPoint2.x - pdfPoint1.x;
        const dy = pdfPoint2.y - pdfPoint1.y;
        const pdfDistance = Math.sqrt(dx * dx + dy * dy);
        const realWorldDistance = pdfDistance * fp.scale_meters_per_pixel;
        
        // Calculate label position
        const midX = (canvasPoint1.x + canvasPoint2.x) / 2;
        const midY = (canvasPoint1.y + canvasPoint2.y) / 2;
        const canvasDx = canvasPoint2.x - canvasPoint1.x;
        const canvasDy = canvasPoint2.y - canvasPoint1.y;
        const angle = Math.atan2(canvasDy, canvasDx);
        const offsetDistance = 30 / currentCanvasZoom;
        const labelX = midX - Math.sin(angle) * offsetDistance;
        const labelY = midY + Math.cos(angle) * offsetDistance;
        
        // Create label
        const label = new Text(`${realWorldDistance.toFixed(2)}m`, {
          left: labelX,
          top: labelY,
          fontSize: 14 / currentCanvasZoom,
          fontWeight: 'bold',
          fill: '#dc2626',
          backgroundColor: '#fef2f2',
          padding: 6 / currentCanvasZoom,
          textAlign: 'center',
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        
        // Add to canvas in correct order
        fabricCanvas.add(line);
        fabricCanvas.add(marker1);
        fabricCanvas.add(marker2);
        fabricCanvas.add(label);
        
        // Ensure proper z-ordering
        const pdfImage = fabricCanvas.getObjects().find(obj => obj instanceof FabricImage);
        if (pdfImage) {
          fabricCanvas.sendObjectToBack(pdfImage);
        }
        fabricCanvas.bringObjectToFront(line);
        fabricCanvas.bringObjectToFront(marker1);
        fabricCanvas.bringObjectToFront(marker2);
        fabricCanvas.bringObjectToFront(label);
        
        fabricCanvas.renderAll();
        
        // Update state
        setScaleObjects({ line, markers: [marker1, marker2], label });
        
        console.log('✅ Scale markers restored successfully');
        toast.success('Scale calibration restored', { duration: 1500 });
        
      } catch (error) {
        console.error('Error restoring scale markers:', error);
      }
    };
    
    restoreScaleMarkers();
  }, [fabricCanvas, floorPlanId, pdfDimensions, scaleCalibration.isSet, scaleCalibrationPoints, scaleObjects.markers.length]);

  // Render loaded items on canvas when projectData changes
  useEffect(() => {
    if (!fabricCanvas || !scaleCalibration.isSet) return;
    
    // Clear existing objects (except PDF background and scale objects)
    const objects = fabricCanvas.getObjects();
    const isScaleObject = (obj: any) => {
      return obj === scaleObjects.line || 
             scaleObjects.markers.includes(obj) || 
             obj === scaleObjects.label;
    };
    
    objects.forEach(obj => {
      // Keep PDF image (first object) and scale objects
      if (obj !== objects[0] && !isScaleObject(obj)) {
        fabricCanvas.remove(obj);
      }
    });
    
    // Render equipment
    projectData.equipment.forEach(equipment => {
      drawEquipmentSymbol(equipment);
    });
    
    // Render cables with color-coded sizes and line types
    projectData.cables.forEach(cable => {
      if (!pdfDimensions) return;
      
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
      
      // Convert PDF coordinates to canvas coordinates for rendering
      const canvasPoints = cable.points.map(p => {
        const canvasPoint = pdfToCanvas({ x: p.x, y: p.y }, pdfDimensions);
        return { x: canvasPoint.x, y: canvasPoint.y };
      });
      
      const line = new Polyline(
        canvasPoints,  // Use canvas coordinates for display
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
        if (!pdfDimensions || !fabricCanvas) return;
        
        // Get modified points in canvas coordinates
        const canvasPoints = line.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        // Convert canvas coordinates back to PDF coordinates for storage
        const pdfPoints = canvasPoints.map(p => {
          const pdfPoint = canvasToPDF(new Point(p.x, p.y), pdfDimensions, fabricCanvas);
          return { x: pdfPoint.x, y: pdfPoint.y };
        });
        
        const fabricPoints = canvasPoints.map(p => new Point(p.x, p.y));
        const newLength = calculatePathLength(fabricPoints) * scaleCalibration.metersPerPixel;
        const oldLength = cable.lengthMeters || 0;
        
        // Show modification dialog
        setModificationType("cable");
        setModificationData({
          oldValue: `${oldLength.toFixed(2)}m`,
          newValue: `${newLength.toFixed(2)}m`,
          onConfirm: async () => {
            // Update local state with PDF coordinates
            setProjectData(prev => ({
              ...prev,
              cables: prev.cables.map(c => 
                c.id === cable.id ? { ...c, points: pdfPoints, lengthMeters: newLength } : c
              )
            }));
            
            // Save to database
            try {
              const { error } = await supabase
                .from('cable_routes')
                .update({ points: pdfPoints, length_meters: newLength })
                .eq('id', cable.id);
                
              if (!error) {
                toast.success('Cable route updated');
              }
            } catch (err) {
              console.error('Error updating cable:', err);
            }
            
            setModificationDialogOpen(false);
          }
        });
        setModificationDialogOpen(true);
      });
      
      fabricCanvas.add(line);
    });
    
    // Render zones with dynamic node sizing
    projectData.zones.forEach(zone => {
      if (!pdfDimensions) return;
      
      // Convert PDF coordinates to canvas coordinates for rendering
      const canvasPoints = zone.points.map(p => {
        const canvasPoint = pdfToCanvas({ x: p.x, y: p.y }, pdfDimensions);
        return { x: canvasPoint.x, y: canvasPoint.y };
      });
      
      const polygon = new Polyline(
        canvasPoints,  // Use canvas coordinates for display
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
        if (!pdfDimensions || !fabricCanvas) return;
        
        // Get modified points in canvas coordinates
        const canvasPoints = polygon.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        // Convert canvas coordinates back to PDF coordinates for storage
        const pdfPoints = canvasPoints.map(p => {
          const pdfPoint = canvasToPDF(new Point(p.x, p.y), pdfDimensions, fabricCanvas);
          return { x: pdfPoint.x, y: pdfPoint.y };
        });
        
        // Show modification dialog
        setModificationType("zone");
        setModificationData({
          oldValue: `${zone.points.length} points`,
          newValue: `${pdfPoints.length} points`,
          onConfirm: async () => {
            setProjectData(prev => ({
              ...prev,
              zones: prev.zones.map(z => 
                z.id === zone.id ? { ...z, points: pdfPoints } : z
              )
            }));
            
            toast.success('Zone updated - click Save to persist changes');
            setModificationDialogOpen(false);
          }
        });
        setModificationDialogOpen(true);
      });
      
      fabricCanvas.add(polygon);
    });
    
    // Render containment with dynamic node sizing
    projectData.containment.forEach(route => {
      if (!pdfDimensions) return;
      
      // Convert PDF coordinates to canvas coordinates for rendering
      const canvasPoints = route.points.map(p => {
        const canvasPoint = pdfToCanvas({ x: p.x, y: p.y }, pdfDimensions);
        return { x: canvasPoint.x, y: canvasPoint.y };
      });
      
      const line = new Polyline(
        canvasPoints,  // Use canvas coordinates for display
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
        if (!pdfDimensions || !fabricCanvas) return;
        
        // Get modified points in canvas coordinates
        const canvasPoints = line.points?.map(p => ({ x: p.x, y: p.y })) || [];
        
        // Convert canvas coordinates back to PDF coordinates for storage
        const pdfPoints = canvasPoints.map(p => {
          const pdfPoint = canvasToPDF(new Point(p.x, p.y), pdfDimensions, fabricCanvas);
          return { x: pdfPoint.x, y: pdfPoint.y };
        });
        
        const fabricPoints = canvasPoints.map(p => new Point(p.x, p.y));
        const newLength = calculatePathLength(fabricPoints) * scaleCalibration.metersPerPixel;
        const oldLength = route.lengthMeters || 0;
        
        // Show modification dialog
        setModificationType("containment");
        setModificationData({
          oldValue: `${oldLength.toFixed(2)}m`,
          newValue: `${newLength.toFixed(2)}m`,
          onConfirm: async () => {
            setProjectData(prev => ({
              ...prev,
              containment: prev.containment.map(c => 
                c.id === route.id ? { ...c, points: pdfPoints, lengthMeters: newLength } : c
              )
            }));
            
            toast.success('Containment updated - click Save to persist changes');
            setModificationDialogOpen(false);
          }
        });
        setModificationDialogOpen(true);
      });
      
      fabricCanvas.add(line);
    });
    
    fabricCanvas.renderAll();
  }, [projectData, fabricCanvas, scaleCalibration, currentZoom, scaleObjects]);

  // Update node sizes when zoom changes - keep scale indicators constant screen size
  useEffect(() => {
    if (!fabricCanvas) return;

    const constantRadius = 8; // Constant screen size
    const constantStrokeWidth = 2;
    const constantLineWidth = 3;
    const constantFontSize = 14;

    // Update scale markers and line to maintain constant screen size
    if (scaleObjects.markers.length === 2 && scaleObjects.line) {
      scaleObjects.markers.forEach(marker => {
        marker.set({
          radius: constantRadius / currentZoom,
          strokeWidth: constantStrokeWidth / currentZoom,
        });
        marker.setCoords();
      });
      
      scaleObjects.line.set({
        strokeWidth: constantLineWidth / currentZoom,
        strokeDashArray: [10 / currentZoom, 5 / currentZoom],
      });
      
      if (scaleObjects.label) {
        scaleObjects.label.set({
          fontSize: constantFontSize / currentZoom,
          padding: 6 / currentZoom,
        });
        scaleObjects.label.setCoords();
      }
    }

    // Update all polylines (cables, zones, and containment)
    fabricCanvas.getObjects().forEach(obj => {
      if (obj instanceof Polyline) {
        const isCable = obj.get('cableId');
        const isZone = obj.get('zoneId');
        const isContainment = obj.get('containmentId');
        
        let baseStrokeWidth = 3;
        if (isZone) {
          baseStrokeWidth = 2;
        } else if (isCable) {
          baseStrokeWidth = 2;
        }
        
        obj.set({
          strokeWidth: baseStrokeWidth / currentZoom,
          cornerSize: 10 / currentZoom,
        });
        
        if (obj.strokeDashArray && obj.strokeDashArray.length > 0) {
          const baseDashLength = isContainment ? 5 : 10;
          obj.set({
            strokeDashArray: [baseDashLength / currentZoom, baseDashLength / currentZoom],
          });
        }
        
        obj.setCoords();
      }
    });

    // Ensure PDF background stays at the back after all updates
    const pdfImage = fabricCanvas.getObjects().find(obj => obj instanceof FabricImage);
    if (pdfImage) {
      fabricCanvas.sendObjectToBack(pdfImage);
    }

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
    
    // Complete reset when "Set Scale" is selected again
  if (tool === "scale") {
    // If scale already exists, clear it completely
    if (scaleObjects.markers.length > 0 && fabricCanvas) {
      // Remove all scale objects from canvas
      if (scaleObjects.line) fabricCanvas.remove(scaleObjects.line);
      if (scaleObjects.label) fabricCanvas.remove(scaleObjects.label);
      scaleObjects.markers.forEach(marker => fabricCanvas.remove(marker));
      
      // Also remove preview line if it exists
      if (previewLine) {
        fabricCanvas.remove(previewLine);
        setPreviewLine(null);
      }
      
      // Reset all state
      setScaleObjects({ line: null, markers: [], label: null });
      setScalePoints([]);
      setScaleLinePixels(0);
      setScaleCalibration({ metersPerPixel: 0, isSet: false });
      setScaleCalibrationPoints([]);
      
      fabricCanvas.renderAll();
      toast.info("Previous scale cleared. Click two points for new calibration");
    } else if (!scaleCalibration.isSet) {
      toast.info("Click two points on a known distance to set scale");
    }
  }
    
    setActiveTool(tool);
    
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
    
    if (!pdfDimensions) {
      toast.error("PDF dimensions not available");
      return;
    }
    
    // scaleLinePixels is now PDF distance
    const metersPerPDFUnit = metersValue / scaleLinePixels;
    
    setScaleCalibration({ 
      metersPerPixel: metersPerPDFUnit, // This is actually meters per PDF unit now
      isSet: true 
    });
    setScaleCalibrationPoints(scalePoints);
    setScaleDialogOpen(false);
    setActiveTool("select");
    
    // Lock markers and add label
    if (fabricCanvas && scaleObjects.line && scaleObjects.markers.length === 2) {
      const [marker1, marker2] = scaleObjects.markers;
      
      console.log('🎯 Setting up draggable scale markers with label');
      console.log('Marker 1 position:', marker1.left, marker1.top);
      console.log('Marker 2 position:', marker2.left, marker2.top);
      console.log('Line exists:', !!scaleObjects.line);
      
      // Keep markers SELECTABLE and DRAGGABLE with enhanced styling
      marker1.set({ 
        selectable: true,    // KEEP DRAGGABLE
        evented: true,       // KEEP EVENTS ENABLED
        hasControls: false,  // No resize/rotate controls
        hasBorders: true,    // Show selection border
        hoverCursor: 'move', // Show move cursor
        visible: true,
        opacity: 1,
        fill: "#ef4444",
        stroke: "#fbbf24",
        strokeWidth: 2 / currentZoom,
        borderColor: '#fbbf24',
        cornerColor: '#fbbf24',
      });
      marker2.set({ 
        selectable: true,    // KEEP DRAGGABLE
        evented: true,       // KEEP EVENTS ENABLED
        hasControls: false,  // No resize/rotate controls
        hasBorders: true,    // Show selection border
        hoverCursor: 'move', // Show move cursor
        visible: true,
        opacity: 1,
        fill: "#ef4444",
        stroke: "#fbbf24",
        strokeWidth: 2 / currentZoom,
        borderColor: '#fbbf24',
        cornerColor: '#fbbf24',
      });
      
      // Ensure line is visible with red styling
      scaleObjects.line.set({
        visible: true,
        opacity: 1,
        stroke: "#ef4444",
        strokeWidth: 3 / currentZoom,
        strokeDashArray: [10 / currentZoom, 5 / currentZoom]
      });
      
      // Calculate midpoint and perpendicular offset for label
      const midX = (marker1.left! + marker2.left!) / 2;
      const midY = (marker1.top! + marker2.top!) / 2;
      
      // Calculate angle of the line to position label perpendicular
      const dx = marker2.left! - marker1.left!;
      const dy = marker2.top! - marker1.top!;
      const angle = Math.atan2(dy, dx);
      
      // Position label perpendicular to the line (30px offset)
      const offsetDistance = 30 / currentZoom;
      const labelX = midX - Math.sin(angle) * offsetDistance;
      const labelY = midY + Math.cos(angle) * offsetDistance;
      
      // Add label with zoom-responsive sizing
      const scaleLabel = new Text(`${metersValue.toFixed(2)}m`, {
        left: labelX,
        top: labelY,
        fontSize: 14 / currentZoom,
        fontWeight: 'bold',
        fill: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: 6 / currentZoom,
        textAlign: 'center',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      
      fabricCanvas.add(scaleLabel);
      
      // Ensure proper layering
      const pdfImage = fabricCanvas.getObjects().find(obj => obj instanceof FabricImage);
      if (pdfImage) {
        fabricCanvas.sendObjectToBack(pdfImage);
      }
      
      // Bring scale objects to front
      fabricCanvas.bringObjectToFront(scaleObjects.line);
      fabricCanvas.bringObjectToFront(marker1);
      fabricCanvas.bringObjectToFront(marker2);
      fabricCanvas.bringObjectToFront(scaleLabel);
      
      fabricCanvas.renderAll();
      
      console.log('✅ Scale objects locked, label added, canvas rendered');
      console.log('Total objects on canvas:', fabricCanvas.getObjects().length);
      
      setScaleObjects(prev => ({ ...prev, label: scaleLabel }));
    } else {
      console.error('❌ Scale objects incomplete:', {
        hasCanvas: !!fabricCanvas,
        hasLine: !!scaleObjects.line,
        markerCount: scaleObjects.markers.length
      });
    }
    
    // Save to database - store PDF coordinates
    if (floorPlanId && scaleObjects.markers.length === 2 && scalePoints.length === 2) {
      const { error } = await supabase
        .from("floor_plans")
        .update({ 
          scale_meters_per_pixel: metersPerPDFUnit, // This is meters per PDF unit
          scale_point1: { x: scalePoints[0].x, y: scalePoints[0].y }, // PDF coordinates
          scale_point2: { x: scalePoints[1].x, y: scalePoints[1].y }  // PDF coordinates
        })
        .eq("id", floorPlanId);
      
      if (error) {
        console.error("Error saving scale:", error);
        toast.error("Scale set but failed to save to database");
      } else {
        toast.success(`Scale set: ${metersValue.toFixed(2)}m (PDF coordinate system)`);
        console.log('✅ Scale saved in PDF coordinates:', {
          metersPerPDFUnit,
          point1: scalePoints[0],
          point2: scalePoints[1]
        });
      }
    } else {
      toast.success(`Scale set: ${metersValue.toFixed(2)}m`);
    }
  };

  const handleScaleEdit = async (newScale: number) => {
    if (newScale <= 0) {
      toast.error("Invalid scale value");
      return;
    }
    
    if (!fabricCanvas || !scaleCalibrationPoints.length || !pdfDimensions) {
      toast.error("Scale calibration not complete");
      return;
    }
    
    // Update scale calibration
    setScaleCalibration({ metersPerPixel: newScale, isSet: true });
    setScaleEditDialogOpen(false);
    
    // Recalculate the real-world distance based on PDF coordinates
    const dx = scaleCalibrationPoints[1].x - scaleCalibrationPoints[0].x;
    const dy = scaleCalibrationPoints[1].y - scaleCalibrationPoints[0].y;
    const pdfDistance = Math.sqrt(dx * dx + dy * dy);
    const realWorldDistance = pdfDistance * newScale;
    
    // Remove old scale line and label from canvas, keep markers
    if (scaleObjects.line) {
      fabricCanvas.remove(scaleObjects.line);
    }
    if (scaleObjects.label) {
      fabricCanvas.remove(scaleObjects.label);
    }
    
    // Create new line connecting current marker positions
    if (scaleObjects.markers.length === 2) {
      const [marker1, marker2] = scaleObjects.markers;
      const currentZoom = fabricCanvas.getZoom();
      
      const newLine = new Line(
        [marker1.left!, marker1.top!, marker2.left!, marker2.top!],
        {
          stroke: "#ef4444",
          strokeWidth: 3 / currentZoom,
          selectable: false,
          evented: false,
          strokeDashArray: [10 / currentZoom, 5 / currentZoom],
          visible: true,
          opacity: 1,
        }
      );
      
      // Calculate midpoint and angle for label
      const midX = (marker1.left! + marker2.left!) / 2;
      const midY = (marker1.top! + marker2.top!) / 2;
      const angle = Math.atan2(marker2.top! - marker1.top!, marker2.left! - marker1.left!);
      
      // Position label perpendicular to the line
      const offsetDistance = 30 / currentZoom;
      const labelX = midX - Math.sin(angle) * offsetDistance;
      const labelY = midY + Math.cos(angle) * offsetDistance;
      
      const newLabel = new Text(`${realWorldDistance.toFixed(2)}m`, {
        left: labelX,
        top: labelY,
        fontSize: 14 / currentZoom,
        fontWeight: 'bold',
        fill: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: 6 / currentZoom,
        textAlign: 'center',
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      
      // Add to canvas
      fabricCanvas.add(newLine);
      fabricCanvas.add(newLabel);
      fabricCanvas.bringObjectToFront(newLine);
      fabricCanvas.bringObjectToFront(marker1);
      fabricCanvas.bringObjectToFront(marker2);
      fabricCanvas.bringObjectToFront(newLabel);
      
      // Update state with new objects
      setScaleObjects({
        line: newLine,
        markers: [marker1, marker2],
        label: newLabel
      });
    }
    
    fabricCanvas.renderAll();
    
    // RECALCULATE ALL EXISTING LINE LENGTHS AND AREAS
    const updatedCables = projectData.cables.map(cable => {
      // Recalculate length from PDF coordinates
      let totalLength = 0;
      for (let i = 0; i < cable.points.length - 1; i++) {
        const dx = cable.points[i + 1].x - cable.points[i].x;
        const dy = cable.points[i + 1].y - cable.points[i].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }
      return {
        ...cable,
        lengthMeters: totalLength * newScale
      };
    });
    
    const updatedContainment = projectData.containment.map(route => {
      // Same calculation as cables
      let totalLength = 0;
      for (let i = 0; i < route.points.length - 1; i++) {
        const dx = route.points[i + 1].x - route.points[i].x;
        const dy = route.points[i + 1].y - route.points[i].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }
      return {
        ...route,
        lengthMeters: totalLength * newScale
      };
    });
    
    const updatedZones = projectData.zones.map(zone => {
      // Recalculate area from PDF coordinates
      let area = 0;
      for (let i = 0; i < zone.points.length; i++) {
        const j = (i + 1) % zone.points.length;
        area += zone.points[i].x * zone.points[j].y;
        area -= zone.points[j].x * zone.points[i].y;
      }
      const pdfArea = Math.abs(area / 2);
      return {
        ...zone,
        areaSqm: pdfArea * (newScale * newScale) // Area scales with square of linear scale
      };
    });
    
    // Update project data
    setProjectData(prev => ({
      ...prev,
      cables: updatedCables,
      containment: updatedContainment,
      zones: updatedZones
    }));
    
    // Count and show notification
    const totalItems = updatedCables.length + updatedContainment.length + updatedZones.length;
    
    // Save new scale to database along with updated marker positions
    if (floorPlanId && scaleObjects.markers.length === 2) {
      const [marker1, marker2] = scaleObjects.markers;
      
      // Get PDF coordinates from markers
      const pdfPoint1 = { x: marker1.get('pdfX'), y: marker1.get('pdfY') };
      const pdfPoint2 = { x: marker2.get('pdfX'), y: marker2.get('pdfY') };
      
      const { error } = await supabase
        .from("floor_plans")
        .update({ 
          scale_meters_per_pixel: newScale,
          scale_point1: pdfPoint1,
          scale_point2: pdfPoint2
        })
        .eq("id", floorPlanId);
      
      if (error) {
        console.error("Error saving scale:", error);
        toast.error("Failed to save new scale");
      } else {
        if (totalItems > 0) {
          toast.success(`Scale updated to ${realWorldDistance.toFixed(2)}m. ${totalItems} items recalculated`);
        } else {
          toast.success(`Scale updated to ${realWorldDistance.toFixed(2)}m`);
        }
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

    console.log('💾 Saving projectData:', {
      equipment: projectData.equipment.length,
      cables: projectData.cables.length,
      zones: projectData.zones.length,
      containment: projectData.containment.length,
      pvArrays: projectData.pvArrays.length
    });

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
              <div className="border rounded-lg overflow-hidden bg-muted relative">
                <canvas ref={canvasRef} />
                
                {selectedEquipment && (
                  <div className="absolute bottom-4 right-4 z-10">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEquipmentDelete}
                      className="shadow-lg"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Equipment (Del)
                    </Button>
                  </div>
                )}
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

      <ModificationDialog
        open={modificationDialogOpen}
        type={modificationType}
        oldValue={modificationData.oldValue}
        newValue={modificationData.newValue}
        onConfirm={modificationData.onConfirm}
        onCancel={() => {
          setModificationDialogOpen(false);
          // Reload the floor plan to revert changes
          if (floorPlanId) {
            window.location.reload();
          }
        }}
      />

      <LineEditDialog
        open={lineEditDialogOpen}
        onOpenChange={setLineEditDialogOpen}
        lineData={{
          type: selectedLine?.get('lineType') || 'line-lv',
          cableType: selectedLine?.get('cableType'),
          cableSize: selectedLine?.get('cableSize'),
          cableCount: selectedLine?.get('cableCount'),
          containmentSize: selectedLine?.get('containmentSize'),
        }}
        onConfirm={handleLineEdit}
        onDelete={handleLineDelete}
      />
    </div>
  );
};

export default FloorPlan;
