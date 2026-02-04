import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface LinkToHandoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: any[];
  tenantId: string;
  projectId: string;
  shopNumber: string;
  shopName: string;
}

export const LinkToHandoverDialog = ({
  open,
  onOpenChange,
  documents,
  tenantId,
  projectId,
  shopNumber,
  shopName,
}: LinkToHandoverDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Auto-select all documents when dialog opens
  useEffect(() => {
    if (open && documents.length > 0) {
      setSelectedDocs(documents.map(d => d.id));
    }
  }, [open, documents]);

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (selectedDocs.length === 0) throw new Error("No documents selected");

      const { data: user } = await supabase.auth.getUser();
      const results = [];

      for (const docId of selectedDocs) {
        const doc = documents.find(d => d.id === docId);
        if (!doc) continue;

        // Download the original file
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        
        // Create new filename with shop number prefix
        const extension = doc.document_name.split('.').pop();
        const sanitizedShopName = shopName.replace(/[^a-z0-9]/gi, '_');
        const newFileName = `${shopNumber}_${sanitizedShopName}_${doc.document_name}`;
        
        // Upload to handover documents in tenant-specific folder
        const handoverPath = `${projectId}/line-diagrams/${shopNumber}/${Date.now()}-${newFileName}`;
        const { error: uploadError } = await supabase.storage
          .from("handover-documents")
          .upload(handoverPath, blob);

        if (uploadError) throw uploadError;

        // For private buckets, store the authenticated URL pattern
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const fileUrl = `${supabaseUrl}/storage/v1/object/authenticated/handover-documents/${handoverPath}`;

        // Insert into handover documents
        const { error: insertError } = await supabase
          .from("handover_documents" as any)
          .insert({
            project_id: projectId,
            document_name: newFileName,
            document_type: "equipment_document", // or map to appropriate type
            file_url: fileUrl,
            source_type: "tenant_link",
            file_size: blob.size,
            added_by: user.user?.id,
            metadata: {
              tenant_id: tenantId,
              shop_number: shopNumber,
              shop_name: shopName,
              original_document_id: docId,
              original_document_type: doc.document_type,
            }
          });

        if (insertError) throw insertError;

        results.push({ name: newFileName, success: true });
      }

      return results;
    },
    onSuccess: (results) => {
      toast({
        title: "Success",
        description: `${results.length} document(s) linked to handover folders`,
      });
      queryClient.invalidateQueries({ queryKey: ["handover-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["equipment-documents", projectId] });
      onOpenChange(false);
      setSelectedDocs([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleDoc = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bulk Link to Handover Folders
          </DialogTitle>
          <DialogDescription>
            All documents will be copied and renamed in: Handover &gt; Line Diagrams &gt; {shopNumber} {shopName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents available to link
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedDocs.length === documents.length}
                  onCheckedChange={toggleAll}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Select All ({documents.length})
                </Label>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={doc.id}
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <Label
                      htmlFor={doc.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type}
                        </p>
                      </div>
                    </Label>
                    {selectedDocs.includes(doc.id) && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>

              {selectedDocs.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    Files will be renamed to:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shopNumber}_{shopName.replace(/[^a-z0-9]/gi, '_')}_[original_name]
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Location: Handover &gt; Equipment Documents &gt; Line Diagrams &gt; {shopNumber}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linkMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => linkMutation.mutate()}
            disabled={linkMutation.isPending || selectedDocs.length === 0}
          >
            {linkMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Link {selectedDocs.length > 0 && `(${selectedDocs.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
