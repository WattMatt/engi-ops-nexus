import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Ruler, Pencil, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { loadPdfFromFile, renderPdfToCanvas } from "./utils/pdfCanvas";
import { ScaleDialog } from "./ScaleDialog";

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scaleLine, setScaleLine] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ start: null, end: null });
  const [scale, setScale] = useState<number | null>(null); // pixels per meter
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
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

  // Load PDF when in edit mode or when composite is a PDF
  useEffect(() => {
    if (!projectId) return;

    const loadPdf = async () => {
      // Check if base.pdf exists first
      const { data: files } = await supabase.storage
        .from('floor-plans')
        .list(`${projectId}`);

      const basePdf = files?.find(f => f.name === 'base.pdf');
      if (basePdf) {
        // Download the PDF file as blob and render
        await renderPdfFromStorage(projectId, 'base.pdf');
      }
    };

    // Load PDF if in edit mode OR if we have a record but no valid image
    if (isEditMode || (floorPlanRecord && !floorPlanRecord.composite_image_url?.endsWith('.png'))) {
      loadPdf();
    }
  }, [isEditMode, projectId, floorPlanRecord]);

  const renderPdfFromStorage = async (projectId: string, fileName: string) => {
    try {
      console.log('Downloading PDF from storage:', projectId, fileName);
      
      // Download the PDF file as a blob
      const { data, error } = await supabase.storage
        .from('floor-plans')
        .download(`${projectId}/${fileName}`);

      if (error) throw error;
      if (!data) throw new Error('No data received from storage');

      console.log('PDF downloaded, size:', data.size, 'bytes');

      // Create a File object from the blob
      const file = new File([data], fileName, { type: 'application/pdf' });
      
      // Load PDF using the utility function (same as floor plan designer)
      const pdfDoc = await loadPdfFromFile(file);
      console.log('PDF loaded successfully, pages:', pdfDoc.numPages);

      // Create a temporary canvas to render the PDF
      const tempCanvas = document.createElement('canvas');
      
      // Render PDF to canvas using the utility function
      await renderPdfToCanvas(pdfDoc, { 
        pdfCanvas: tempCanvas,
        scale: 2.0 
      });
      
      // Convert canvas to image data URL
      const imageData = tempCanvas.toDataURL();
      console.log('PDF rendered to image successfully');
      setPdfImage(imageData);
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
      await renderPdfFromStorage(projectId, 'base.pdf');
      toast.success('Floor plan uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floor plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleScale = () => {
    setIsScaleMode(true);
    toast.info("Click two points on the floor plan to set a reference line");
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isScaleMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!scaleLine.start) {
      setScaleLine({ start: { x, y }, end: null });
    } else {
      setScaleLine({ ...scaleLine, end: { x, y } });
      setScaleDialogOpen(true);
      setIsScaleMode(false);
    }
  };

  const handleScaleSubmit = (distance: number) => {
    if (!scaleLine.start || !scaleLine.end) return;

    const lineLength = Math.sqrt(
      Math.pow(scaleLine.end.x - scaleLine.start.x, 2) +
      Math.pow(scaleLine.end.y - scaleLine.start.y, 2)
    );

    const pixelsPerMeter = lineLength / distance;
    setScale(pixelsPerMeter);
    setScaleLine({ start: null, end: null });
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
      
      <div className="flex-1 overflow-hidden p-4">
        {!isEditMode && floorPlanRecord?.composite_image_url?.endsWith('.png') ? (
          <div className="h-full flex items-center justify-center">
            <img 
              src={floorPlanRecord.composite_image_url} 
              alt="Masked Floor Plan"
              className="max-w-full max-h-full object-contain shadow-lg"
            />
          </div>
        ) : pdfImage ? (
          <div className="relative w-full h-full">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={10}
              centerOnInit
              disabled={isScaleMode}
            >
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <div className="relative">
                  <img 
                    ref={imageRef}
                    src={pdfImage} 
                    alt="Floor Plan"
                    className={`max-w-full max-h-full ${isScaleMode ? 'cursor-crosshair' : ''}`}
                    onClick={handleImageClick}
                  />
                  {scaleLine.start && (
                    <svg 
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <line
                        x1={scaleLine.start.x}
                        y1={scaleLine.start.y}
                        x2={scaleLine.end?.x ?? scaleLine.start.x}
                        y2={scaleLine.end?.y ?? scaleLine.start.y}
                        stroke="red"
                        strokeWidth="2"
                      />
                      <circle cx={scaleLine.start.x} cy={scaleLine.start.y} r="4" fill="red" />
                      {scaleLine.end && (
                        <circle cx={scaleLine.end.x} cy={scaleLine.end.y} r="4" fill="red" />
                      )}
                    </svg>
                  )}
                </div>
              </TransformComponent>
            </TransformWrapper>
            {scale && (
              <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-2 text-sm">
                Scale: {scale.toFixed(2)} px/m
              </div>
            )}
          </div>
        ) : floorPlanRecord?.base_pdf_url || pdfUrl ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
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
        }}
        onSubmit={handleScaleSubmit}
      />
    </div>
  );
};
