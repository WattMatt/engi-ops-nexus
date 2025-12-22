import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Download, Trash2, Eye, Loader2, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PrimeCostDocumentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
}

interface PrimeCostDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  document_type: string | null;
  description: string | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: "order", label: "Order" },
  { value: "quote", label: "Quote" },
  { value: "invoice", label: "Invoice" },
  { value: "delivery_note", label: "Delivery Note" },
  { value: "specification", label: "Specification" },
  { value: "other", label: "Other" },
];

const isPreviewableType = (fileType: string | null): boolean => {
  if (!fileType) return false;
  return fileType.startsWith("image/") || fileType === "application/pdf";
};

export function PrimeCostDocuments({ open, onOpenChange, itemId, itemDescription }: PrimeCostDocumentsProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("order");
  const [description, setDescription] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string | null } | null>(null);

  // Fetch documents for this item
  const { data: documents, isLoading } = useQuery({
    queryKey: ["prime-cost-documents", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_cost_documents")
        .select("*")
        .eq("prime_cost_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PrimeCostDocument[];
    },
    enabled: open,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${itemId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("prime-cost-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("prime_cost_documents")
        .insert({
          prime_cost_item_id: itemId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          document_type: documentType,
          description: description || null,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["prime-cost-documents", itemId] });
      toast.success("Document uploaded successfully");
      setDescription("");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDownload = async (doc: PrimeCostDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("prime-cost-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handlePreview = (doc: PrimeCostDocument) => {
    const { data } = supabase.storage
      .from("prime-cost-documents")
      .getPublicUrl(doc.file_path);

    if (data?.publicUrl) {
      setPreviewDoc({
        url: data.publicUrl,
        name: doc.file_name,
        type: doc.file_type,
      });
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: PrimeCostDocument) => {
      const { error: storageError } = await supabase.storage
        .from("prime-cost-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("prime_cost_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prime-cost-documents", itemId] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string | null) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type || "Unknown";
  };

  // If previewing a document, show the preview view
  if (previewDoc) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={closePreview}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">{previewDoc.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-muted/10 min-h-[70vh]">
              {previewDoc.type?.startsWith("image/") ? (
                <div className="flex items-center justify-center p-4 h-full">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.type === "application/pdf" ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[70vh]"
                  title={previewDoc.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-4">This file type cannot be previewed in the browser.</p>
                  <Button onClick={() => window.open(previewDoc.url, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents for: {itemDescription}
          </DialogTitle>
        </DialogHeader>

        {/* Upload Section */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <h4 className="font-medium text-sm">Upload New Document</h4>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[150px]">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
              />
            </div>
            <div>
              <Label htmlFor="file-upload" className="sr-only">Upload File</Label>
              <div className="relative">
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button
                  variant="default"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading documents...</div>
          ) : !documents || documents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No documents uploaded yet. Upload orders, quotes, or invoices above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{doc.file_name}</span>
                        {doc.description && (
                          <span className="text-xs text-muted-foreground">{doc.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(doc)}
                          title="Preview"
                          disabled={!isPreviewableType(doc.file_type)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
