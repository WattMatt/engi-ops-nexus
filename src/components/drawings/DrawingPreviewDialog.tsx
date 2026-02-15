import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UniversalDocumentPreview } from "@/components/viewers/UniversalDocumentPreview";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0 bg-background">
          <DialogTitle className="text-base font-medium truncate pr-4">
            {title || fileName || 'File Preview'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 w-full h-full min-h-0 bg-slate-100">
           {open && fileUrl && (
             <UniversalDocumentPreview
               url={fileUrl}
               fileName={fileName}
               className="w-full h-full border-0 rounded-none"
               showControls={true}
             />
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
