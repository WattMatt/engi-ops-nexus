/**
 * Drawing Preview Pane
 * PDF/Image viewer with zoom and pan functionality
 * Supports file upload from local device or Dropbox
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
  FileX,
  Upload,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DropboxFileInput } from '@/components/storage/DropboxFileInput';
import { useDrawingFileUpload } from '@/hooks/useDrawingFileUpload';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DrawingPreviewPaneProps {
  fileUrl?: string | null;
  fileName?: string;
  fileType?: string;
  filePath?: string | null;
  drawingId?: string;
  projectId?: string;
  onFileUploaded?: () => void;
}

// Private buckets that need signed URLs
const PRIVATE_BUCKETS = ['handover-documents', 'budget-reports', 'invoice-pdfs', 'floor-plan-reports'];

// Extract bucket name from a public URL pattern
const extractBucketFromUrl = (url: string): string | null => {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)/);
  return match?.[1] || null;
};

export function DrawingPreviewPane({ 
  fileUrl, 
  fileName, 
  fileType,
  filePath,
  drawingId,
  projectId,
  onFileUploaded
}: DrawingPreviewPaneProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pdfError, setPdfError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { uploadFile, deleteFile, isUploading, uploadProgress } = useDrawingFileUpload();
  
  const isPdf = fileType?.includes('pdf') || fileUrl?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || '');
  
  const canUpload = !!drawingId && !!projectId;
  
  // Resolve the file URL (create signed URL for private buckets)
  useEffect(() => {
    const resolveFileUrl = async () => {
      if (!fileUrl) {
        setResolvedUrl(null);
        return;
      }
      
      const bucket = extractBucketFromUrl(fileUrl);
      
      // If it's a private bucket, we need a signed URL
      if (bucket && PRIVATE_BUCKETS.includes(bucket)) {
        setIsLoadingUrl(true);
        try {
          // Extract the file path from the URL
          const pathMatch = fileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
          const extractedPath = pathMatch?.[1];
          
          if (extractedPath) {
            const { data } = await supabase.storage
              .from(bucket)
              .createSignedUrl(extractedPath, 3600);
            
            if (data?.signedUrl) {
              setResolvedUrl(data.signedUrl);
            } else {
              setResolvedUrl(fileUrl); // Fallback to original
            }
          } else {
            setResolvedUrl(fileUrl);
          }
        } catch (error) {
          console.error('Failed to create signed URL:', error);
          setResolvedUrl(fileUrl);
        } finally {
          setIsLoadingUrl(false);
        }
      } else {
        // Public bucket, use URL directly
        setResolvedUrl(fileUrl);
      }
    };
    
    resolveFileUrl();
  }, [fileUrl]);
  
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
  
  // Mouse wheel zoom (default behavior, hold Shift to pan instead)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.shiftKey) {
      // Pan with Shift+scroll
      setOffset(prev => ({
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5,
      }));
    } else {
      // Zoom with scroll wheel (centered on cursor)
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
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

  // Handle file upload
  const handleFileSelect = async (file: File) => {
    if (!canUpload) return;
    
    try {
      await uploadFile(file, {
        drawingId: drawingId!,
        projectId: projectId!,
        onSuccess: () => {
          onFileUploaded?.();
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async () => {
    if (!drawingId || !filePath) return;
    
    const success = await deleteFile(drawingId, filePath);
    if (success) {
      setShowDeleteDialog(false);
      onFileUploaded?.();
    }
  };
  
  // Empty state with upload option
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 text-muted-foreground p-8">
        <FileX className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No file attached</p>
        
        {canUpload ? (
          <div className="w-full max-w-md">
            {isUploading ? (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading drawing file...</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              <DropboxFileInput
                onFileSelect={handleFileSelect}
                allowedExtensions={['.pdf', '.png', '.jpg', '.jpeg', '.webp']}
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                placeholder="Upload a drawing file to preview it here"
                dropboxTitle="Import Drawing from Dropbox"
                dropboxDescription="Select a PDF or image file from your Dropbox"
              />
            )}
          </div>
        ) : (
          <p className="text-sm">Upload a drawing file to preview it here</p>
        )}
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
          {canUpload && filePath && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              title="Remove file"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          
          {canUpload && (
            <label>
              <Button 
                variant="ghost" 
                size="sm"
                asChild
                disabled={isUploading}
              >
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Replace
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
                disabled={isUploading}
              />
            </label>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            asChild
          >
            <a href={resolvedUrl || fileUrl} target="_blank" rel="noopener noreferrer">
              <Maximize2 className="h-4 w-4 mr-1" />
              Open
            </a>
          </Button>
        </div>
      </div>
      
      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm">Uploading file...</p>
            <Progress value={uploadProgress} className="w-48 h-2" />
          </div>
        </div>
      )}
      
      {/* Preview Area */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden bg-muted/20 relative",
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
          {isLoadingUrl ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isPdf && !pdfError && resolvedUrl ? (
            <Document
              file={resolvedUrl}
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
          ) : isImage && resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt={fileName || 'Drawing preview'}
              className="max-w-full max-h-full object-contain shadow-lg"
              draggable={false}
            />
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileX className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Failed to load PDF</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <a href={resolvedUrl || fileUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileX className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Preview not available for this file type</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <a href={resolvedUrl || fileUrl} target="_blank" rel="noopener noreferrer">
                  Download file
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer info */}
      <div className="px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
        <span>Scroll to zoom • Shift+Scroll to pan • Drag to pan</span>
        {fileName && (
          <span className="truncate max-w-[200px]" title={fileName}>
            {fileName}
          </span>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove drawing file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the attached file from this drawing. The file will be deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
