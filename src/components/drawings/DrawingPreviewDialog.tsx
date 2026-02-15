 /**
  * Drawing Preview Dialog
  * Inline PDF/Image viewer dialog - no popups required
  */
 
 import { useState, useEffect } from 'react';
 import { Document, Page, pdfjs } from 'react-pdf';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
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
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { getViewableUrl, downloadFile } from '@/lib/fileViewer';
 import { useToast } from '@/hooks/use-toast';
 
 import 'react-pdf/dist/Page/AnnotationLayer.css';
 import 'react-pdf/dist/Page/TextLayer.css';
 
 // Set up PDF.js worker
 pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
 
 interface DrawingPreviewDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   fileUrl: string | null;
   fileName?: string;
   title?: string;
 }
 
 export function DrawingPreviewDialog({
   open,
   onOpenChange,
   fileUrl,
   fileName,
   title,
 }: DrawingPreviewDialogProps) {
   const { toast } = useToast();
   const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   
   // PDF state
   const [numPages, setNumPages] = useState(0);
   const [currentPage, setCurrentPage] = useState(1);
   const [zoom, setZoom] = useState(1);
   const [rotation, setRotation] = useState(0);
   const [pdfError, setPdfError] = useState(false);
   
   const isPdf = fileUrl?.toLowerCase().endsWith('.pdf') || fileName?.toLowerCase().endsWith('.pdf');
   const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl || fileName || '');
   
   // Resolve URL when dialog opens
   useEffect(() => {
     if (open && fileUrl) {
       setIsLoading(true);
       setError(null);
       setPdfError(false);
       setCurrentPage(1);
       setZoom(1);
       setRotation(0);
       
       getViewableUrl(fileUrl).then(({ url, error: urlError }) => {
         if (urlError) {
           console.warn('URL resolution warning:', urlError);
         }
         setResolvedUrl(url);
         setIsLoading(false);
         
         if (!url) {
           setError('Could not load file. Please try downloading instead.');
         }
       });
     } else {
       setResolvedUrl(null);
     }
   }, [open, fileUrl]);
   
   const handleDownload = async () => {
     if (!fileUrl) return;
     
     await downloadFile(fileUrl, fileName, {
       onError: (err) => {
         toast({
           title: 'Download Failed',
           description: err,
           variant: 'destructive',
         });
       },
       onSuccess: () => {
         toast({
           title: 'Download Started',
           description: 'Your file is downloading.',
         });
       },
     });
   };
   
   const handleOpenExternal = () => {
     if (resolvedUrl) {
       window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
     }
   };
   
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
         <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
           <div className="flex items-center justify-between">
             <DialogTitle className="text-base font-medium truncate pr-4">
               {title || fileName || 'File Preview'}
             </DialogTitle>
             
             <div className="flex items-center gap-1">
               {/* Zoom controls */}
               <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z / 1.2, 0.1))}>
                 <ZoomOut className="h-4 w-4" />
               </Button>
               <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
               <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z * 1.2, 5))}>
                 <ZoomIn className="h-4 w-4" />
               </Button>
               
               <div className="w-px h-6 bg-border mx-1" />
               
               <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}>
                 <RotateCw className="h-4 w-4" />
               </Button>
               
               <div className="w-px h-6 bg-border mx-1" />
               
               <Button variant="ghost" size="icon" onClick={handleDownload}>
                 <Download className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" onClick={handleOpenExternal}>
                 <ExternalLink className="h-4 w-4" />
               </Button>
             </div>
           </div>
           
           {/* PDF pagination */}
           {isPdf && numPages > 1 && (
             <div className="flex items-center justify-center gap-2 mt-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                 disabled={currentPage <= 1}
               >
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               <span className="text-sm">
                 Page {currentPage} of {numPages}
               </span>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))}
                 disabled={currentPage >= numPages}
               >
                 <ChevronRight className="h-4 w-4" />
               </Button>
             </div>
           )}
         </DialogHeader>
         
         {/* Preview content */}
         <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
           {isLoading ? (
             <div className="flex flex-col items-center gap-3">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               <p className="text-sm text-muted-foreground">Loading preview...</p>
             </div>
           ) : error || !resolvedUrl ? (
             <div className="flex flex-col items-center gap-4 text-muted-foreground">
               <FileX className="h-16 w-16 opacity-50" />
               <p className="text-sm">{error || 'Unable to preview file'}</p>
               <Button variant="outline" onClick={handleDownload}>
                 <Download className="h-4 w-4 mr-2" />
                 Download File
               </Button>
             </div>
           ) : isPdf && !pdfError ? (
             <div
               style={{
                 transform: `scale(${zoom}) rotate(${rotation}deg)`,
                 transformOrigin: 'center center',
                 transition: 'transform 0.15s ease-out',
               }}
             >
               <Document
                 file={resolvedUrl}
                 onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                 onLoadError={() => setPdfError(true)}
                 loading={<Skeleton className="w-[600px] h-[800px]" />}
               >
                 <Page
                   pageNumber={currentPage}
                   renderTextLayer={false}
                   renderAnnotationLayer={false}
                   className="shadow-lg"
                 />
               </Document>
             </div>
           ) : isImage ? (
             <img
               src={resolvedUrl}
               alt={fileName || 'Preview'}
               className="max-w-full max-h-full object-contain shadow-lg"
               style={{
                 transform: `scale(${zoom}) rotate(${rotation}deg)`,
                 transition: 'transform 0.15s ease-out',
               }}
               draggable={false}
             />
           ) : pdfError ? (
             <div className="flex flex-col items-center gap-4 text-muted-foreground">
               <FileX className="h-16 w-16 opacity-50" />
               <p className="text-sm">Failed to load PDF</p>
               <Button variant="outline" onClick={handleDownload}>
                 <Download className="h-4 w-4 mr-2" />
                 Download File
               </Button>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-4 text-muted-foreground">
               <FileX className="h-16 w-16 opacity-50" />
               <p className="text-sm">Preview not available for this file type</p>
               <Button variant="outline" onClick={handleDownload}>
                 <Download className="h-4 w-4 mr-2" />
                 Download File
               </Button>
             </div>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 }