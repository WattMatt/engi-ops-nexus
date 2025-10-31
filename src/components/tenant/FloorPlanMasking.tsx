import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Ruler, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Load PDF when in edit mode
  useEffect(() => {
    if (!isEditMode || !projectId) return;

    const loadPdf = async () => {
      const { data: files } = await supabase.storage
        .from('floor-plans')
        .list(`${projectId}`);

      const basePdf = files?.find(f => f.name === 'base.pdf');
      if (basePdf) {
        const { data } = await supabase.storage
          .from('floor-plans')
          .createSignedUrl(`${projectId}/base.pdf`, 3600);
        
        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
          renderPdfToImage(data.signedUrl);
        }
      }
    };

    loadPdf();
  }, [isEditMode, projectId]);

  const renderPdfToImage = async (url: string) => {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
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
      setPdfImage(tempCanvas.toDataURL());
    }
  };

  const handleScale = () => {
    // TODO: Implement scale setting
    console.log("Scale button clicked");
  };

  const handleMasking = () => {
    // TODO: Implement masking drawing
    console.log("Masking button clicked");
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
        {!isEditMode && floorPlanRecord?.composite_image_url ? (
          <div className="h-full flex items-center justify-center">
            <img 
              src={floorPlanRecord.composite_image_url} 
              alt="Masked Floor Plan"
              className="max-w-full max-h-full object-contain shadow-lg"
            />
          </div>
        ) : isEditMode && pdfImage ? (
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
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>No floor plan available. Upload a PDF to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
