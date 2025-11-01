import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadPdfFromFile } from "./utils/pdfCanvas";
import { ScaleDialog } from "./ScaleDialog";
import { MaskingCanvas } from "./MaskingCanvas";
import { MaskingToolbar } from "./MaskingToolbar";
import type { PDFDocumentProxy } from 'pdfjs-dist';

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'scale' | 'mask'>('select');
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scale, setScale] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scaleLine, setScaleLine] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ 
    start: null, 
    end: null 
  });
  
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

  // Load PDF when in edit mode
  useEffect(() => {
    if (!projectId || !isEditMode) {
      setPdfDoc(null);
      return;
    }

    const loadPdf = async () => {
      const { data: files } = await supabase.storage
        .from('floor-plans')
        .list(`${projectId}`);

      const basePdf = files?.find(f => f.name === 'base.pdf');
      if (basePdf) {
        console.log('Loading PDF from storage');
        const { data, error } = await supabase.storage
          .from('floor-plans')
          .download(`${projectId}/base.pdf`);

        if (error || !data) {
          console.error('Error downloading PDF:', error);
          return;
        }

        const file = new File([data], 'base.pdf', { type: 'application/pdf' });
        const doc = await loadPdfFromFile(file);
        setPdfDoc(doc);
      }
    };

    loadPdf();
  }, [isEditMode, projectId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    console.log('Uploading file:', file.name, 'Size:', file.size, 'bytes');

    if (file.size === 0) {
      toast.error('The selected PDF file is empty');
      return;
    }

    setIsUploading(true);
    try {
      // Delete existing file first to ensure clean upload
      const { error: deleteError } = await supabase.storage
        .from('floor-plans')
        .remove([`${projectId}/base.pdf`]);

      if (deleteError) {
        console.warn('Could not delete existing file:', deleteError);
      }

      console.log('Uploading to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(`${projectId}/base.pdf`, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;
      console.log('Upload successful:', uploadData);

      // Wait a moment for storage to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Load the PDF
      const doc = await loadPdfFromFile(file);
      setPdfDoc(doc);
      setIsEditMode(true); // Automatically enter edit mode
      
      toast.success('Floor plan uploaded successfully');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floor plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToolSelect = (tool: 'select' | 'pan' | 'scale' | 'mask') => {
    setActiveTool(tool);
    if (tool === 'scale') {
      toast.info("Click two points on the floor plan to set a reference line");
    } else if (tool === 'mask') {
      toast.info("Draw masks over tenant areas");
    }
    // Reset scale line when switching tools
    if (tool !== 'scale') {
      setScaleLine({ start: null, end: null });
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
    setActiveTool('select'); // Switch back to select after setting scale
    toast.success(`Scale set: ${distance}m = ${lineLength.toFixed(0)}px`);
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
      
      <div className="flex flex-1 overflow-hidden">
        {isEditMode && (
          <MaskingToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            onUpload={() => fileInputRef.current?.click()}
            isPdfLoaded={!!pdfDoc}
            scaleSet={!!scale}
          />
        )}
        
        <div className="flex-1 flex flex-col">
          {/* Top toolbar with mode toggle */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Floor Plan Masking</h3>
            <div className="flex gap-2">
              {!isEditMode ? (
                <Button onClick={() => setIsEditMode(true)} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Floor Plan
                </Button>
              ) : (
                floorPlanRecord?.composite_image_url && (
                  <Button onClick={() => setIsEditMode(false)} variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                )
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {!isEditMode && floorPlanRecord?.composite_image_url?.endsWith('.png') ? (
              <div className="h-full flex items-center justify-center p-4">
                <img 
                  src={floorPlanRecord.composite_image_url} 
                  alt="Masked Floor Plan"
                  className="max-w-full max-h-full object-contain shadow-lg"
                />
              </div>
            ) : isEditMode && pdfDoc ? (
              <MaskingCanvas 
                pdfDoc={pdfDoc}
                onScaleLineComplete={(start, end) => {
                  setScaleLine({ start, end });
                  setScaleDialogOpen(true);
                }}
                isScaleMode={activeTool === 'scale'}
                existingScale={scale}
                scaleLine={scaleLine}
                onScaleLineUpdate={setScaleLine}
              />
            ) : isEditMode ? (
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
