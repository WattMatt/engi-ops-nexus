import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PDFStyleSettings } from '@/utils/pdfStyleManager';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ThumbnailSidebarProps {
  pdfUrl: string;
  numPages: number;
  currentPage: number;
  settings: PDFStyleSettings;
  onPageSelect: (page: number) => void;
}

export const ThumbnailSidebar: React.FC<ThumbnailSidebarProps> = ({
  pdfUrl,
  numPages,
  currentPage,
  settings,
  onPageSelect,
}) => {
  const getElementCountForPage = (page: number) => {
    if (!settings.elements) return 0;
    return Object.values(settings.elements).filter(el => (el.page || 1) === page).length;
  };

  return (
    <div className="w-48 border-r border-border bg-background/50">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Pages</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {numPages} {numPages === 1 ? 'page' : 'pages'}
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-3">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const elementCount = getElementCountForPage(pageNum);
            const isActive = pageNum === currentPage;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageSelect(pageNum)}
                className={cn(
                  "w-full group relative rounded-lg border-2 transition-all",
                  "hover:border-primary/50 hover:shadow-md",
                  isActive
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border"
                )}
              >
                <div className="aspect-[8.5/11] bg-white rounded-md overflow-hidden">
                  <Document
                    file={pdfUrl}
                    loading={
                      <div className="w-full h-full bg-muted animate-pulse" />
                    }
                  >
                    <Page
                      pageNumber={pageNum}
                      width={160}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
                
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-2 py-1 bg-background/90 backdrop-blur-sm rounded">
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    Page {pageNum}
                  </span>
                  
                  {elementCount > 0 && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {elementCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
