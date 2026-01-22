import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react";

interface ContractorDocumentStatusProps {
  projectId: string;
  documentCategories: string[];
}

export function ContractorDocumentStatus({ projectId, documentCategories }: ContractorDocumentStatusProps) {
  // Fetch tenants for document status
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['contractor-tenants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_number, name, sow_received, layout_received, lighting_ordered, db_ordered, status')
        .eq('project_id', projectId)
        .order('shop_number');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch handover documents
  const { data: handoverDocs, isLoading: handoverLoading } = useQuery({
    queryKey: ['contractor-handover', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handover_documents')
        .select('id, document_type, file_path')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: documentCategories.length === 0 || documentCategories.some(cat => 
      ['as_built', 'generators', 'transformers', 'manuals', 'certificates'].includes(cat)
    )
  });

  const isLoading = tenantsLoading || handoverLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate tenant documentation stats
  const tenantStats = tenants?.reduce((acc, tenant: any) => {
    const fields = ['sow_received', 'layout_received', 'lighting_ordered', 'db_ordered'];
    const completed = fields.filter(f => tenant[f]).length;
    acc.totalFields += fields.length;
    acc.completedFields += completed;
    if (completed === fields.length) acc.fullComplete++;
    return acc;
  }, { totalFields: 0, completedFields: 0, fullComplete: 0 }) || { totalFields: 0, completedFields: 0, fullComplete: 0 };

  const overallProgress = tenantStats.totalFields > 0 
    ? Math.round((tenantStats.completedFields / tenantStats.totalFields) * 100) 
    : 0;

  // Handover stats by category
  const handoverByCategory = handoverDocs?.reduce((acc, doc: any) => {
    const category = doc.document_type || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentation Overview
          </CardTitle>
          <CardDescription>Current status of project documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Completion</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{tenants?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Tenants</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{tenantStats.fullComplete}</p>
                <p className="text-xs text-muted-foreground">Fully Documented</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{handoverDocs?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Handover Docs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Documentation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {tenants?.map((tenant: any) => {
              const docStatus = [
                { label: 'SOW', done: tenant.sow_received },
                { label: 'Layout', done: tenant.layout_received },
                { label: 'Lighting', done: tenant.lighting_ordered },
                { label: 'DB', done: tenant.db_ordered }
              ];
              
              return (
                <div key={tenant.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tenant.shop_number}</p>
                    <p className="text-sm text-muted-foreground">{tenant.name || 'Unassigned'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {docStatus.map((doc, i) => (
                      <Badge key={i} variant={doc.done ? "default" : "secondary"}>
                        {doc.done ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {doc.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
            {(!tenants || tenants.length === 0) && (
              <div className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tenant data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {Object.keys(handoverByCategory).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Handover Documentation</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(handoverByCategory).map(([category, count]) => (
                <div key={category} className="p-4 rounded-lg border text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{category.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
