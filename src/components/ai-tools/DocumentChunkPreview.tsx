import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, FileText, Hash, Loader2 } from "lucide-react";

interface DocumentChunkPreviewProps {
  documentId: string;
  documentTitle: string;
  chunkCount: number;
}

interface Chunk {
  id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: Record<string, unknown> | null;
}

export function DocumentChunkPreview({
  documentId,
  documentTitle,
  chunkCount,
}: DocumentChunkPreviewProps) {
  const [open, setOpen] = useState(false);

  const { data: chunks, isLoading } = useQuery({
    queryKey: ["document-chunks", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_chunks")
        .select("id, chunk_index, content, token_count, metadata")
        .eq("document_id", documentId)
        .order("chunk_index");

      if (error) throw error;
      return data as Chunk[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Eye className="h-3 w-3" />
          <span className="text-xs">{chunkCount} chunks</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {documentTitle}
          </DialogTitle>
          <DialogDescription>
            Viewing {chunkCount} chunks created from this document
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chunks && chunks.length > 0 ? (
            <div className="space-y-4">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-4 rounded-lg border bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        <Hash className="h-3 w-3 mr-1" />
                        {chunk.chunk_index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ~{chunk.token_count} tokens
                      </span>
                    </div>
                    {chunk.metadata && (
                      <Badge variant="secondary" className="text-xs">
                        {(chunk.metadata as { extraction_method?: string }).extraction_method || "text"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p>No chunks found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
