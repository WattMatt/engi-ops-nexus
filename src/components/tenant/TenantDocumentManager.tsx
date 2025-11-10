import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import JSZip from "jszip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadTenantDocumentDialog } from "./UploadTenantDocumentDialog";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { LinkToHandoverDialog } from "./LinkToHandoverDialog";
import { toast } from "sonner";
import { Download, Trash2, Upload, FileText, CheckCircle2, AlertCircle, UserCheck, RefreshCw, Package, Eye, Link2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const DOCUMENT_TYPES = [
  { 
    key: "lighting_quote_received", 
    label: "Lighting Quotation (Received)", 
    allowMultiple: false,
    syncsToSchedule: false,
    description: "Reference document for quotation review"
  },
  { 
    key: "lighting_quote_instruction", 
    label: "Lighting Quotation Instruction", 
    allowMultiple: false,
    syncsToSchedule: true,
    scheduleField: "Lighting Ordered",
    description: "Automatically checks 'Lighting Ordered' in schedule"
  },
  { 
    key: "db_order_quote_received", 
    label: "DB Order Quote (Received)", 
    allowMultiple: false,
    syncsToSchedule: false,
    description: "Reference document for quotation review"
  },
  { 
    key: "db_order_instruction", 
    label: "DB Order Instruction", 
    allowMultiple: false,
    syncsToSchedule: true,
    scheduleField: "DB Ordered",
    description: "Automatically checks 'DB Ordered' in schedule"
  },
  { 
    key: "db_shop_drawing_received", 
    label: "DB Shop Drawing (Received)", 
    allowMultiple: true,
    syncsToSchedule: false,
    description: "Reference drawings for review"
  },
  { 
    key: "db_shop_drawing_approved", 
    label: "DB Shop Drawing (Approved)", 
    allowMultiple: true,
    syncsToSchedule: false,
    description: "Approved drawings for construction"
  },
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
  const [linkHandoverDialogOpen, setLinkHandoverDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<typeof DOCUMENT_TYPES[number]["key"] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProgressPulse, setShowProgressPulse] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const prevCompletedCountRef = useRef<number>(0);
  const hasTriggeredConfettiRef = useRef<boolean>(false);
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogger();

  const { data: documents = [], isLoading, error: documentsError } = useQuery({
    queryKey: ["tenant-documents", tenantId],
    queryFn: async () => {
      console.log("Fetching documents for tenant:", tenantId);
      const { data, error } = await supabase
        .from("tenant_documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        throw error;
      }
      console.log("Fetched documents:", data);
      return data;
    },
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: exclusions = [], error: exclusionsError } = useQuery({
    queryKey: ["tenant-document-exclusions", tenantId],
    queryFn: async () => {
      console.log("Fetching exclusions for tenant:", tenantId);
      const { data, error } = await supabase
        .from("tenant_document_exclusions")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Error fetching exclusions:", error);
        throw error;
      }
      console.log("Fetched exclusions:", data);
      return data;
    },
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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

  const handleDownloadAll = async () => {
    const uploadedDocs = documents.filter(doc => doc.file_url);
    
    if (uploadedDocs.length === 0) {
      toast.error("No documents to download");
      return;
    }

    setIsDownloadingAll(true);
    
    try {
      const zip = new JSZip();
      
      // Fetch all documents and add to ZIP
      for (const doc of uploadedDocs) {
        try {
          const response = await fetch(doc.file_url);
          const blob = await response.blob();
          
          // Create a safe filename
          const docTypeLabel = DOCUMENT_TYPES.find(t => t.key === doc.document_type)?.label || doc.document_type;
          const sanitizedLabel = docTypeLabel.replace(/[^a-z0-9]/gi, '_');
          const extension = doc.document_name.split('.').pop();
          const fileName = `${sanitizedLabel}.${extension}`;
          
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download ${doc.document_name}:`, error);
          toast.error(`Failed to include ${doc.document_name} in ZIP`);
        }
      }
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${shopNumber}_${shopName.replace(/[^a-z0-9]/gi, '_')}_Documents.zip`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(link.href);
      
      toast.success(`Downloaded ${uploadedDocs.length} documents as ZIP`);
      
      await logActivity(
        'tenant_documents_bulk_download',
        `Downloaded all documents for ${shopNumber} as ZIP`,
        { tenant_id: tenantId, document_count: uploadedDocs.length },
        projectId
      );
    } catch (error: any) {
      console.error("Error creating ZIP:", error);
      toast.error(error.message || "Failed to create ZIP file");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const getDocumentForType = (type: string) => {
    return documents.find(doc => doc.document_type === type);
  };

  const getDocumentsForType = (type: string) => {
    return documents.filter(doc => doc.document_type === type);
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

  // Trigger confetti when 100% complete
  useEffect(() => {
    if (completionPercentage === 100 && !hasTriggeredConfettiRef.current && completedCount > 0) {
      hasTriggeredConfettiRef.current = true;
      
      // Fire confetti burst
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['hsl(var(--primary))', '#10b981', '#3b82f6', '#f59e0b'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      toast.success("🎉 All documents completed!", {
        description: `${shopNumber} ${shopName} - All required documents have been uploaded or marked.`
      });
    }
    
    // Reset the flag if completion drops below 100%
    if (completionPercentage < 100) {
      hasTriggeredConfettiRef.current = false;
    }
  }, [completionPercentage, completedCount, shopNumber, shopName]);

  // Detect progress changes and trigger animation
  useEffect(() => {
    if (prevCompletedCountRef.current !== 0 && prevCompletedCountRef.current !== completedCount) {
      setShowProgressPulse(true);
      setTimeout(() => setShowProgressPulse(false), 1000);
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents - {shopNumber} {shopName}
              </DialogTitle>
              <div className="flex gap-2">
                {completionPercentage === 100 && documents.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setLinkHandoverDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Bulk Link to Handover
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll || documents.length === 0}
                >
                  {isDownloadingAll ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating ZIP...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Download All ({documents.filter(d => d.file_url).length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Refresh Indicator */}
            {isRefreshing && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-lg animate-fade-in">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Updating documents...</span>
              </div>
            )}

            {/* Progress Overview */}
            <Card className={`p-4 transition-all duration-300 ${
              showProgressPulse ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
            } ${
              completionPercentage === 100 ? 'bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20' : ''
            }`}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    Document Progress
                    {completionPercentage === 100 && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-scale-in" />
                    )}
                  </span>
                  <span className={`text-muted-foreground transition-all duration-300 ${
                    showProgressPulse ? 'text-primary font-semibold scale-110' : ''
                  } ${
                    completionPercentage === 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
                  }`}>
                    {completedCount} of {DOCUMENT_TYPES.length} completed
                  </span>
                </div>
                <Progress 
                  value={completionPercentage} 
                  className={`h-2 transition-all duration-500 ${
                    showProgressPulse ? 'h-3' : ''
                  }`} 
                />
              </div>
            </Card>

            {/* Document List */}
            <div className="grid gap-3">
              {documentsError && (
                <div className="text-center py-4 text-destructive">
                  Error loading documents: {documentsError.message}
                </div>
              )}
              {exclusionsError && (
                <div className="text-center py-4 text-destructive">
                  Error loading exclusions: {exclusionsError.message}
                </div>
              )}
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading documents...
                </div>
              ) : (
                DOCUMENT_TYPES.map((type) => {
                  const docs = getDocumentsForType(type.key);
                  const doc = docs[0];
                  const exclusion = getExclusionForType(type.key);
                  const hasDocument = docs.length > 0;
                  const isByTenant = !!exclusion;

                  return (
                    <Card key={type.key} className={`p-4 ${type.syncsToSchedule ? 'border-blue-200 dark:border-blue-800' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium">{type.label}</h4>
                            {type.syncsToSchedule && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                      {type.scheduleField}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{type.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {hasDocument ? (
                              <Badge variant="default" className="bg-emerald-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Uploaded {type.allowMultiple && docs.length > 1 ? `(${docs.length})` : ''}
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
                          {!type.syncsToSchedule && (
                            <p className="text-xs text-muted-foreground mb-2">{type.description}</p>
                          )}

                          {hasDocument && (
                            <div className="text-sm text-muted-foreground space-y-2">
                              {docs.map((document, index) => (
                                <div key={document.id} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className="truncate">📎 {document.document_name}</p>
                                    <p className="text-xs">
                                      Uploaded {format(new Date(document.uploaded_at), "PPp")}
                                    </p>
                                    {document.notes && (
                                      <p className="italic text-xs">Note: {document.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setPreviewDocument(document)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownload(document.file_url, document.document_name)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete ${document.document_name}?${type.allowMultiple && docs.length === 1 ? '\n\nNote: This is the last document. At least one is recommended.' : ''}`)) {
                                          deleteMutation.mutate(document.id);
                                        }
                                      }}
                                      className="h-8 w-8 p-0 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
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

                        <div className="flex gap-2 flex-wrap shrink-0">
                          {!hasDocument && !isByTenant && (
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

                          {hasDocument && type.allowMultiple && (
                            <Button
                              size="sm"
                              onClick={() => handleUpload(type.key)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Add Another
                            </Button>
                          )}

                          {hasDocument && !type.allowMultiple && (
                            <Button
                              size="sm"
                              onClick={() => handleUpload(type.key)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Replace
                            </Button>
                          )}

                          {isByTenant && (
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
          onSuccess={async () => {
            setIsRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ["tenant-documents", tenantId] });
            await queryClient.invalidateQueries({ queryKey: ["tenant-documents-summary"] });
            await queryClient.invalidateQueries({ queryKey: ["tenant-document-exclusions", tenantId] });
            await queryClient.refetchQueries({ queryKey: ["tenant-documents", tenantId] });
            await queryClient.refetchQueries({ queryKey: ["tenant-document-exclusions", tenantId] });
            
            // Show refresh indicator briefly
            setTimeout(() => {
              setIsRefreshing(false);
              setUploadDialogOpen(false);
            }, 800);
          }}
        />
      )}

      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}

      <LinkToHandoverDialog
        open={linkHandoverDialogOpen}
        onOpenChange={setLinkHandoverDialogOpen}
        documents={documents}
        tenantId={tenantId}
        projectId={projectId}
        shopNumber={shopNumber}
        shopName={shopName}
      />
    </>
  );
};
