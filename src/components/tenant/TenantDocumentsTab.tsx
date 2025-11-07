import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TenantDocumentManager } from "./TenantDocumentManager";
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
}

const TOTAL_DOCUMENT_TYPES = 6;

export const TenantDocumentsTab = ({ projectId, tenants }: TenantDocumentsTabProps) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { data: documentsSummary = {}, isLoading } = useQuery({
    queryKey: ["tenant-documents-summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_documents")
        .select("tenant_id, document_type")
        .eq("project_id", projectId);

      if (error) throw error;

      // Count unique document types per tenant
      const summary: Record<string, number> = {};
      data.forEach(doc => {
        if (!summary[doc.tenant_id]) {
          summary[doc.tenant_id] = 0;
        }
        // Count unique document types
        const existingTypes = data
          .filter(d => d.tenant_id === doc.tenant_id)
          .map(d => d.document_type);
        summary[doc.tenant_id] = new Set(existingTypes).size;
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
    <div className="space-y-4">
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
        <h4 className="font-semibold mb-2 text-sm">Required Documents per Tenant:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
          <div>• Lighting Quotation (Received)</div>
          <div>• Lighting Quotation Instruction</div>
          <div>• DB Order Quote (Received)</div>
          <div>• DB Order Instruction</div>
          <div>• DB Shop Drawing (Received)</div>
          <div>• DB Shop Drawing (Approved)</div>
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
    </div>
  );
};
