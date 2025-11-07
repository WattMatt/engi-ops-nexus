import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadTenantDocumentDialog } from "./UploadTenantDocumentDialog";
import { toast } from "sonner";
import { Download, Trash2, Upload, FileText, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const DOCUMENT_TYPES = [
  { key: "lighting_quote_received", label: "Lighting Quotation (Received)" },
  { key: "lighting_quote_instruction", label: "Lighting Quotation Instruction" },
  { key: "db_order_quote_received", label: "DB Order Quote (Received)" },
  { key: "db_order_instruction", label: "DB Order Instruction" },
  { key: "db_shop_drawing_received", label: "DB Shop Drawing (Received)" },
  { key: "db_shop_drawing_approved", label: "DB Shop Drawing (Approved)" },
] as const;

interface TenantDocumentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  projectId: string;
  shopNumber: string;
  shopName: string;
}

export const TenantDocumentManager = ({
  open,
  onOpenChange,
  tenantId,
  projectId,
  shopNumber,
  shopName,
}: TenantDocumentManagerProps) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<typeof DOCUMENT_TYPES[number]["key"] | null>(null);
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["tenant-documents", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_documents")
        .select(`
          *,
          profiles:uploaded_by (full_name)
        `)
        .eq("tenant_id", tenantId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: exclusions = [] } = useQuery({
    queryKey: ["tenant-document-exclusions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_document_exclusions")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const markByTenantMutation = useMutation({
    mutationFn: async ({ documentType, notes }: { documentType: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('tenant_document_exclusions')
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          document_type: documentType,
          exclusion_reason: 'by_tenant',
          notes: notes || null,
          marked_by: user.id,
        });

      if (error) throw error;
      return { documentType };
    },
    onSuccess: ({ documentType }) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-document-exclusions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
      toast.success("Marked as handled by tenant");
      
      logActivity(
        'tenant_document_exclusion',
        `Marked ${documentType} as "By Tenant" for ${shopNumber}`,
        { tenant_id: tenantId, document_type: documentType },
        projectId
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to mark as by tenant");
    },
  });

  const unmarkByTenantMutation = useMutation({
    mutationFn: async (documentType: string) => {
      const { error } = await supabase
        .from('tenant_document_exclusions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('document_type', documentType);

      if (error) throw error;
      return documentType;
    },
    onSuccess: (documentType) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-document-exclusions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
      toast.success("Unmarked from by tenant");
      
      logActivity(
        'tenant_document_exclusion_removed',
        `Removed "By Tenant" marking for ${documentType} for ${shopNumber}`,
        { tenant_id: tenantId, document_type: documentType },
        projectId
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unmark");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documents.find(d => d.id === documentId);
      if (!doc) throw new Error("Document not found");

      // Delete from storage
      const filePath = doc.file_url.split('/tenant-documents/')[1];
      const { error: storageError } = await supabase.storage
        .from('tenant-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-documents", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
      toast.success("Document deleted successfully");
      
      logActivity(
        'tenant_document_delete',
        `Deleted ${doc.document_name} for ${shopNumber}`,
        { tenant_id: tenantId, document_type: doc.document_type },
        projectId
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const handleUpload = (docType: typeof DOCUMENT_TYPES[number]["key"]) => {
    setSelectedDocType(docType);
    setUploadDialogOpen(true);
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const getDocumentForType = (type: string) => {
    return documents.find(doc => doc.document_type === type);
  };

  const getExclusionForType = (type: string) => {
    return exclusions.find(exc => exc.document_type === type);
  };

  const completedCount = DOCUMENT_TYPES.filter(type => {
    const hasDoc = getDocumentForType(type.key);
    const hasExclusion = getExclusionForType(type.key);
    return hasDoc || hasExclusion;
  }).length;
  const completionPercentage = (completedCount / DOCUMENT_TYPES.length) * 100;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents - {shopNumber} {shopName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Overview */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Document Progress</span>
                  <span className="text-muted-foreground">
                    {completedCount} of {DOCUMENT_TYPES.length} completed
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </Card>

            {/* Document List */}
            <div className="grid gap-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading documents...
                </div>
              ) : (
                DOCUMENT_TYPES.map((type) => {
                  const doc = getDocumentForType(type.key);
                  const exclusion = getExclusionForType(type.key);
                  const hasDocument = !!doc;
                  const isByTenant = !!exclusion;

                  return (
                    <Card key={type.key} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{type.label}</h4>
                            {hasDocument ? (
                              <Badge variant="default" className="bg-emerald-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Uploaded
                              </Badge>
                            ) : isByTenant ? (
                              <Badge variant="secondary" className="bg-blue-500 text-white">
                                <UserCheck className="h-3 w-3 mr-1" />
                                By Tenant
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Missing
                              </Badge>
                            )}
                          </div>

                          {hasDocument && doc && (
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p className="truncate">📎 {doc.document_name}</p>
                              <p>
                                Uploaded {format(new Date(doc.uploaded_at), "PPp")} by{" "}
                                {(doc.profiles as any)?.full_name || "Unknown"}
                              </p>
                              {doc.notes && (
                                <p className="italic">Note: {doc.notes}</p>
                              )}
                            </div>
                          )}
                          
                          {isByTenant && exclusion && (
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                Marked {format(new Date(exclusion.marked_at), "PPp")}
                              </p>
                              {exclusion.notes && (
                                <p className="italic">Note: {exclusion.notes}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {hasDocument && doc ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(doc.file_url, doc.document_name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMutation.mutate(doc.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpload(type.key)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Replace
                              </Button>
                            </>
                          ) : isByTenant ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unmarkByTenantMutation.mutate(type.key)}
                                disabled={unmarkByTenantMutation.isPending}
                              >
                                Unmark
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpload(type.key)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Instead
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markByTenantMutation.mutate({ documentType: type.key })}
                                disabled={markByTenantMutation.isPending}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                By Tenant
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpload(type.key)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedDocType && (
        <UploadTenantDocumentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          tenantId={tenantId}
          projectId={projectId}
          shopNumber={shopNumber}
          documentType={selectedDocType}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["tenant-documents", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
          }}
        />
      )}
    </>
  );
};
