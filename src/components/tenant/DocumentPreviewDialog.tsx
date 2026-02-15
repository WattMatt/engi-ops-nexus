import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UniversalDocumentPreview } from "@/components/viewers/UniversalDocumentPreview";

interface DocumentPreviewDialogProps {
  document: {
    id: string;
    document_name: string;
    file_url: string;
    document_type: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocumentPreviewDialog = ({ 
  document, 
  open, 
  onOpenChange 
}: DocumentPreviewDialogProps) => {
  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0 bg-background">
          <DialogTitle className="text-base font-medium truncate pr-4">
            {document.document_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 w-full h-full min-h-0 bg-slate-100">
           {open && (
             <UniversalDocumentPreview
               url={document.file_url}
               fileName={document.document_name}
               className="w-full h-full border-0 rounded-none"
               showControls={true}
               autoDownload={false}
             />
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
