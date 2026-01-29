/**
 * Drawing Preview Pane
 * PDF/Image viewer with zoom and pan functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  FileX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DrawingPreviewPaneProps {
  fileUrl?: string | null;
  fileName?: string;
  fileType?: string;
}

export function DrawingPreviewPane({ fileUrl, fileName, fileType }: DrawingPreviewPaneProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pdfError, setPdfError] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const isPdf = fileType?.includes('pdf') || fileUrl?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || '');
  
  // Reset view when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setCurrentPage(1);
    setPdfError(false);
  }, [fileUrl]);
  
  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 10));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);
  
  const handleResetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);
  
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);
  
  // Mouse wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
    } else {
      // Pan with scroll
      setOffset(prev => ({
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5,
      }));
    }
  }, []);
  
  // Pan with mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // PDF page navigation
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(false);
  };
  
  const onDocumentLoadError = () => {
    setPdfError(true);
  };
  
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 text-muted-foreground">
        <FileX className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No file attached</p>
        <p className="text-sm">Upload a drawing file to preview it here</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetView} title="Reset View">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Page navigation for PDFs */}
        {isPdf && numPages > 1 && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {numPages}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            asChild
          >
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Maximize2 className="h-4 w-4 mr-1" />
              Open
            </a>
          </Button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-muted/20",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {isPdf && !pdfError ? (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Skeleton className="w-[600px] h-[800px]" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            </Document>
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={fileName || 'Drawing preview'}
              className="max-w-full max-h-full object-contain shadow-lg"
              draggable={false}
            />
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileX className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Failed to load PDF</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileX className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Preview not available for this file type</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Download file
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer info */}
      <div className="px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
        <span>Scroll to pan • Ctrl+Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
}
