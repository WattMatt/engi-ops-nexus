import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  FileX,
  Maximize,
  Minimize
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getViewableUrl, downloadFile } from '@/lib/fileViewer';
import { toast } from "sonner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface UniversalDocumentPreviewProps {
  url: string | null;
  fileName?: string;
  className?: string;
  showControls?: boolean;
  autoDownload?: boolean; // If true, non-previewable files trigger download
}

export function UniversalDocumentPreview({
  url,
  fileName,
  className,
  showControls = true,
  autoDownload = false
}: UniversalDocumentPreviewProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PDF state
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pdfError, setPdfError] = useState(false);
  
  // Viewer state
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPdf = url?.toLowerCase().endsWith('.pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url || fileName || '');

  useEffect(() => {
    if (url) {
      setIsLoading(true);
      setError(null);
      setPdfError(false);
      setCurrentPage(1);
      setZoom(1);
      setRotation(0);
      
      getViewableUrl(url).then(({ url: viewUrl, error: urlError }) => {
        if (urlError) {
          console.warn('URL resolution warning:', urlError);
        }
        setResolvedUrl(viewUrl);
        setIsLoading(false);
        
        if (!viewUrl) {
          setError('Could not load file.');
        }
      });
    } else {
      setResolvedUrl(null);
    }
  }, [url]);

  const handleDownload = async () => {
    if (!url) return;
    
    await downloadFile(url, fileName, {
      onError: (err) => {
        toast.error(err || 'Download Failed');
      },
      onSuccess: () => {
        toast.success('Download Started');
      },
    });
  };

  const handleOpenExternal = () => {
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-slate-50 border rounded-lg overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "w-full h-full min-h-[400px]",
        className
      )}
    >
      {/* Controls Header */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b flex-shrink-0 z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-medium text-sm truncate max-w-[200px] md:max-w-xs" title={fileName}>
              {fileName || 'Document Preview'}
            </span>
            {isPdf && numPages > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({currentPage} / {numPages})
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isPdf && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))}
                  disabled={currentPage >= numPages}
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}

            <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate">
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-4 bg-border mx-1" />
            
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleOpenExternal} title="Open in New Tab">
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-slate-100 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Loading preview...</p>
          </div>
        ) : error || !resolvedUrl ? (
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <FileX className="h-16 w-16 opacity-50" />
            <p className="text-sm text-center max-w-xs">{error || 'Unable to preview file'}</p>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        ) : isPdf && !pdfError ? (
           <div className="w-full h-full overflow-auto flex justify-center p-4">
             <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s' }}>
                <Document
                  file={resolvedUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={() => setPdfError(true)}
                  loading={<Skeleton className="w-[600px] h-[800px]" />}
                  className="shadow-lg"
                >
                  <Page
                    pageNumber={currentPage}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    scale={zoom}
                    className="bg-white"
                  />
                </Document>
             </div>
           </div>
        ) : isImage ? (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={8}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                 <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <div className="bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 p-1 flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </div>
                 </div>

                <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                  <img
                    src={resolvedUrl}
                    alt={fileName || 'Preview'}
                    className="max-w-full max-h-full object-contain shadow-md"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.2s'
                    }}
                    draggable={false}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <FileX className="h-16 w-16 opacity-50" />
            <p className="text-sm">Preview not available for this file type</p>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
