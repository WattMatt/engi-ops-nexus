import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Ruler, Pencil, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadPdfFromFile, renderPdfToCanvas } from "./utils/pdfCanvas";
import { ScaleDialog } from "./ScaleDialog";
import { Canvas as FabricCanvas, Line, Circle, FabricImage } from "fabric";

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scale, setScale] = useState<number | null>(null); // pixels per meter
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scaleLine, setScaleLine] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ 
    start: null, 
    end: null 
  });
  const [currentScaleLine, setCurrentScaleLine] = useState<Line | null>(null);
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: floorPlanRecord, isLoading } = useQuery({
    queryKey: ['tenant-floor-plan', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !canvasContainerRef.current || !isEditMode) {
      console.log('Canvas init skipped:', { 
        hasCanvasRef: !!canvasRef.current, 
        hasContainerRef: !!canvasContainerRef.current, 
        isEditMode 
      });
      return;
    }

    console.log('Initializing Fabric canvas');
    const container = canvasContainerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#f5f5f5',
    });

    console.log('Fabric canvas created:', canvas.width, 'x', canvas.height);
    setFabricCanvas(canvas);

    return () => {
      console.log('Disposing fabric canvas');
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, [isEditMode]);

  // Load PDF when canvas is ready and in edit mode
  useEffect(() => {
    if (!projectId || !fabricCanvas || !isEditMode) {
      console.log('PDF load skipped:', { 
        hasProjectId: !!projectId, 
        hasFabricCanvas: !!fabricCanvas, 
        isEditMode 
      });
      return;
    }

    const loadPdf = async () => {
      console.log('Checking for existing PDF...');
      const { data: files } = await supabase.storage
        .from('floor-plans')
        .list(`${projectId}`);

      console.log('Files in storage:', files);
      const basePdf = files?.find(f => f.name === 'base.pdf');
      if (basePdf) {
        console.log('Loading PDF from storage');
        await renderPdfToFabric(projectId, 'base.pdf');
      } else {
        console.log('No base.pdf found in storage');
      }
    };

    loadPdf();
  }, [isEditMode, projectId, fabricCanvas]);

  const renderPdfToFabric = async (projectId: string, fileName: string) => {
    if (!fabricCanvas) return;

    try {
      console.log('Downloading PDF from storage:', projectId, fileName);
      
      const { data, error } = await supabase.storage
        .from('floor-plans')
        .download(`${projectId}/${fileName}`);

      if (error) throw error;
      if (!data) throw new Error('No data received from storage');

      console.log('PDF downloaded, size:', data.size, 'bytes');

      const file = new File([data], fileName, { type: 'application/pdf' });
      const pdfDoc = await loadPdfFromFile(file);
      console.log('PDF loaded successfully, pages:', pdfDoc.numPages);

      const tempCanvas = document.createElement('canvas');
      await renderPdfToCanvas(pdfDoc, { 
        pdfCanvas: tempCanvas,
        scale: 2.0 
      });
      
      const imageData = tempCanvas.toDataURL();
      console.log('PDF rendered to image successfully');

      // Set background image in Fabric canvas
      FabricImage.fromURL(imageData).then((img) => {
        if (!fabricCanvas) return;
        
        // Scale image to fit canvas
        const scale = Math.min(
          fabricCanvas.width! / img.width!,
          fabricCanvas.height! / img.height!
        );
        
        img.scale(scale);
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      });
    } catch (error) {
      console.error('Error rendering PDF from storage:', error);
      toast.error('Failed to load PDF. Please try uploading again.');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(`${projectId}/base.pdf`, file, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;


      // Render the uploaded PDF
      await renderPdfToFabric(projectId, 'base.pdf');
      toast.success('Floor plan uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floor plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCanvasMouseDown = useCallback((e: any) => {
    if (!isScaleMode || !fabricCanvas) return;

    const pointer = fabricCanvas.getScenePoint(e.e);

    if (!scaleLine.start) {
      // First point
      setScaleLine({ start: { x: pointer.x, y: pointer.y }, end: null });
      
      const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: 'red',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      
      fabricCanvas.add(line);
      setCurrentScaleLine(line);
    } else {
      // Second point - complete the line
      setScaleLine({ ...scaleLine, end: { x: pointer.x, y: pointer.y } });
      setScaleDialogOpen(true);
      setIsScaleMode(false);
      fabricCanvas.defaultCursor = 'default';
    }
  }, [isScaleMode, scaleLine, fabricCanvas]);

  const handleCanvasMouseMove = useCallback((e: any) => {
    if (!isScaleMode || !scaleLine.start || !currentScaleLine || !fabricCanvas) return;

    const pointer = fabricCanvas.getScenePoint(e.e);
    currentScaleLine.set({ x2: pointer.x, y2: pointer.y });
    fabricCanvas.renderAll();
  }, [isScaleMode, scaleLine.start, currentScaleLine, fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.on('mouse:down', handleCanvasMouseDown);
    fabricCanvas.on('mouse:move', handleCanvasMouseMove);

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasMouseDown);
      fabricCanvas.off('mouse:move', handleCanvasMouseMove);
    };
  }, [fabricCanvas, handleCanvasMouseDown, handleCanvasMouseMove]);

  const handleScale = () => {
    if (!fabricCanvas) return;
    setIsScaleMode(true);
    fabricCanvas.defaultCursor = 'crosshair';
    toast.info("Click two points on the floor plan to set a reference line");
  };

  const handleScaleSubmit = (distance: number) => {
    if (!scaleLine.start || !scaleLine.end || !fabricCanvas) return;

    const lineLength = Math.sqrt(
      Math.pow(scaleLine.end.x - scaleLine.start.x, 2) +
      Math.pow(scaleLine.end.y - scaleLine.start.y, 2)
    );

    const pixelsPerMeter = lineLength / distance;
    setScale(pixelsPerMeter);
    
    // Add circles at endpoints
    const startCircle = new Circle({
      left: scaleLine.start.x,
      top: scaleLine.start.y,
      radius: 4,
      fill: 'red',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    const endCircle = new Circle({
      left: scaleLine.end.x,
      top: scaleLine.end.y,
      radius: 4,
      fill: 'red',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(startCircle, endCircle);
    
    setScaleLine({ start: null, end: null });
    setCurrentScaleLine(null);
    toast.success(`Scale set: ${distance}m = ${lineLength.toFixed(0)}px`);
  };

  const handleMasking = () => {
    // TODO: Implement masking drawing
    toast.info("Masking functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleUpload}
        className="hidden"
      />
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Floor Plan Masking</h3>
        <div className="flex gap-2">
          {!isEditMode ? (
            <Button onClick={() => setIsEditMode(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Floor Plan
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                size="sm"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload PDF
              </Button>
              <Button onClick={handleScale} variant="outline" size="sm">
                <Ruler className="w-4 h-4 mr-2" />
                Scale
              </Button>
              <Button onClick={handleMasking} variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Masking
              </Button>
              {floorPlanRecord?.composite_image_url && (
                <Button onClick={() => setIsEditMode(false)} variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div ref={canvasContainerRef} className="flex-1 overflow-hidden p-4 bg-muted/30">
        {!isEditMode && floorPlanRecord?.composite_image_url?.endsWith('.png') ? (
          <div className="h-full flex items-center justify-center">
            <img 
              src={floorPlanRecord.composite_image_url} 
              alt="Masked Floor Plan"
              className="max-w-full max-h-full object-contain shadow-lg"
            />
          </div>
        ) : isEditMode ? (
          <div className="relative w-full h-full">
            <canvas ref={canvasRef} className="border border-border shadow-lg" />
            {scale && (
              <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-2 text-sm">
                Scale: {scale.toFixed(2)} px/m
              </div>
            )}
            {!fabricCanvas && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">No floor plan available. Upload a PDF to get started.</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScaleDialog
        isOpen={scaleDialogOpen}
        onClose={() => {
          setScaleDialogOpen(false);
          setScaleLine({ start: null, end: null });
          if (currentScaleLine && fabricCanvas) {
            fabricCanvas.remove(currentScaleLine);
            setCurrentScaleLine(null);
          }
        }}
        onSubmit={handleScaleSubmit}
      />
    </div>
  );
};
