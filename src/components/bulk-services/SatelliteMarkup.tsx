import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Save, Download, ZoomIn, ZoomOut, Maximize2, MapPin, Satellite, RefreshCw, 
  Trash2, Ruler, Navigation, Layers, Move, MousePointer, Pencil, Circle,
  Square, ArrowRight, RotateCcw, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Point {
  x: number;
  y: number;
}

interface Marker {
  id: string;
  position: Point;
  label: string;
  type: "connection_point" | "transformer" | "substation" | "cable_route" | "meter_room" | "generator" | "db_board" | "custom";
  customLabel?: string;
}

interface CableRoute {
  id: string;
  points: Point[];
  color: string;
  label: string;
  cableType?: string;
}

interface MeasurementLine {
  id: string;
  start: Point;
  end: Point;
  distance: number; // in meters
}

interface ViewState {
  zoom: number;
  offset: Point;
}

interface MapPreviewState {
  lat: number;
  lng: number;
  zoom: number;
  bearing: number;
}

interface SatelliteMarkupProps {
  documentId: string;
  coordinates?: { lat: number; lng: number } | null;
  locationName?: string;
}

type MapStyle = "satellite-streets-v12" | "satellite-v9" | "outdoors-v12" | "streets-v12";
type ToolMode = "pan" | "marker" | "cable" | "measure" | "select";

const MAP_STYLES: { value: MapStyle; label: string }[] = [
  { value: "satellite-streets-v12", label: "Satellite + Streets" },
  { value: "satellite-v9", label: "Satellite Only" },
  { value: "outdoors-v12", label: "Terrain" },
  { value: "streets-v12", label: "Streets" },
];

const MARKER_TYPES = [
  { type: "connection_point", label: "Connection Point", color: "#ef4444", abbrev: "CP" },
  { type: "transformer", label: "Transformer", color: "#f59e0b", abbrev: "TX" },
  { type: "substation", label: "Substation", color: "#8b5cf6", abbrev: "SS" },
  { type: "meter_room", label: "Meter Room", color: "#10b981", abbrev: "MR" },
  { type: "generator", label: "Generator", color: "#6366f1", abbrev: "GN" },
  { type: "db_board", label: "DB Board", color: "#ec4899", abbrev: "DB" },
] as const;

// Calculate meters per pixel at a given latitude and zoom level
const metersPerPixel = (lat: number, zoom: number) => {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
};

