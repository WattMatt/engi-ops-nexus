import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LinkHandoverDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const SOURCE_TYPES = [
  { value: "tenant_documents", label: "Tenant Documents", table: "tenant_documents" },
  { value: "cost_report_pdfs", label: "Cost Reports", table: "cost_reports" },
  { value: "specifications", label: "Specifications", table: "specifications" },
  { value: "cable_schedules", label: "Cable Schedules", table: "cable_schedules" },
];

export const LinkHandoverDocumentDialog = ({
  open,
  onOpenChange,
  projectId,
}: LinkHandoverDocumentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Fetch available documents based on source type
  const { data: availableDocs, isLoading } = useQuery({
    queryKey: ["available-docs", projectId, sourceType],
    queryFn: async () => {
      if (!sourceType) return [];

      const sourceConfig = SOURCE_TYPES.find((s) => s.value === sourceType);
      if (!sourceConfig) return [];

      if (sourceType === "tenant_documents") {
        const { data, error } = await supabase
          .from("tenant_documents")
          .select("id, document_name, document_type, file_url")
          .eq("project_id", projectId);

        if (error) throw error;
        return data || [];
      } else if (sourceType === "cost_report_pdfs") {
        const { data, error } = await supabase
          .from("cost_reports")
          .select("id, report_name, pdf_url")
          .eq("project_id", projectId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
          id: d.id,
          document_name: d.report_name,
          file_url: d.pdf_url,
        }));
      } else if (sourceType === "specifications") {
        const { data, error } = await supabase
          .from("specifications" as any)
          .select("id, title")
          .eq("project_id", projectId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
          id: d.id,
          document_name: d.title,
          file_url: null,
        }));
      } else if (sourceType === "cable_schedules") {
        const { data, error } = await supabase
          .from("cable_schedules" as any)
          .select("id, schedule_name")
          .eq("project_id", projectId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
          id: d.id,
          document_name: d.schedule_name,
          file_url: null,
        }));
      }

      return [];
    },
    enabled: !!sourceType && open,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const documentsToLink = Array.from(selectedDocs).map((docId) => {
        const doc = availableDocs?.find((d: any) => d.id === docId);
        return {
          project_id: projectId,
          document_name: doc?.document_name || "Linked Document",
          document_type: sourceType,
          file_url: doc?.file_url || null,
          source_type: sourceType,
          source_id: docId,
          added_by: user.user?.id,
        };
      });

      const { error } = await supabase
        .from("handover_documents" as any)
        .insert(documentsToLink);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedDocs.size} document(s) linked successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["handover-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["handover-documents-count", projectId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSourceType("");
    setSelectedDocs(new Set());
  };

  const toggleDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleSubmit = () => {
    if (selectedDocs.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one document",
        variant: "destructive",
      });
      return;
    }
    linkMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Link Documents from Project</DialogTitle>
          <DialogDescription>
            Select documents from other areas of your project to include in the handover
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceType && (
            <div className="space-y-2">
              <Label>Available Documents</Label>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableDocs && availableDocs.length > 0 ? (
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-3">
                    {availableDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          id={doc.id}
                          checked={selectedDocs.has(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                        <label
                          htmlFor={doc.id}
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{doc.document_name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents available from this source
                </div>
              )}
              {selectedDocs.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDocs.size} document(s) selected
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={linkMutation.isPending || selectedDocs.size === 0}
          >
            {linkMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Link {selectedDocs.size > 0 && `(${selectedDocs.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
