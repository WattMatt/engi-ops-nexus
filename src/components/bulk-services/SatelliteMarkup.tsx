import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save, Download, ZoomIn, ZoomOut, Maximize2, MapPin, Satellite, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Point {
  x: number;
  y: number;
}

interface Marker {
  id: string;
  position: Point;
  label: string;
  type: "connection_point" | "transformer" | "substation" | "cable_route" | "meter_room" | "generator";
}

interface ViewState {
  zoom: number;
  offset: Point;
}

interface SatelliteMarkupProps {
  documentId: string;
  coordinates?: { lat: number; lng: number } | null;
  locationName?: string;
}

const MAPBOX_STATIC_API = "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static";

export const SatelliteMarkup = ({ documentId, coordinates, locationName }: SatelliteMarkupProps) => {
  const [satelliteImage, setSatelliteImage] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeTool, setActiveTool] = useState<Marker["type"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(15); // Default zoom 15 for ~500m area
  const [imageSize] = useState({ width: 1280, height: 1024 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    loadSavedSatelliteMarkup();
  }, [documentId]);

  useEffect(() => {
    if (satelliteImage) {
      renderImage();
    }
  }, [satelliteImage]);

  useEffect(() => {
    renderMarkup();
  }, [markers, viewState]);

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
          markers?: Marker[]; 
          satelliteMarkers?: Marker[];
          satelliteImageUrl?: string;
        };
        if (markupData.satelliteMarkers) {
          setMarkers(markupData.satelliteMarkers);
        }
        if (markupData.satelliteImageUrl) {
          setSatelliteImage(markupData.satelliteImageUrl);
        }
      }
    } catch (error) {
      console.error("Error loading saved satellite markup:", error);
    }
  };

  const fetchSatelliteImage = async () => {
    if (!coordinates) {
      toast.error("No location coordinates available. Please set a pin on the Zone Map first.");
      return;
    }

    setLoading(true);
    try {
      // Fetch Mapbox token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("get-mapbox-token");
      
      if (tokenError || !tokenData?.token) {
        throw new Error("Failed to get Mapbox token");
      }

      // Note: Mapbox Static API uses lon,lat order (not lat,lng)
      const lon = coordinates.lng;
      const lat = coordinates.lat;
      
      console.log(`Fetching satellite image for: ${lat}, ${lon} at zoom ${mapZoom}`);
      
      // Build the static map URL - format: lon,lat,zoom,bearing/widthxheight
      const url = `${MAPBOX_STATIC_API}/${lon},${lat},${mapZoom},0/${imageSize.width}x${imageSize.height}@2x?access_token=${tokenData.token}`;
      
      console.log('Satellite URL:', url.replace(tokenData.token, 'TOKEN_HIDDEN'));
      
      // Load the image
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Satellite image loaded successfully:', img.width, 'x', img.height);
          resolve(true);
        };
        img.onerror = (e) => {
          console.error('Failed to load satellite image:', e);
          reject(e);
        };
        img.src = url;
      });

      imageRef.current = img;
      setSatelliteImage(url);
      toast.success(`Satellite image loaded for ${locationName || 'location'}`);
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

    // Calculate initial view state to fit the image
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const initialZoom = Math.min(containerWidth / img.width, containerHeight / img.height) * 0.95;
    const initialOffsetX = (containerWidth - img.width * initialZoom) / 2;
    const initialOffsetY = (containerHeight - img.height * initialZoom) / 2;
    
    setViewState({ zoom: initialZoom, offset: { x: initialOffsetX, y: initialOffsetY } });
  };

  const renderMarkup = () => {
    if (!markupCanvasRef.current) return;

    const canvas = markupCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    markers.forEach((marker) => {
      ctx.save();
      ctx.translate(marker.position.x, marker.position.y);

      // Marker circle
      ctx.fillStyle = getMarkerColor(marker.type);
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Marker label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(marker.label, 0, 0);

      ctx.restore();
    });
  };

  const getMarkerColor = (type: Marker["type"]) => {
    switch (type) {
      case "connection_point": return "#ef4444";
      case "transformer": return "#f59e0b";
      case "substation": return "#8b5cf6";
      case "cable_route": return "#3b82f6";
      case "meter_room": return "#10b981";
      case "generator": return "#6366f1";
      default: return "#6b7280";
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPos = getMousePos(e);

    if (activeTool) {
      const worldPos = toWorld(screenPos);
      const newMarker: Marker = {
        id: `sat_marker_${Date.now()}`,
        position: worldPos,
        label: getMarkerLabel(activeTool),
        type: activeTool,
      };
      setMarkers([...markers, newMarker]);
      setActiveTool(null);
    } else {
      setIsPanning(true);
      setPanStart(screenPos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
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

  const getMarkerLabel = (type: Marker["type"]) => {
    const count = markers.filter(m => m.type === type).length + 1;
    switch (type) {
      case "connection_point": return `CP${count}`;
      case "transformer": return `TX${count}`;
      case "substation": return `SS${count}`;
      case "cable_route": return `CR${count}`;
      case "meter_room": return `MR${count}`;
      case "generator": return `GN${count}`;
      default: return `M${count}`;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get existing markup data first
      const { data: existing } = await supabase
        .from("bulk_services_documents")
        .select("drawing_markup_data")
        .eq("id", documentId)
        .single();

      const existingData = existing?.drawing_markup_data as { markers?: Marker[] } || {};
      
      const markupData = { 
        ...existingData,
        satelliteMarkers: markers,
        satelliteImageUrl: satelliteImage,
      };

      const { error } = await supabase
        .from("bulk_services_documents")
        .update({
          drawing_markup_data: markupData as any,
        })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Satellite markup saved successfully");
    } catch (error) {
      console.error("Error saving satellite markup:", error);
      toast.error("Failed to save markup");
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
        toast.success("Satellite markup exported");
      }
    });
  };

  const hasCoordinates = coordinates?.lat && coordinates?.lng;

  return (
    <div className="space-y-4">
      <Card className="p-4">
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
                {hasCoordinates && (
                  <span className="text-xs ml-2">
                    ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSatelliteImage}
              disabled={loading || !hasCoordinates}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Loading..." : satelliteImage ? "Refresh" : "Capture Satellite"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.8) }))} disabled={!satelliteImage}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))} disabled={!satelliteImage}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={renderImage} disabled={!satelliteImage}>
              <Maximize2 className="h-4 w-4" />
            </Button>
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

        {hasCoordinates && !satelliteImage && (
          <div className="mb-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Location Details</p>
              <p className="text-xs text-muted-foreground mt-1">
                Latitude: {coordinates.lat.toFixed(6)}° | Longitude: {coordinates.lng.toFixed(6)}°
              </p>
              {locationName && (
                <p className="text-xs text-muted-foreground">
                  Near: {locationName}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-sm">
                Map Zoom Level: {mapZoom} 
                <span className="text-muted-foreground ml-2">
                  (~{mapZoom >= 18 ? '100m' : mapZoom >= 17 ? '200m' : mapZoom >= 16 ? '400m' : mapZoom >= 15 ? '800m' : mapZoom >= 14 ? '1.5km' : '3km'} area)
                </span>
              </Label>
              <Slider
                value={[mapZoom]}
                onValueChange={([value]) => setMapZoom(value)}
                min={13}
                max={19}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower zoom = larger area coverage. Adjust to capture your site boundaries.
              </p>
            </div>
          </div>
        )}

        {satelliteImage && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={activeTool === "connection_point" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "connection_point" ? null : "connection_point")}
              className={activeTool === "connection_point" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              Connection Point
            </Button>
            <Button
              variant={activeTool === "transformer" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "transformer" ? null : "transformer")}
              className={activeTool === "transformer" ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              Transformer
            </Button>
            <Button
              variant={activeTool === "substation" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "substation" ? null : "substation")}
              className={activeTool === "substation" ? "bg-violet-500 hover:bg-violet-600" : ""}
            >
              Substation
            </Button>
            <Button
              variant={activeTool === "cable_route" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "cable_route" ? null : "cable_route")}
              className={activeTool === "cable_route" ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              Cable Route
            </Button>
            <Button
              variant={activeTool === "meter_room" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "meter_room" ? null : "meter_room")}
              className={activeTool === "meter_room" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
            >
              Meter Room
            </Button>
            <Button
              variant={activeTool === "generator" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(activeTool === "generator" ? null : "generator")}
              className={activeTool === "generator" ? "bg-indigo-500 hover:bg-indigo-600" : ""}
            >
              Generator
            </Button>
            {markers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMarkers([])}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </Card>

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-muted/20" 
        style={{ height: "600px" }}
      >
        {!hasCoordinates ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Location Set</p>
              <p className="text-sm mt-2">Drop a pin on the Zone Map tab to enable satellite markup</p>
            </div>
          </div>
        ) : !satelliteImage ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Satellite className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Ready to Capture</p>
              <p className="text-sm mt-2">Click "Capture Satellite" to load satellite imagery</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Location: {locationName || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0"
              style={{
                transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                transformOrigin: '0 0',
              }}
            />
            <canvas
              ref={markupCanvasRef}
              className="absolute top-0 left-0"
              style={{ 
                transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.zoom})`,
                transformOrigin: '0 0',
                cursor: activeTool ? "crosshair" : isPanning ? "grabbing" : "grab"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          </div>
        )}
      </div>
    </div>
  );
};
