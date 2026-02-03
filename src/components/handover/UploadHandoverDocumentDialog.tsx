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
import { Loader2, Upload, X, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  // Phase 1: New equipment categories
  { value: "switchgear", label: "Switchgear" },
  { value: "earthing_bonding", label: "Earthing & Bonding" },
  { value: "surge_protection", label: "Surge Protection" },
  { value: "metering", label: "Metering" },
  { value: "cable_installation", label: "Cable Installation" },
  { value: "emergency_systems", label: "Emergency Systems" },
  { value: "protection_settings", label: "Protection Settings" },
  { value: "arc_flash_studies", label: "Arc Flash Studies" },
  { value: "energy_management", label: "Energy Management" },
  { value: "other", label: "Other" },
];

export const UploadHandoverDocumentDialog = ({
  open,
  onOpenChange,
  projectId,
}: UploadHandoverDocumentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("No files selected");

      const { data: user } = await supabase.auth.getUser();
      const totalFiles = files.length;
      let uploadedCount = 0;

      for (const file of files) {
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

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`,
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
      setUploadProgress(0);
    },
  });

  const resetForm = () => {
    setFiles([]);
    setDocumentType("");
    setNotes("");
    setUploadProgress(0);
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !documentType) {
      toast({
        title: "Error",
        description: "Please select at least one file and document type",
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
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload one or multiple documents to the handover repository
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
              <Label>Files</Label>
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
                  multiple
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Support for PDFs, images, and documents (multiple files allowed)
                  </p>
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploadMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading {Math.round(uploadProgress)}%...
                </p>
              </div>
            )}

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
            <Button type="submit" disabled={uploadMutation.isPending || files.length === 0 || !documentType}>
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload {files.length > 0 && `(${files.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
