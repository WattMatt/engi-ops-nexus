import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, FileUp, X, FileText } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Progress } from "@/components/ui/progress";

const DOCUMENT_TYPE_LABELS = {
  lighting_quote_received: "Lighting Quotation (Received)",
  lighting_quote_instruction: "Lighting Quotation Instruction",
  db_order_quote_received: "DB Order Quote (Received)",
  db_order_instruction: "DB Order Instruction",
  db_shop_drawing_received: "DB Shop Drawing (Received)",
  db_shop_drawing_approved: "DB Shop Drawing (Approved)",
};

interface UploadTenantDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  projectId: string;
  shopNumber: string;
  documentType: keyof typeof DOCUMENT_TYPE_LABELS;
  onSuccess?: () => void;
}

export const UploadTenantDocumentDialog = ({
  open,
  onOpenChange,
  tenantId,
  projectId,
  shopNumber,
  documentType,
  onSuccess,
}: UploadTenantDocumentDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { logActivity } = useActivityLogger();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    // Validate all files
    for (const file of files) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 10MB limit`);
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not an allowed type. Please upload PDF, PNG, JPG, XLSX, or DOCX files.`);
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalFiles = files.length;
      let uploadedCount = 0;

      // Remove any existing exclusion for this document type (only once)
      await supabase
        .from('tenant_document_exclusions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('document_type', documentType);

      for (const file of files) {
        // Generate file name: [shop_number]_[document_type]_[timestamp].[ext]
        const timestamp = new Date().getTime();
        const fileExt = file.name.split('.').pop();
        const fileName = `${shopNumber}_${documentType}_${timestamp}.${fileExt}`;
        const filePath = `${projectId}/${tenantId}/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('tenant-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('tenant-documents')
          .getPublicUrl(filePath);

        // Insert record into database
        const { error: dbError } = await supabase
          .from('tenant_documents')
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

        if (dbError) throw dbError;

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      // Log activity
      await logActivity(
        'tenant_document_upload',
        `Uploaded ${files.length} ${DOCUMENT_TYPE_LABELS[documentType]} document(s) for ${shopNumber}`,
        {
          tenant_id: tenantId,
          document_type: documentType,
          file_count: files.length,
        },
        projectId
      );

      toast.success(`${files.length} document(s) uploaded successfully`);
      onSuccess?.();
      onOpenChange(false);
      setFiles([]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Error uploading documents:", error);
      toast.error(error.message || "Failed to upload documents");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload {DOCUMENT_TYPE_LABELS[documentType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
              multiple
              onChange={handleFileSelect}
              disabled={loading}
              className="hidden"
            />
            <Label htmlFor="file" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FileUp className={`h-12 w-12 ${files.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium">Click to browse or drag and drop</p>
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, XLSX, DOCX (Max 10MB per file, multiple files allowed)
                </p>
              </div>
            </Label>
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
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading {Math.round(uploadProgress)}%...
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || files.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
