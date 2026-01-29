/**
 * Drawing Review Dialog
 * Full-screen dialog with split-view for drawing preview and checklist
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { DrawingPreviewPane } from './DrawingPreviewPane';
import { DrawingChecklistPane } from './DrawingChecklistPane';
import { ProjectDrawing, DRAWING_STATUS_OPTIONS } from '@/types/drawings';

interface DrawingReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawing: ProjectDrawing | null;
}

export function DrawingReviewDialog({ open, onOpenChange, drawing }: DrawingReviewDialogProps) {
  if (!drawing) return null;
  
  const statusOption = DRAWING_STATUS_OPTIONS.find(o => o.value === drawing.status);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="font-mono text-lg">
                {drawing.drawing_number}
              </DialogTitle>
              <Badge variant="outline" className={statusOption?.color}>
                {statusOption?.label}
              </Badge>
              <Badge variant="secondary">
                Rev {drawing.current_revision}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {drawing.drawing_title}
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            {/* Drawing Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <DrawingPreviewPane
                fileUrl={drawing.file_url}
                fileName={drawing.file_name}
                fileType={drawing.file_type}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Checklist Panel */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <DrawingChecklistPane drawing={drawing} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}
