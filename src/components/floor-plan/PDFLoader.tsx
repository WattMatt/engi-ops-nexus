import { useCallback, useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using Vite's public folder
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export function PDFLoader() {
  const { updateState } = useFloorPlan();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);

  useEffect(() => {
    // Test if worker can be loaded
    const testWorker = async () => {
      try {
        console.log('Testing PDF.js worker:', workerSrc);
        const testDoc = await pdfjsLib.getDocument({ 
          data: atob('JVBERi0xLjAKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+ZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDUzIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxNDkKJUVPRg==')
        }).promise;
        await testDoc.getPage(1);
        console.log('Worker loaded successfully');
        setWorkerReady(true);
      } catch (error) {
        console.error('Worker test failed:', error);
        toast({
          title: 'PDF System Error',
          description: 'PDF rendering system failed to initialize. Please refresh the page.',
          variant: 'destructive',
        });
      }
    };
    testWorker();
  }, [toast]);

  const loadPDF = useCallback(async (file: File) => {
    if (!workerReady) {
      toast({
        title: 'Not Ready',
        description: 'PDF system is still initializing. Please wait a moment.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Starting PDF load:', file.name);
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('File read, size:', arrayBuffer.byteLength);
      
      // Load PDF with optimized settings
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
      });
      
      console.log('Loading PDF document...');
      const pdf = await loadingTask.promise;
      
      console.log('PDF loaded successfully, total pages:', pdf.numPages);
      const page = await pdf.getPage(1);
      console.log('First page loaded, rendering...');
      
      // Render to canvas at good quality
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ 
        canvasContext: context, 
        viewport,
        intent: 'display'
      }).promise;
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
        description: `Floor plan loaded successfully (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''})`,
      });
    } catch (error: any) {
      console.error('PDF loading error:', error);
      const errorMessage = error.message || 'Failed to load PDF';
      toast({
        title: 'Error Loading PDF',
        description: errorMessage.includes('timeout') 
          ? 'The PDF file is taking too long to load. Try a smaller file or refresh the page.'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [updateState, toast, workerReady]);

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
          <Button asChild disabled={loading || !workerReady}>
            <span>
              {loading ? 'Loading...' : !workerReady ? 'Initializing...' : 'Choose PDF File'}
            </span>
          </Button>
        </label>
        
        <p className="text-sm text-muted-foreground mt-4">
          or drag and drop a PDF file here
        </p>
      </div>
    </div>
  );
}
