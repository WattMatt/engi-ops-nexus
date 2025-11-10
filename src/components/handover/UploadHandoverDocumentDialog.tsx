import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface UploadHandoverDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const DOCUMENT_TYPES = [
  { value: "electrical_drawings", label: "Electrical Drawings" },
  { value: "specifications", label: "Specifications" },
  { value: "test_certificates", label: "Test Certificates" },
  { value: "warranties", label: "Warranties" },
  { value: "manuals", label: "Manuals & Instructions" },
  { value: "as_built_drawings", label: "As-Built Drawings" },
  { value: "commissioning_docs", label: "Commissioning Documents" },
  { value: "compliance_certs", label: "Compliance Certificates" },
  { value: "other", label: "Other" },
];

export const UploadHandoverDocumentDialog = ({
  open,
  onOpenChange,
  projectId,
}: UploadHandoverDocumentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      // Upload file to storage
      const filePath = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("handover-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("handover-documents")
        .getPublicUrl(filePath);

      // Insert document record
      const { data: user } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("handover_documents" as any)
        .insert({
          project_id: projectId,
          document_name: file.name,
          document_type: documentType,
          file_url: publicUrl,
          source_type: "upload",
          file_size: file.size,
          added_by: user.user?.id,
          notes: notes || null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document uploaded successfully",
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
    setFile(null);
    setDocumentType("");
    setNotes("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !documentType) {
      toast({
        title: "Error",
        description: "Please select a file and document type",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document to the handover repository
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Drop file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        Support for PDFs, images, and documents
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending || !file || !documentType}>
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
