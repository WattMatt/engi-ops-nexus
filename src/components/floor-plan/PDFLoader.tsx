import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFLoader() {
  const { updateState } = useFloorPlan();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const loadPDF = useCallback(async (file: File) => {
    setLoading(true);
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      // Render to canvas
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Update state
      updateState({
        pdfFile: file,
        pdfDataUrl: dataUrl,
      });
      
      toast({
        title: 'PDF Loaded',
        description: 'Floor plan loaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load PDF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [updateState, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadPDF(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
    }
  }, [loadPDF, toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      loadPDF(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please drop a PDF file',
        variant: 'destructive',
      });
    }
  }, [loadPDF, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="max-w-2xl w-full p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors"
      >
        <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Load Floor Plan</h2>
        <p className="text-muted-foreground mb-6">
          Upload a PDF file to begin marking up your electrical floor plan
        </p>
        
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-upload"
          disabled={loading}
        />
        
        <label htmlFor="pdf-upload">
          <Button asChild disabled={loading}>
            <span>{loading ? 'Loading...' : 'Choose PDF File'}</span>
          </Button>
        </label>
        
        <p className="text-sm text-muted-foreground mt-4">
          or drag and drop a PDF file here
        </p>
      </div>
    </div>
  );
}
