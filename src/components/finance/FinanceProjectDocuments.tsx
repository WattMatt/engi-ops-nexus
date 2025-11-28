import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoiceProject {
  id: string;
  project_name: string;
  client_name: string;
}

interface FinanceDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  document_type: string;
  description: string | null;
  created_at: string;
}

interface FinanceProjectDocumentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: InvoiceProject;
}

const DOCUMENT_TYPES = [
  { value: "loa", label: "Letter of Appointment" },
  { value: "contract", label: "Contract" },
  { value: "quote", label: "Quote/Proposal" },
  { value: "invoice", label: "Invoice" },
  { value: "payment_certificate", label: "Payment Certificate" },
  { value: "fee_schedule", label: "Fee Schedule" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

export function FinanceProjectDocuments({ open, onOpenChange, project }: FinanceProjectDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("other");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["finance-documents", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_documents")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinanceDocument[];
    },
    enabled: open,
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const filePath = `${project.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("finance-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from("finance_documents")
        .insert({
          project_id: project.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          document_type: documentType,
          description: description || null,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["finance-documents", project.id] });
      setDescription("");
      setDocumentType("other");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDownload = async (doc: FinanceDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("finance-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (doc: FinanceDocument) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from storage
      await supabase.storage.from("finance-documents").remove([doc.file_path]);

      // Delete record
      const { error } = await supabase
        .from("finance_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["finance-documents", project.id] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documents - {project.project_name}</DialogTitle>
          <DialogDescription>
            Upload and manage documents for {project.client_name}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Section */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <h4 className="font-medium">Upload Document</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" disabled={uploading} asChild>
              <label className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Select File"}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </Button>
            <span className="text-sm text-muted-foreground">
              PDF, Word, Excel, or image files up to 20MB
            </span>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Documents</h4>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{doc.file_name}</span>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getDocumentTypeLabel(doc.document_type)}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
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
