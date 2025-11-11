import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Save, Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Point {
  x: number;
  y: number;
}

interface Marker {
  id: string;
  position: Point;
  label: string;
  type: "connection_point" | "transformer" | "substation" | "cable_route";
}

interface ViewState {
  zoom: number;
  offset: Point;
}

interface BulkServicesDrawingMarkupProps {
  documentId: string;
}

export const BulkServicesDrawingMarkup = ({ documentId }: BulkServicesDrawingMarkupProps) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeTool, setActiveTool] = useState<Marker["type"] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSavedMarkup();
  }, [documentId]);

  useEffect(() => {
    if (pdfDoc && containerRef.current) {
      renderPage();
    }
  }, [pdfDoc, containerRef.current]);

  useEffect(() => {
    renderMarkup();
  }, [markers, viewState]);

  const loadSavedMarkup = async () => {
    setLoadingPdf(true);
    try {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("drawing_markup_data, drawing_file_path")
        .eq("id", documentId)
        .single();

      if (error) throw error;

      if (data?.drawing_markup_data && typeof data.drawing_markup_data === 'object') {
        const markupData = data.drawing_markup_data as { markers?: Marker[] };
        setMarkers(markupData.markers || []);
      }

      if (data?.drawing_file_path) {
        await loadPdfFromStorage(data.drawing_file_path);
      } else {
        setLoadingPdf(false);
      }
    } catch (error) {
      console.error("Error loading saved markup:", error);
      toast.error("Failed to load saved drawing");
      setLoadingPdf(false);
    }
  };

  const loadPdfFromStorage = async (path: string) => {
    try {
      console.log('loadPdfFromStorage: downloading from', path);
      const { data, error } = await supabase.storage
        .from("bulk_services_drawings")
        .download(path);

      if (error) throw error;

      console.log('loadPdfFromStorage: download successful, parsing PDF');
      const arrayBuffer = await data.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log('loadPdfFromStorage: PDF parsed successfully');
      setPdfDoc(pdf);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Failed to load drawing");
      setLoadingPdf(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const filePath = `${documentId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("bulk_services_drawings")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update document record
      const { error: updateError } = await supabase
        .from("bulk_services_documents")
        .update({ drawing_file_path: filePath })
        .eq("id", documentId);

      if (updateError) throw updateError;

      // Load the PDF
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);

      toast.success("Drawing uploaded successfully");
    } catch (error) {
      console.error("Error uploading drawing:", error);
      toast.error("Failed to upload drawing");
    } finally {
      setUploading(false);
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) {
      console.log('renderPage: missing refs', { 
        pdfDoc: !!pdfDoc, 
        canvasRef: !!canvasRef.current, 
        containerRef: !!containerRef.current 
      });
      return;
    }

    try {
      console.log('renderPage: starting render');
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const renderScale = 2.0;
      const viewport = page.getViewport({ scale: renderScale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (markupCanvasRef.current) {
        markupCanvasRef.current.width = viewport.width;
        markupCanvasRef.current.height = viewport.height;
      }

      await page.render({ canvasContext: ctx!, viewport }).promise;
      console.log('renderPage: PDF rendered successfully');

      // Calculate initial view state to fit the PDF
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const initialZoom = Math.min(containerWidth / viewport.width, containerHeight / viewport.height) * 0.95;
      const initialOffsetX = (containerWidth - viewport.width * initialZoom) / 2;
      const initialOffsetY = (containerHeight - viewport.height * initialZoom) / 2;
      
      setViewState({ zoom: initialZoom, offset: { x: initialOffsetX, y: initialOffsetY } });
      setLoadingPdf(false);
      console.log('renderPage: view state set');
    } catch (error) {
      console.error('renderPage: error', error);
      setLoadingPdf(false);
    }
  };

  const renderMarkup = () => {
    if (!markupCanvasRef.current) return;

    const canvas = markupCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.zoom, viewState.zoom);

    markers.forEach((marker) => {
      // Draw marker icon based on type
      ctx.save();
      ctx.translate(marker.position.x, marker.position.y);

      // Marker circle
      ctx.fillStyle = getMarkerColor(marker.type);
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.stroke();

      // Marker label
      ctx.fillStyle = "#000";
      ctx.font = `${12 / viewState.zoom}px Arial`;
      ctx.fillText(marker.label, 16, 4);

      ctx.restore();
    });

    ctx.restore();
  };

  const getMarkerColor = (type: Marker["type"]) => {
    switch (type) {
      case "connection_point": return "#ef4444";
      case "transformer": return "#f59e0b";
      case "substation": return "#8b5cf6";
      case "cable_route": return "#3b82f6";
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
      // Place marker
      const worldPos = toWorld(screenPos);
      const newMarker: Marker = {
        id: `marker_${Date.now()}`,
        position: worldPos,
        label: getMarkerLabel(activeTool),
        type: activeTool,
      };
      setMarkers([...markers, newMarker]);
      setActiveTool(null);
    } else {
      // Start panning
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
    
    // Calculate new offset to zoom towards mouse position
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
      default: return `M${count}`;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const markupData: { markers: Marker[] } = { markers };
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({
          drawing_markup_data: markupData as any,
        })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Markup saved successfully");
    } catch (error) {
      console.error("Error saving markup:", error);
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
        a.download = `bulk-services-markup-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Markup exported");
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Preliminary Drawing Markup</h3>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Drawing"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.8) }))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => pdfDoc && renderPage()}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportImage} disabled={!pdfDoc}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || markers.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTool === "connection_point" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool(activeTool === "connection_point" ? null : "connection_point")}
          >
            Connection Point
          </Button>
          <Button
            variant={activeTool === "transformer" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool(activeTool === "transformer" ? null : "transformer")}
          >
            Transformer
          </Button>
          <Button
            variant={activeTool === "substation" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool(activeTool === "substation" ? null : "substation")}
          >
            Substation
          </Button>
          <Button
            variant={activeTool === "cable_route" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool(activeTool === "cable_route" ? null : "cable_route")}
          >
            Cable Route
          </Button>
        </div>
      </Card>

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-muted/20" 
        style={{ height: "600px" }}
      >
        {loadingPdf ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
              <p>Loading drawing...</p>
            </div>
          </div>
        ) : !pdfDoc ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Upload a PDF drawing to begin markup</p>
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
