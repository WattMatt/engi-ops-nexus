import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TenantDocumentUploadProps {
  tenantId: string;
  projectId: string;
  shopNumber: string;
  shopName: string;
}

const TENANT_DOCUMENT_TYPES = [
  { value: "electrical_coc", label: "Electrical COC" },
  { value: "as_built_drawing", label: "As Built Drawing" },
  { value: "line_diagram", label: "Line Diagram" },
  { value: "qc_inspection_report", label: "QC Inspection Report" },
  { value: "lighting_guarantee", label: "Lighting Guarantee" },
  { value: "db_guarantee", label: "DB Guarantee" },
];

export const TenantDocumentUpload = ({
  tenantId,
  projectId,
  shopNumber,
  shopName,
}: TenantDocumentUploadProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Fetch existing documents for this tenant
  const { data: documents } = useQuery({
    queryKey: ["tenant-handover-docs", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("source_id", tenantId)
        .eq("source_type", "tenant");

      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      documentType,
    }: {
      file: File;
      documentType: string;
    }) => {
      // Upload file to storage
      const filePath = `${projectId}/tenants/${tenantId}/${documentType}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("handover-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("handover-documents").getPublicUrl(filePath);

      // Check if document already exists
      const existingDoc = documents?.find(
        (d: any) => d.document_type === documentType
      );

      if (existingDoc) {
        // Update existing document
        const { error: updateError } = await supabase
          .from("handover_documents" as any)
          .update({
            file_url: publicUrl,
            document_name: file.name,
            file_size: file.size,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existingDoc as any).id);

        if (updateError) throw updateError;
      } else {
        // Insert new document record
        const { data: user } = await supabase.auth.getUser();
        const { error: insertError } = await supabase
          .from("handover_documents" as any)
          .insert({
            project_id: projectId,
            document_name: file.name,
            document_type: documentType,
            file_url: publicUrl,
            source_type: "tenant",
            source_id: tenantId,
            file_size: file.size,
            added_by: user.user?.id,
            notes: `${shopNumber} - ${shopName}`,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-docs", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-documents", projectId],
      });
      setUploadingType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploadingType(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc: any = documents?.find((d: any) => d.id === docId);

      // Delete from storage if it's an uploaded file
      if (doc?.file_url) {
        const path = doc.file_url.split("/handover-documents/")[1];
        if (path) {
          await supabase.storage.from("handover-documents").remove([path]);
        }
      }

      // Delete database record
      const { error } = await supabase
        .from("handover_documents" as any)
        .delete()
        .eq("id", docId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-docs", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-documents", projectId],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingType(documentType);
    uploadMutation.mutate({ file, documentType });
  };

  const handleDownload = (doc: any) => {
    if (!doc.file_url) return;

    const link = document.createElement("a");
    link.href = doc.file_url;
    link.download = doc.document_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocumentForType = (type: string) => {
    return documents?.find((d: any) => d.document_type === type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tenant Documents</CardTitle>
        <CardDescription>
          Upload handover documents for {shopNumber} - {shopName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {TENANT_DOCUMENT_TYPES.map((docType) => {
            const existingDoc = getDocumentForType(docType.value);
            const isUploading = uploadingType === docType.value;

            return (
              <div
                key={docType.value}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {docType.label}
                  </Label>
                  {existingDoc && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Uploaded
                    </Badge>
                  )}
                </div>

                {existingDoc ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">
                      {(existingDoc as any).document_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(existingDoc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate((existingDoc as any).id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id={`file-${docType.value}-${tenantId}`}
                      className="hidden"
                      onChange={(e) => handleFileChange(e, docType.value)}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                      disabled={isUploading}
                    >
                      <label
                        htmlFor={`file-${docType.value}-${tenantId}`}
                        className="cursor-pointer"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </label>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
