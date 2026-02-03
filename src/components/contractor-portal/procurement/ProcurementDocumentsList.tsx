import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, File, Image, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ProcurementDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface ProcurementDocumentsListProps {
  procurementItemId: string;
}

const documentTypeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  quote: { label: 'Quote', icon: <FileText className="h-4 w-4" /> },
  po: { label: 'Purchase Order', icon: <FileSpreadsheet className="h-4 w-4" /> },
  delivery_note: { label: 'Delivery Note', icon: <File className="h-4 w-4" /> },
  invoice: { label: 'Invoice', icon: <FileText className="h-4 w-4" /> },
  specification: { label: 'Specification', icon: <FileText className="h-4 w-4" /> },
  photo: { label: 'Photo', icon: <Image className="h-4 w-4" /> },
  other: { label: 'Other', icon: <File className="h-4 w-4" /> },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProcurementDocumentsList({ procurementItemId }: ProcurementDocumentsListProps) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['procurement-documents', procurementItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_documents')
        .select('*')
        .eq('procurement_item_id', procurementItemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProcurementDocument[];
    },
    enabled: !!procurementItemId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No documents attached</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const typeConfig = documentTypeConfig[doc.document_type] || documentTypeConfig.other;
        const downloadUrl = doc.file_url || doc.file_path;
        
        return (
          <div 
            key={doc.id} 
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded bg-muted">
              {typeConfig.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <Badge variant="outline" className="shrink-0">
                  {typeConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(doc.created_at), 'PP')}</span>
                {doc.file_size && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                  </>
                )}
                {doc.uploaded_by_name && (
                  <>
                    <span>•</span>
                    <span>by {doc.uploaded_by_name}</span>
                  </>
                )}
              </div>
            </div>
            
            {downloadUrl && (
              <Button variant="ghost" size="icon" asChild>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
