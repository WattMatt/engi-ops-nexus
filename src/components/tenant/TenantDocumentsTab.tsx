import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantDocumentManager } from "./TenantDocumentManager";
import { TenantDocumentStatusReport } from "./TenantDocumentStatusReport";
import { FileText, FolderOpen } from "lucide-react";

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string;
  project_id: string;
}

interface TenantDocumentsTabProps {
  projectId: string;
  tenants: Tenant[];
  activeView: "by-tenant" | "status-report";
}

const TOTAL_DOCUMENT_TYPES = 6;

export const TenantDocumentsTab = ({ projectId, tenants, activeView }: TenantDocumentsTabProps) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { data: documentsSummary = {}, isLoading } = useQuery({
    queryKey: ["tenant-documents-summary", projectId],
    queryFn: async () => {
      // Get documents
      const { data: docs, error: docsError } = await supabase
        .from("tenant_documents")
        .select("tenant_id, document_type")
        .eq("project_id", projectId);

      if (docsError) throw docsError;

      // Get exclusions
      const { data: exclusions, error: exclusionsError } = await supabase
        .from("tenant_document_exclusions")
        .select("tenant_id, document_type")
        .eq("project_id", projectId);

      if (exclusionsError) throw exclusionsError;

      // Count unique document types + exclusions per tenant
      const summary: Record<string, number> = {};
      
      // Count documents
      docs?.forEach(doc => {
        if (!summary[doc.tenant_id]) {
          summary[doc.tenant_id] = 0;
        }
      });
      
      // Count unique types from both documents and exclusions
      const allTenantIds = new Set([
        ...(docs?.map(d => d.tenant_id) || []),
        ...(exclusions?.map(e => e.tenant_id) || [])
      ]);

      allTenantIds.forEach(tenantId => {
        const tenantDocs = docs?.filter(d => d.tenant_id === tenantId).map(d => d.document_type) || [];
        const tenantExclusions = exclusions?.filter(e => e.tenant_id === tenantId).map(e => e.document_type) || [];
        const uniqueTypes = new Set([...tenantDocs, ...tenantExclusions]);
        summary[tenantId] = uniqueTypes.size;
      });

      return summary;
    },
    enabled: !!projectId,
  });

  const handleOpenManager = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setManagerOpen(true);
  };

  const getDocumentStatus = (tenantId: string) => {
    const count = documentsSummary[tenantId] || 0;
    const percentage = (count / TOTAL_DOCUMENT_TYPES) * 100;

    if (count === 0) return { variant: "destructive" as const, label: "0/6", color: "bg-destructive" };
    if (count === TOTAL_DOCUMENT_TYPES) return { variant: "default" as const, label: "6/6", color: "bg-emerald-500" };
    return { variant: "secondary" as const, label: `${count}/6`, color: "bg-yellow-500" };
  };

  const totalDocuments = Object.values(documentsSummary).reduce((sum, count) => sum + count, 0);
  const totalExpected = tenants.length * TOTAL_DOCUMENT_TYPES;
  const overallCompletion = totalExpected > 0 ? Math.round((totalDocuments / totalExpected) * 100) : 0;

  return (
    <>
      <div className="space-y-4">
        {activeView === "by-tenant" ? (
          <>
              {/* Summary Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Document Repository Overview</h3>
                    <p className="text-sm text-muted-foreground">
                      Track critical tenant documents for progress monitoring and handover
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{overallCompletion}%</div>
                    <div className="text-sm text-muted-foreground">
                      {totalDocuments} of {totalExpected} documents
                    </div>
                  </div>
                </div>
              </Card>

              {/* Document Types Legend */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-sm">Required Documents per Tenant:</h4>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Documents marked with 🔗 automatically update tenant schedule checkboxes
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">• Lighting Quotation (Received)</div>
                        <div className="text-xs text-muted-foreground">Reference document only</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex-1">
                        <div className="font-medium">• Lighting Quotation Instruction 🔗</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">→ Lighting Ordered checkbox</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">• DB Order Quote (Received)</div>
                        <div className="text-xs text-muted-foreground">Reference document only</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex-1">
                        <div className="font-medium">• DB Order Instruction 🔗</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">→ DB Ordered checkbox</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">• DB Shop Drawing (Received)</div>
                        <div className="text-xs text-muted-foreground">Reference document only</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">• DB Shop Drawing (Approved)</div>
                        <div className="text-xs text-muted-foreground">Reference document only</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                    <strong>Note:</strong> SOW and Layout documents are tracked separately in the main tenant schedule.
                  </div>
                </div>
              </Card>

              {/* Tenants Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Number</TableHead>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading document status...
                        </TableCell>
                      </TableRow>
                    ) : tenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No tenants found. Add tenants to start tracking documents.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenants.map((tenant) => {
                        const status = getDocumentStatus(tenant.id);
                        return (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                            <TableCell>{tenant.shop_name}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className={status.color}>
                                <FileText className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenManager(tenant)}
                              >
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Manage Documents
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <TenantDocumentStatusReport projectId={projectId} tenants={tenants} />
        )}
      </div>

      {/* Document Manager Dialog */}
      {selectedTenant && (
        <TenantDocumentManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          tenantId={selectedTenant.id}
          projectId={selectedTenant.project_id}
          shopNumber={selectedTenant.shop_number}
          shopName={selectedTenant.shop_name}
        />
      )}
    </>
  );
};
