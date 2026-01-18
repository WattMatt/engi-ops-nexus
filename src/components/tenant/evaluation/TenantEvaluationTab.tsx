import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Eye, Trash2, ClipboardCheck, Loader2 } from "lucide-react";
import { TenantEvaluationFormDialog } from "./TenantEvaluationFormDialog";
import { TenantEvaluationPreviewDialog } from "./TenantEvaluationPreviewDialog";
import { format } from "date-fns";
import { toast } from "sonner";
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

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  shop_category: string;
}

interface TenantEvaluationTabProps {
  tenants: Tenant[];
  projectId: string;
  projectName: string;
}

interface TenantEvaluation {
  id: string;
  tenant_id: string;
  evaluation_date: string;
  evaluated_by: string;
  revision: number;
  status: string;
  created_at: string;
}

export function TenantEvaluationTab({ tenants, projectId, projectName }: TenantEvaluationTabProps) {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<TenantEvaluation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<TenantEvaluation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch existing evaluations
  const { data: evaluations = [], refetch: refetchEvaluations } = useQuery({
    queryKey: ["tenant-evaluations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_evaluations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as TenantEvaluation[];
    },
    enabled: !!projectId,
  });

  // Group evaluations by tenant
  const evaluationsByTenant = evaluations.reduce((acc, eval_) => {
    if (!acc[eval_.tenant_id]) {
      acc[eval_.tenant_id] = [];
    }
    acc[eval_.tenant_id].push(eval_);
    return acc;
  }, {} as Record<string, TenantEvaluation[]>);

  const handleNewEvaluation = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setSelectedEvaluation(null);
    setFormDialogOpen(true);
  };

  const handleViewEvaluation = (tenant: Tenant, evaluation: TenantEvaluation) => {
    setSelectedTenant(tenant);
    setSelectedEvaluation(evaluation);
    setPreviewDialogOpen(true);
  };

  const handleEditEvaluation = (tenant: Tenant, evaluation: TenantEvaluation) => {
    setSelectedTenant(tenant);
    setSelectedEvaluation(evaluation);
    setFormDialogOpen(true);
  };

  const handleDeleteEvaluation = (tenant: Tenant, evaluation: TenantEvaluation) => {
    setSelectedTenant(tenant);
    setEvaluationToDelete(evaluation);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!evaluationToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete associated reports first
      await supabase
        .from("tenant_evaluation_reports")
        .delete()
        .eq("evaluation_id", evaluationToDelete.id);
      
      // Then delete the evaluation
      const { error } = await supabase
        .from("tenant_evaluations")
        .delete()
        .eq("id", evaluationToDelete.id);
      
      if (error) throw error;
      
      toast.success("Evaluation deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tenant-evaluations"] });
      refetchEvaluations();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEvaluationToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-blue-500">Approved</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "fast food":
        return "bg-red-500 text-white border-red-600";
      case "restaurant":
        return "bg-emerald-500 text-white border-emerald-600";
      case "national":
        return "bg-purple-600 text-white border-purple-700";
      default:
        return "bg-blue-500 text-white border-blue-600";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Tenant Evaluation Forms</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage evaluation forms for each tenant. Click the + button to create a new evaluation.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {tenants.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tenants found. Add tenants from the Tenant Schedule tab first.
              </CardContent>
            </Card>
          ) : (
            tenants.map((tenant) => {
              const tenantEvaluations = evaluationsByTenant[tenant.id] || [];
              const latestEvaluation = tenantEvaluations[0];

              return (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tenant.shop_number}</span>
                            <Badge variant="outline" className={getCategoryColor(tenant.shop_category)}>
                              {tenant.shop_category || "Standard"}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">{tenant.shop_name}</span>
                          {tenant.area && (
                            <span className="text-xs text-muted-foreground">{tenant.area} m²</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Evaluation History */}
                        {tenantEvaluations.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  Rev {latestEvaluation.revision}
                                </span>
                                {getStatusBadge(latestEvaluation.status)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(latestEvaluation.evaluation_date), "dd MMM yyyy")} by {latestEvaluation.evaluated_by}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEvaluation(tenant, latestEvaluation)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEvaluation(tenant, latestEvaluation)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEvaluation(tenant, latestEvaluation)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* New Evaluation Button */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleNewEvaluation(tenant)}
                          className="gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          {tenantEvaluations.length > 0 ? "New Rev" : "Evaluate"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Evaluation Form Dialog */}
      <TenantEvaluationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        tenant={selectedTenant}
        projectId={projectId}
        projectName={projectName}
        existingEvaluation={selectedEvaluation}
        onSuccess={() => {
          refetchEvaluations();
          setFormDialogOpen(false);
        }}
      />

      {/* Preview Dialog */}
      {selectedTenant && selectedEvaluation && (
        <TenantEvaluationPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          evaluation={selectedEvaluation}
          tenant={selectedTenant}
          projectName={projectName}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this evaluation (Rev {evaluationToDelete?.revision}) for {selectedTenant?.shop_number}? 
              This action cannot be undone and will also delete any associated reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
