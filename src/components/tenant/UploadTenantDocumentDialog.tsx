import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

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
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivityLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
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
      toast.error("File type not allowed. Please upload PDF, PNG, JPG, XLSX, or DOCX files.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Remove any existing exclusion for this document type
      await supabase
        .from('tenant_document_exclusions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('document_type', documentType);

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
          notes: notes || null,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      // Log activity
      await logActivity(
        'tenant_document_upload',
        `Uploaded ${DOCUMENT_TYPE_LABELS[documentType]} for ${shopNumber}`,
        {
          tenant_id: tenantId,
          document_type: documentType,
          file_name: file.name,
        },
        projectId
      );

      toast.success("Document uploaded successfully");
      onSuccess?.();
      onOpenChange(false);
      setFile(null);
      setNotes("");
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {DOCUMENT_TYPE_LABELS[documentType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Shop</Label>
            <Input value={shopNumber} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Allowed: PDF, PNG, JPG, XLSX, DOCX (Max 10MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this document..."
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
