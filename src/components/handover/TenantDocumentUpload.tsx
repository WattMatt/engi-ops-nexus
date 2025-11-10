import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import JSZip from "jszip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  X,
  Package,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentPreviewDialog } from "@/components/tenant/DocumentPreviewDialog";
import { useActivityLogger } from "@/hooks/useActivityLogger";

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
  const { logActivity } = useActivityLogger();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showProgressPulse, setShowProgressPulse] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [byTenantDialogOpen, setByTenantDialogOpen] = useState(false);
  const [byTenantDocType, setByTenantDocType] = useState<string>("");
  const [byTenantNotes, setByTenantNotes] = useState("");
  const prevCompletedCountRef = useRef<number>(0);
  const hasTriggeredConfettiRef = useRef<boolean>(false);

  // Fetch existing documents for this tenant
  const { data: documents, refetch } = useQuery({
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

  // Fetch exclusions (by tenant markings)
  const { data: exclusions = [] } = useQuery({
    queryKey: ["tenant-handover-exclusions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_document_exclusions" as any)
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate completion
  const completedCount = TENANT_DOCUMENT_TYPES.filter((type) => {
    const hasDocument = documents?.some((d: any) => d.document_type === type.value);
    const hasExclusion = exclusions?.some((e: any) => e.document_type === type.value);
    return hasDocument || hasExclusion;
  }).length;

  const completionPercentage = Math.round(
    (completedCount / TENANT_DOCUMENT_TYPES.length) * 100
  );

  // Confetti celebration on 100% completion
  useEffect(() => {
    if (completionPercentage === 100 && !hasTriggeredConfettiRef.current) {
      hasTriggeredConfettiRef.current = true;
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      sonnerToast.success("🎉 All handover documents complete!", {
        description: `${shopNumber} - ${shopName}`,
      });
    } else if (completionPercentage < 100) {
      hasTriggeredConfettiRef.current = false;
    }
  }, [completionPercentage, shopNumber, shopName]);

  // Progress pulse animation
  useEffect(() => {
    if (completedCount > prevCompletedCountRef.current) {
      setShowProgressPulse(true);
      const timer = setTimeout(() => setShowProgressPulse(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount]);

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

      return { documentType };
    },
    onSuccess: ({ documentType }) => {
      sonnerToast.success("Document uploaded successfully");
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-docs", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-documents", projectId],
      });
      
      logActivity(
        "handover_document_upload",
        `Uploaded ${documentType} for ${shopNumber}`,
        { tenant_id: tenantId, document_type: documentType },
        projectId
      );
      
      setUploadingType(null);
    },
    onError: (error: Error) => {
      sonnerToast.error(error.message || "Failed to upload document");
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
      
      return doc;
    },
    onSuccess: (doc) => {
      sonnerToast.success("Document deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-docs", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-documents", projectId],
      });
      
      logActivity(
        "handover_document_delete",
        `Deleted ${doc?.document_type} for ${shopNumber}`,
        { tenant_id: tenantId },
        projectId
      );
    },
    onError: (error: Error) => {
      sonnerToast.error(error.message || "Failed to delete document");
    },
  });

  const markByTenantMutation = useMutation({
    mutationFn: async ({
      documentType,
      notes,
    }: {
      documentType: string;
      notes?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("handover_document_exclusions" as any)
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          document_type: documentType,
          exclusion_reason: "by_tenant",
          notes: notes || null,
          marked_by: user.id,
        });

      if (error) throw error;
      return { documentType };
    },
    onSuccess: ({ documentType }) => {
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-exclusions", tenantId],
      });
      sonnerToast.success("Marked as handled by tenant");
      
      logActivity(
        "handover_document_by_tenant",
        `Marked ${documentType} as "By Tenant" for ${shopNumber}`,
        { tenant_id: tenantId, document_type: documentType },
        projectId
      );
      
      setByTenantDialogOpen(false);
      setByTenantNotes("");
    },
    onError: (error: any) => {
      sonnerToast.error(error.message || "Failed to mark as by tenant");
    },
  });

  const unmarkByTenantMutation = useMutation({
    mutationFn: async (documentType: string) => {
      const { error } = await supabase
        .from("handover_document_exclusions" as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("document_type", documentType);

      if (error) throw error;
      return documentType;
    },
    onSuccess: (documentType) => {
      queryClient.invalidateQueries({
        queryKey: ["tenant-handover-exclusions", tenantId],
      });
      sonnerToast.success("Unmarked from by tenant");
      
      logActivity(
        "handover_document_unmark",
        `Unmarked ${documentType} from "By Tenant" for ${shopNumber}`,
        { tenant_id: tenantId, document_type: documentType },
        projectId
      );
    },
    onError: (error: any) => {
      sonnerToast.error(error.message || "Failed to unmark");
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
      sonnerToast.error("File size must be less than 50MB");
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

  const handleDownloadAll = async () => {
    const docsWithFiles = documents?.filter((d: any) => d.file_url) || [];
    
    if (docsWithFiles.length === 0) {
      sonnerToast.error("No documents to download");
      return;
    }

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();

      sonnerToast.info("Preparing download...");

      const downloadPromises = docsWithFiles.map(async (doc: any) => {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) throw new Error(`Failed to fetch ${doc.document_name}`);
          const blob = await response.blob();
          zip.file(doc.document_name, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.document_name}:`, error);
        }
      });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${shopNumber}_handover_documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      sonnerToast.success("Documents downloaded successfully");
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to download documents");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const getDocumentForType = (type: string) => {
    return documents?.find((d: any) => d.document_type === type);
  };

  const getExclusionForType = (type: string) => {
    return exclusions?.find((e: any) => e.document_type === type);
  };

  const openByTenantDialog = (docType: string) => {
    setByTenantDocType(docType);
    setByTenantDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Handover Documents</CardTitle>
              <CardDescription>
                {shopNumber} - {shopName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {documents && documents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll}
                >
                  {isDownloadingAll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Download All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Overview */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Completion Progress</span>
              <span className="text-muted-foreground">
                {completedCount} of {TENANT_DOCUMENT_TYPES.length} documents
              </span>
            </div>
            <Progress
              value={completionPercentage}
              className={`h-2 transition-all ${
                showProgressPulse ? "scale-105" : ""
              }`}
            />
            <div className="text-xs text-muted-foreground text-right">
              {completionPercentage}% Complete
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {TENANT_DOCUMENT_TYPES.map((docType) => {
              const existingDoc = getDocumentForType(docType.value);
              const exclusion = getExclusionForType(docType.value);
              const isUploading = uploadingType === docType.value;

              let status: "uploaded" | "by_tenant" | "missing" = "missing";
              if (existingDoc) status = "uploaded";
              else if (exclusion) status = "by_tenant";

              return (
                <div
                  key={docType.value}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {docType.label}
                    </Label>
                    {status === "uploaded" && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Uploaded
                      </Badge>
                    )}
                    {status === "by_tenant" && (
                      <Badge variant="secondary" className="gap-1">
                        <UserCheck className="h-3 w-3" />
                        By Tenant
                      </Badge>
                    )}
                    {status === "missing" && (
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>

                  {existingDoc ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">
                          {(existingDoc as any).document_name}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setPreviewDocument(existingDoc)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(existingDoc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteMutation.mutate((existingDoc as any).id)
                          }
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : exclusion ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Handled by tenant
                      </p>
                      {(exclusion as any).notes && (
                        <p className="text-xs text-muted-foreground italic">
                          Note: {(exclusion as any).notes}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          unmarkByTenantMutation.mutate(docType.value)
                        }
                      >
                        <X className="h-4 w-4 mr-2" />
                        Unmark
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => openByTenantDialog(docType.value)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        By Tenant
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By Tenant Dialog */}
      <AlertDialog open={byTenantDialogOpen} onOpenChange={setByTenantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as "By Tenant"</AlertDialogTitle>
            <AlertDialogDescription>
              This indicates that the tenant will handle this document themselves. You
              can add optional notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              value={byTenantNotes}
              onChange={(e) => setByTenantNotes(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                markByTenantMutation.mutate({
                  documentType: byTenantDocType,
                  notes: byTenantNotes,
                })
              }
            >
              Mark as By Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview */}
      <DocumentPreviewDialog
        document={previewDocument}
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
      />
    </>
  );
};