export const SatelliteMarkup = ({ documentId, coordinates, locationName }: SatelliteMarkupProps) => {
  // Image and canvas state
  const [satelliteImage, setSatelliteImage] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  
  // Markup state
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [cableRoutes, setCableRoutes] = useState<CableRoute[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementLine[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  
  // Tool state
  const [toolMode, setToolMode] = useState<ToolMode>("pan");
  const [activeMarkerType, setActiveMarkerType] = useState<Marker["type"]>("connection_point");
  const [isDrawingCable, setIsDrawingCable] = useState(false);
  const [currentCablePoints, setCurrentCablePoints] = useState<Point[]>([]);
  const [isDrawingMeasure, setIsDrawingMeasure] = useState(false);
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  
  // Map settings
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite-streets-v12");
  const [mapPreview, setMapPreview] = useState<MapPreviewState | null>(null);
  const [capturedMapZoom, setCapturedMapZoom] = useState(17);
  const [mapBearing, setMapBearing] = useState(0);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showScale, setShowScale] = useState(true);
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  
  const [imageSize] = useState({ width: 1280, height: 1024 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewMapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSavedSatelliteMarkup();
  }, [documentId]);

  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng && !mapPreview) {
      setMapPreview({
        lat: coordinates.lat,
        lng: coordinates.lng,
        zoom: 17,
        bearing: 0,
      });
    }
  }, [coordinates]);

  useEffect(() => {
    if (satelliteImage) {
      renderImage();
    }
  }, [satelliteImage]);

  useEffect(() => {
    renderMarkup();
  }, [markers, cableRoutes, measurements, viewState, showGrid, showLabels, currentCablePoints, measureStart]);

  const loadSavedSatelliteMarkup = async () => {
    try {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("drawing_markup_data, climatic_zone_lat, climatic_zone_lng")
        .eq("id", documentId)
        .single();

      if (error) throw error;

      if (data?.drawing_markup_data && typeof data.drawing_markup_data === 'object') {
        const markupData = data.drawing_markup_data as { 
          satelliteMarkers?: Marker[];
          satelliteCableRoutes?: CableRoute[];
          satelliteMeasurements?: MeasurementLine[];
          satelliteImageUrl?: string;
          satelliteMapZoom?: number;
          satelliteMapBearing?: number;
        };
        if (markupData.satelliteMarkers) setMarkers(markupData.satelliteMarkers);
        if (markupData.satelliteCableRoutes) setCableRoutes(markupData.satelliteCableRoutes);
        if (markupData.satelliteMeasurements) setMeasurements(markupData.satelliteMeasurements);
        if (markupData.satelliteImageUrl) setSatelliteImage(markupData.satelliteImageUrl);
        if (markupData.satelliteMapZoom) setCapturedMapZoom(markupData.satelliteMapZoom);
        if (markupData.satelliteMapBearing) setMapBearing(markupData.satelliteMapBearing);
      }
    } catch (error) {
      console.error("Error loading saved satellite markup:", error);
    }
  };

  const fetchSatelliteImage = async () => {
    if (!mapPreview) {
      toast.error("No location set. Please adjust the map preview first.");
      return;
    }

    setLoading(true);
    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (tokenError || !tokenData?.token) {
        throw new Error("Failed to get Mapbox token");
      }

      const { lat, lng, zoom, bearing } = mapPreview;
      const url = `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${lng},${lat},${zoom},${bearing}/${imageSize.width}x${imageSize.height}@2x?access_token=${tokenData.token}`;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = reject;
        img.src = url;
      });

      imageRef.current = img;
      setSatelliteImage(url);
      setCapturedMapZoom(zoom);
      setMapBearing(bearing);
      toast.success("Satellite image captured");
    } catch (error) {
      console.error("Error fetching satellite image:", error);
      toast.error("Failed to load satellite image");
    } finally {
      setLoading(false);
    }
  };

  const renderImage = () => {
    if (!canvasRef.current || !containerRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    if (markupCanvasRef.current) {
      markupCanvasRef.current.width = img.width;
      markupCanvasRef.current.height = img.height;
    }

    ctx.drawImage(img, 0, 0);

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const initialZoom = Math.min(containerWidth / img.width, containerHeight / img.height) * 0.95;
    const initialOffsetX = (containerWidth - img.width * initialZoom) / 2;
    const initialOffsetY = (containerHeight - img.height * initialZoom) / 2;
    
    setViewState({ zoom: initialZoom, offset: { x: initialOffsetX, y: initialOffsetY } });
  };

  const renderMarkup = useCallback(() => {
    if (!markupCanvasRef.current || !canvasRef.current) return;

    const canvas = markupCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw cable routes
    cableRoutes.forEach((route) => {
      if (route.points.length < 2) return;
      
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([10, 5]);
      
      ctx.beginPath();
      ctx.moveTo(route.points[0].x, route.points[0].y);
      route.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw route label at midpoint
      if (showLabels && route.points.length >= 2) {
        const midIdx = Math.floor(route.points.length / 2);
        const midPoint = route.points[midIdx];
        ctx.fillStyle = route.color;
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(route.label, midPoint.x, midPoint.y - 10);
      }
    });

    // Draw current cable being drawn
    if (currentCablePoints.length > 0) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(currentCablePoints[0].x, currentCablePoints[0].y);
      currentCablePoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      currentCablePoints.forEach(p => {
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw measurements
    measurements.forEach((m) => {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.start.x, m.start.y);
      ctx.lineTo(m.end.x, m.end.y);
      ctx.stroke();

      // Draw end points
      [m.start, m.end].forEach(p => {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw distance label
      const midX = (m.start.x + m.end.x) / 2;
      const midY = (m.start.y + m.end.y) / 2;
      const label = m.distance >= 1000 ? `${(m.distance / 1000).toFixed(2)} km` : `${m.distance.toFixed(1)} m`;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(midX - 30, midY - 10, 60, 20);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, midX, midY);
    });

    // Draw current measurement being drawn
    if (measureStart) {
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(measureStart.x, measureStart.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw markers
    markers.forEach((marker) => {
      const isSelected = selectedMarker === marker.id;
      ctx.save();
      ctx.translate(marker.position.x, marker.position.y);

      // Marker shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      // Marker circle
      const markerInfo = MARKER_TYPES.find(m => m.type === marker.type);
      ctx.fillStyle = markerInfo?.color || "#6b7280";
      ctx.beginPath();
      ctx.arc(0, 0, isSelected ? 20 : 16, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.8)";
      ctx.lineWidth = isSelected ? 4 : 3;
      ctx.stroke();

      // Marker label
      if (showLabels) {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${isSelected ? 16 : 14}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(marker.label, 0, 0);
      }

      ctx.restore();
    });

    // Draw scale bar if enabled
    if (showScale && coordinates) {
      const mpp = metersPerPixel(coordinates.lat, capturedMapZoom);
      const scaleBarMeters = mpp * 100; // 100 pixels
      const scaleLabel = scaleBarMeters >= 1000 
        ? `${(scaleBarMeters / 1000).toFixed(1)} km` 
        : `${Math.round(scaleBarMeters)} m`;

      const barX = 20;
      const barY = canvas.height - 30;
      const barWidth = 100;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(barX - 5, barY - 20, barWidth + 30, 35);

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barWidth, barY);
      ctx.moveTo(barX, barY - 5);
      ctx.lineTo(barX, barY + 5);
      ctx.moveTo(barX + barWidth, barY - 5);
      ctx.lineTo(barX + barWidth, barY + 5);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(scaleLabel, barX + barWidth / 2, barY - 10);
    }

    // Draw north arrow if enabled
    if (showNorthArrow) {
      const arrowX = canvas.width - 40;
      const arrowY = 40;
      const arrowSize = 30;
      const rotation = (-mapBearing * Math.PI) / 180;

      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(rotation);

      // Arrow background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(0, 0, arrowSize, 0, Math.PI * 2);
      ctx.fill();

      // North arrow
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize + 8);
      ctx.lineTo(-8, 5);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize + 8);
      ctx.lineTo(8, 5);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // N label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", 0, 12);

      ctx.restore();
    }
  }, [markers, cableRoutes, measurements, showGrid, showLabels, showScale, showNorthArrow, 
      currentCablePoints, measureStart, selectedMarker, coordinates, capturedMapZoom, mapBearing]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    if (!markupCanvasRef.current) return { x: 0, y: 0 };
    const rect = markupCanvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const toWorld = (screenPos: Point): Point => {
    return {
      x: (screenPos.x - viewState.offset.x) / viewState.zoom,
      y: (screenPos.y - viewState.offset.y) / viewState.zoom
    };
  };

  const calculateDistance = (p1: Point, p2: Point): number => {
    if (!coordinates) return 0;
    const mpp = metersPerPixel(coordinates.lat, capturedMapZoom);
    const dx = (p2.x - p1.x) * mpp;
    const dy = (p2.y - p1.y) * mpp;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPos = getMousePos(e);
    const worldPos = toWorld(screenPos);

    if (toolMode === "marker") {
      const markerInfo = MARKER_TYPES.find(m => m.type === activeMarkerType);
      const count = markers.filter(m => m.type === activeMarkerType).length + 1;
      const newMarker: Marker = {
        id: `sat_marker_${Date.now()}`,
        position: worldPos,
        label: `${markerInfo?.abbrev || "M"}${count}`,
        type: activeMarkerType,
      };
      setMarkers([...markers, newMarker]);
      toast.success(`Added ${markerInfo?.label || "marker"}`);
    } else if (toolMode === "cable") {
      setCurrentCablePoints([...currentCablePoints, worldPos]);
    } else if (toolMode === "measure") {
      if (!measureStart) {
        setMeasureStart(worldPos);
        setIsDrawingMeasure(true);
      } else {
        const distance = calculateDistance(measureStart, worldPos);
        const newMeasurement: MeasurementLine = {
          id: `measure_${Date.now()}`,
          start: measureStart,
          end: worldPos,
          distance,
        };
        setMeasurements([...measurements, newMeasurement]);
        setMeasureStart(null);
        setIsDrawingMeasure(false);
        toast.success(`Measured: ${distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(1) + ' m'}`);
      }
    } else if (toolMode === "select") {
      // Check if clicked on a marker
      const clickedMarker = markers.find(m => {
        const dx = m.position.x - worldPos.x;
        const dy = m.position.y - worldPos.y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });
      setSelectedMarker(clickedMarker?.id || null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode === "pan") {
      setIsPanning(true);
      setPanStart(getMousePos(e));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && toolMode === "pan") {
      const screenPos = getMousePos(e);
      const dx = screenPos.x - panStart.x;
      const dy = screenPos.y - panStart.y;
      
      setViewState(prev => ({
        ...prev,
        offset: { x: prev.offset.x + dx, y: prev.offset.y + dy }
      }));
      setPanStart(screenPos);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const screenPos = getMousePos(e);
    const worldPosBefore = toWorld(screenPos);
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(5, viewState.zoom * zoomFactor));
    
    const worldPosAfter = {
      x: (screenPos.x - viewState.offset.x) / newZoom,
      y: (screenPos.y - viewState.offset.y) / newZoom
    };
    
    const newOffset = {
      x: viewState.offset.x + (worldPosBefore.x - worldPosAfter.x) * newZoom,
      y: viewState.offset.y + (worldPosBefore.y - worldPosAfter.y) * newZoom
    };
    
    setViewState({ zoom: newZoom, offset: newOffset });
  };

  const finishCableRoute = () => {
    if (currentCablePoints.length >= 2) {
      const count = cableRoutes.length + 1;
      const newRoute: CableRoute = {
        id: `cable_${Date.now()}`,
        points: currentCablePoints,
        color: "#3b82f6",
        label: `Cable ${count}`,
      };
      setCableRoutes([...cableRoutes, newRoute]);
      toast.success("Cable route added");
    }
    setCurrentCablePoints([]);
    setIsDrawingCable(false);
  };

  const deleteSelected = () => {
    if (selectedMarker) {
      setMarkers(markers.filter(m => m.id !== selectedMarker));
      setSelectedMarker(null);
      toast.success("Marker deleted");
    }
  };

  const clearAll = () => {
    setMarkers([]);
    setCableRoutes([]);
    setMeasurements([]);
    setSelectedMarker(null);
    toast.success("All markup cleared");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("bulk_services_documents")
        .select("drawing_markup_data")
        .eq("id", documentId)
        .single();

      const existingData = existing?.drawing_markup_data as Record<string, unknown> || {};
      
      const markupData = { 
        ...existingData,
        satelliteMarkers: markers,
        satelliteCableRoutes: cableRoutes,
        satelliteMeasurements: measurements,
        satelliteImageUrl: satelliteImage,
        satelliteMapZoom: capturedMapZoom,
        satelliteMapBearing: mapBearing,
      };

      const { error } = await supabase
        .from("bulk_services_documents")
        .update({ drawing_markup_data: markupData as any })
        .eq("id", documentId);

      if (error) throw error;
      toast.success("Satellite markup saved");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExportImage = async () => {
    if (!canvasRef.current || !markupCanvasRef.current) return;

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    exportCanvas.width = canvasRef.current.width;
    exportCanvas.height = canvasRef.current.height;

    ctx.drawImage(canvasRef.current, 0, 0);
    ctx.drawImage(markupCanvasRef.current, 0, 0);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `satellite-markup-${locationName || 'site'}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported");
      }
    });
  };

  const hasCoordinates = coordinates?.lat && coordinates?.lng;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Satellite Site Markup
            </h3>
            {locationName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {locationName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportImage} disabled={!satelliteImage}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !satelliteImage}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Map Preview Controls - Before Capture */}
        {hasCoordinates && !satelliteImage && (
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Map Style</Label>
                <Select value={mapStyle} onValueChange={(v: MapStyle) => setMapStyle(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAP_STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Zoom Level: {mapPreview?.zoom || 17}
                  <span className="text-muted-foreground ml-2 text-xs">
                    (~{(mapPreview?.zoom || 17) >= 18 ? '50m' : (mapPreview?.zoom || 17) >= 17 ? '100m' : (mapPreview?.zoom || 17) >= 16 ? '200m' : '400m'} view)
                  </span>
                </Label>
                <Slider
                  value={[mapPreview?.zoom || 17]}
                  onValueChange={([v]) => setMapPreview(prev => prev ? { ...prev, zoom: v } : null)}
                  min={14}
                  max={20}
                  step={0.5}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Latitude</Label>
                <div className="text-sm font-mono bg-muted/50 p-2 rounded mt-1">
                  {mapPreview?.lat.toFixed(6)}°
                </div>
              </div>
              <div>
                <Label className="text-sm">Longitude</Label>
                <div className="text-sm font-mono bg-muted/50 p-2 rounded mt-1">
                  {mapPreview?.lng.toFixed(6)}°
                </div>
              </div>
              <div>
                <Label className="text-sm">Bearing: {mapPreview?.bearing || 0}°</Label>
                <Slider
                  value={[mapPreview?.bearing || 0]}
                  onValueChange={([v]) => setMapPreview(prev => prev ? { ...prev, bearing: v } : null)}
                  min={0}
                  max={359}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Button onClick={fetchSatelliteImage} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Satellite className="mr-2 h-4 w-4" />
                    Capture Satellite Image
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setMapPreview(prev => prev ? { ...prev, bearing: 0 } : null)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Adjust zoom and bearing before capturing. Higher zoom = more detail, smaller area.
            </p>
          </div>
        )}

        {/* Toolbar - After Capture */}
        {satelliteImage && (
          <div className="space-y-3 mb-4">
            {/* Tool Mode Selection */}
            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider>
                <div className="flex gap-1 border rounded-lg p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={toolMode === "pan"} onPressedChange={() => setToolMode("pan")} size="sm">
                        <Move className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Pan & Zoom</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={toolMode === "select"} onPressedChange={() => setToolMode("select")} size="sm">
                        <MousePointer className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Select</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={toolMode === "marker"} onPressedChange={() => setToolMode("marker")} size="sm">
                        <MapPin className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Add Markers</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={toolMode === "cable"} onPressedChange={() => setToolMode("cable")} size="sm">
                        <Pencil className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Draw Cable Routes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={toolMode === "measure"} onPressedChange={() => setToolMode("measure")} size="sm">
                        <Ruler className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Measure Distance</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-8" />

              {/* View Controls */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.8) }))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={renderImage}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Toggle Options */}
              <TooltipProvider>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={showScale} onPressedChange={setShowScale} size="sm">
                        <Ruler className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Scale Bar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={showNorthArrow} onPressedChange={setShowNorthArrow} size="sm">
                        <Navigation className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>North Arrow</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={showGrid} onPressedChange={setShowGrid} size="sm">
                        <Layers className="h-4 w-4" />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Grid</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Toggle pressed={showLabels} onPressedChange={setShowLabels} size="sm">
                        {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>Labels</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-8" />

              {/* Actions */}
              <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selectedMarker}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Button variant="outline" size="sm" onClick={fetchSatelliteImage} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Recapture
              </Button>
            </div>

            {/* Marker Type Selection */}
            {toolMode === "marker" && (
              <div className="flex flex-wrap gap-2">
                {MARKER_TYPES.map(mt => (
                  <Button
                    key={mt.type}
                    variant={activeMarkerType === mt.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMarkerType(mt.type as Marker["type"])}
                    style={activeMarkerType === mt.type ? { backgroundColor: mt.color } : {}}
                  >
                    <Circle className="h-3 w-3 mr-1" style={{ fill: mt.color, color: mt.color }} />
                    {mt.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Cable Route Instructions */}
            {toolMode === "cable" && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Click to add points, then finish route
                </Badge>
                {currentCablePoints.length > 0 && (
                  <>
                    <Badge>{currentCablePoints.length} points</Badge>
                    <Button size="sm" onClick={finishCableRoute}>
                      Finish Route
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCurrentCablePoints([])}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Measurement Instructions */}
            {toolMode === "measure" && (
              <Badge variant="secondary">
                {measureStart ? "Click to set end point" : "Click to set start point"}
              </Badge>
            )}
          </div>
        )}

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="relative w-full bg-muted/50 rounded-lg overflow-hidden"
          style={{ height: satelliteImage ? "600px" : "200px" }}
        >
          {!hasCoordinates && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No location set. Please set a pin on the Zone Map section first.
                </p>
              </div>
            </div>
          )}

          {hasCoordinates && !satelliteImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Satellite className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-2">
                  Configure settings above and click "Capture Satellite Image"
                </p>
              </div>
            </div>
          )}

          {satelliteImage && (
            <>
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  transformOrigin: "0 0",
                  transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                }}
              />
              <canvas
                ref={markupCanvasRef}
                style={{
                  position: "absolute",
                  transformOrigin: "0 0",
                  transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                  cursor: toolMode === "pan" ? (isPanning ? "grabbing" : "grab") : "crosshair",
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />
            </>
          )}
        </div>

        {/* Legend */}
        {satelliteImage && markers.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Legend</p>
            <div className="flex flex-wrap gap-3">
              {MARKER_TYPES.filter(mt => markers.some(m => m.type === mt.type)).map(mt => (
                <div key={mt.type} className="flex items-center gap-1 text-sm">
                  <Circle className="h-3 w-3" style={{ fill: mt.color, color: mt.color }} />
                  <span>{mt.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {markers.filter(m => m.type === mt.type).length}
                  </Badge>
                </div>
              ))}
              {cableRoutes.length > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <ArrowRight className="h-3 w-3 text-blue-500" />
                  <span>Cable Routes</span>
                  <Badge variant="outline" className="text-xs">{cableRoutes.length}</Badge>
                </div>
              )}
              {measurements.length > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Ruler className="h-3 w-3 text-green-500" />
                  <span>Measurements</span>
                  <Badge variant="outline" className="text-xs">{measurements.length}</Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
