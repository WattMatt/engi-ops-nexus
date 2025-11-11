import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface QuickUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  projectId: string;
  shopNumber: string;
  shopName: string;
}

const DOCUMENT_TYPES = [
  { value: "lighting_quote_received", label: "Lighting Quotation (Received)" },
  { value: "lighting_quote_instruction", label: "Lighting Quotation Instruction" },
  { value: "db_order_quote_received", label: "DB Order Quote (Received)" },
  { value: "db_order_instruction", label: "DB Order Instruction" },
  { value: "db_shop_drawing_received", label: "DB Shop Drawing (Received)" },
  { value: "db_shop_drawing_approved", label: "DB Shop Drawing (Approved)" },
];

interface FileWithType {
  file: File;
  documentType: string;
}

export const QuickUploadDialog = ({
  open,
  onOpenChange,
  tenantId,
  projectId,
  shopNumber,
  shopName,
}: QuickUploadDialogProps) => {
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({
      file,
      documentType: DOCUMENT_TYPES[0].value,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = selectedFiles.map(file => ({
        file,
        documentType: DOCUMENT_TYPES[0].value,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, documentType: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, documentType } : f));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const { file, documentType } of files) {
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        const fileName = `${shopNumber}_${documentType}_${timestamp}.${fileExt}`;
        const filePath = `${projectId}/${tenantId}/${fileName}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from("tenant-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("tenant-documents")
          .getPublicUrl(filePath);

        // Delete existing exclusion if any
        await supabase
          .from("tenant_document_exclusions")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("document_type", documentType);

        // Insert document record
        const { error: insertError } = await supabase
          .from("tenant_documents")
          .insert({
            tenant_id: tenantId,
            project_id: projectId,
            document_type: documentType,
            document_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            notes: null,
            uploaded_by: user.id,
          });

        if (insertError) throw insertError;

        // Log activity
        await logActivity(
          'tenant_document_upload',
          `Uploaded ${file.name} for ${shopName} (${shopNumber})`,
          {
            tenant_id: tenantId,
            document_type: documentType,
            file_name: file.name,
          },
          projectId
        );
      }

      toast.success(`Successfully uploaded ${files.length} document(s)`);
      queryClient.invalidateQueries({ queryKey: ["tenant-documents"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
      setFiles([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Upload - {shopName} ({shopNumber})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="quick-file-input"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <label htmlFor="quick-file-input" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Upload multiple documents at once
              </p>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Files to Upload ({files.length})</h3>
              {files.map((fileWithType, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileWithType.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(fileWithType.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Select
                    value={fileWithType.documentType}
                    onValueChange={(value) => updateFileType(index, value)}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                onOpenChange(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
