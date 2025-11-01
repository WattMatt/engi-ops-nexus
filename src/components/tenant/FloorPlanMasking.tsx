import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Ruler, Pencil, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import * as pdfjsLib from "pdfjs-dist";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
        // Use public URL instead of signed URL for better compatibility with PDF.js
        const { data } = await supabase.storage
          .from('floor-plans')
          .getPublicUrl(`${projectId}/base.pdf`);
        
        if (data?.publicUrl) {
          setPdfUrl(data.publicUrl);
          renderPdfToImage(data.publicUrl);
        }
      }
    };

    // Load PDF if in edit mode OR if we have a record but no valid image
    if (isEditMode || (floorPlanRecord && !floorPlanRecord.composite_image_url?.endsWith('.png'))) {
      loadPdf();
    }
  }, [isEditMode, projectId, floorPlanRecord]);

  const renderPdfToImage = async (url: string) => {
    try {
      console.log('Loading PDF from URL:', url);
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      console.log('PDF loaded, pages:', pdf.numPages);
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      tempCanvas.height = viewport.height;
      tempCanvas.width = viewport.width;

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
        const imageData = tempCanvas.toDataURL();
        console.log('PDF rendered to image successfully');
        setPdfImage(imageData);
      }
    } catch (error) {
      console.error('Error rendering PDF:', error);
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

      // Get the public URL and render
      const { data } = await supabase.storage
        .from('floor-plans')
        .getPublicUrl(`${projectId}/base.pdf`);

      if (data?.publicUrl) {
        setPdfUrl(data.publicUrl);
        await renderPdfToImage(data.publicUrl);
        toast.success('Floor plan uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floor plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleScale = () => {
    // TODO: Implement scale setting
    toast.info("Scale functionality coming soon");
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
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
          >
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
              <img 
                src={pdfImage} 
                alt="Floor Plan"
                className="max-w-full max-h-full"
              />
            </TransformComponent>
          </TransformWrapper>
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
    </div>
  );
};
