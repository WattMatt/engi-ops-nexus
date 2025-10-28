import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - using cdnjs for better compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFLoader() {
  const { updateState } = useFloorPlan();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const loadPDF = useCallback(async (file: File) => {
    setLoading(true);
    try {
      console.log('Starting PDF load:', file.name);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('File read, size:', arrayBuffer.byteLength);
      
      // Load PDF with error handling
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 1,
        useWorkerFetch: false,
        isEvalSupported: false,
      });
      
      // Add error event listener
      loadingTask.onPassword = () => {
        throw new Error('This PDF is password protected. Please use an unprotected PDF.');
      };
      
      console.log('Loading PDF document...');
      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PDF loading timeout after 30 seconds. Try a smaller or simpler PDF file.')), 30000)
        )
      ]) as pdfjsLib.PDFDocumentProxy;
      
      console.log('PDF loaded, getting first page...');
      const page = await pdf.getPage(1);
      console.log('Page loaded, rendering...');
      
      // Render to canvas at lower scale for faster loading
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      console.log('Page rendered successfully');
      
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
      console.error('PDF loading error:', error);
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
