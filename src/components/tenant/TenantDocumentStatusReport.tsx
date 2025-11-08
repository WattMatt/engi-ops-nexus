import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, UserCheck, Download, FileBarChart, Search } from "lucide-react";

const DOCUMENT_TYPES = [
  { key: "lighting_quote_received", label: "Lighting Quote (Rec.)" },
  { key: "lighting_quote_instruction", label: "Lighting Inst." },
  { key: "db_order_quote_received", label: "DB Quote (Rec.)" },
  { key: "db_order_instruction", label: "DB Inst." },
  { key: "db_shop_drawing_received", label: "DB Drawing (Rec.)" },
  { key: "db_shop_drawing_approved", label: "DB Drawing (App.)" },
] as const;

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string;
  project_id: string;
}

interface TenantDocumentStatusReportProps {
  projectId: string;
  tenants: Tenant[];
}

type DocumentStatus = 'uploaded' | 'by_tenant' | 'missing';

export const TenantDocumentStatusReport = ({ projectId, tenants }: TenantDocumentStatusReportProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "incomplete">("all");
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["tenant-documents-all", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_documents")
        .select("tenant_id, document_type")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: exclusions = [], isLoading: exclusionsLoading } = useQuery({
    queryKey: ["tenant-document-exclusions-all", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_document_exclusions")
        .select("tenant_id, document_type")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const getDocumentStatus = (tenantId: string, documentType: string): DocumentStatus => {
    const hasDocument = documents.some(
      doc => doc.tenant_id === tenantId && doc.document_type === documentType
    );
    const hasExclusion = exclusions.some(
      exc => exc.tenant_id === tenantId && exc.document_type === documentType
    );

    if (hasDocument) return 'uploaded';
    if (hasExclusion) return 'by_tenant';
    return 'missing';
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'by_tenant':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'missing':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-emerald-500 text-xs">✓</Badge>;
      case 'by_tenant':
        return <Badge variant="secondary" className="bg-blue-500 text-white text-xs">T</Badge>;
      case 'missing':
        return <Badge variant="outline" className="text-muted-foreground text-xs">-</Badge>;
    }
  };

  // Calculate statistics
  const totalCells = tenants.length * DOCUMENT_TYPES.length;
  const uploadedCount = tenants.reduce((sum, tenant) => {
    return sum + DOCUMENT_TYPES.filter(type => 
      getDocumentStatus(tenant.id, type.key) === 'uploaded'
    ).length;
  }, 0);
  const byTenantCount = tenants.reduce((sum, tenant) => {
    return sum + DOCUMENT_TYPES.filter(type => 
      getDocumentStatus(tenant.id, type.key) === 'by_tenant'
    ).length;
  }, 0);
  const missingCount = totalCells - uploadedCount - byTenantCount;
  const completionRate = totalCells > 0 ? Math.round(((uploadedCount + byTenantCount) / totalCells) * 100) : 0;

  // Column statistics
  const getColumnStats = (documentType: string) => {
    const uploaded = tenants.filter(t => getDocumentStatus(t.id, documentType) === 'uploaded').length;
    const byTenant = tenants.filter(t => getDocumentStatus(t.id, documentType) === 'by_tenant').length;
    const missing = tenants.length - uploaded - byTenant;
    return { uploaded, byTenant, missing };
  };

  // Row statistics
  const getRowStats = (tenantId: string) => {
    const uploaded = DOCUMENT_TYPES.filter(type => getDocumentStatus(tenantId, type.key) === 'uploaded').length;
    const byTenant = DOCUMENT_TYPES.filter(type => getDocumentStatus(tenantId, type.key) === 'by_tenant').length;
    const missing = DOCUMENT_TYPES.length - uploaded - byTenant;
    const complete = uploaded + byTenant === DOCUMENT_TYPES.length;
    return { uploaded, byTenant, missing, complete };
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Shop Number', 'Shop Name', ...DOCUMENT_TYPES.map(t => t.label), 'Complete'];
    const rows = tenants.map(tenant => {
      const rowStats = getRowStats(tenant.id);
      return [
        tenant.shop_number,
        tenant.shop_name,
        ...DOCUMENT_TYPES.map(type => {
          const status = getDocumentStatus(tenant.id, type.key);
          return status === 'uploaded' ? 'Uploaded' : status === 'by_tenant' ? 'By Tenant' : 'Missing';
        }),
        `${rowStats.uploaded + rowStats.byTenant}/${DOCUMENT_TYPES.length}`
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-documents-status-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter tenants based on search and status
  const filteredTenants = tenants.filter(tenant => {
    // Search filter
    const matchesSearch = !searchQuery.trim() || 
      tenant.shop_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (statusFilter === "all") return true;
    
    const rowStats = getRowStats(tenant.id);
    if (statusFilter === "complete") return rowStats.complete;
    if (statusFilter === "incomplete") return !rowStats.complete;
    
    return true;
  });

  const isLoading = docsLoading || exclusionsLoading;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Completion</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
            </div>
            <FileBarChart className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p className="text-2xl font-bold">{uploadedCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">By Tenant</p>
              <p className="text-2xl font-bold">{byTenantCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Missing</p>
              <p className="text-2xl font-bold">{missingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Legend and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Document Uploaded</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-500" />
                <span className="text-sm">By Tenant</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Missing</span>
              </div>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by shop number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 items-center">
              <span className="text-xs font-medium text-gray-600">Filter:</span>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All ({tenants.length})
              </Button>
              <Button
                variant={statusFilter === "complete" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("complete")}
                className={statusFilter === "complete" ? "" : "border-green-200 text-green-700 hover:bg-green-50"}
              >
                ✓ Complete ({tenants.filter(t => getRowStats(t.id).complete).length})
              </Button>
              <Button
                variant={statusFilter === "incomplete" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("incomplete")}
                className={statusFilter === "incomplete" ? "" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}
              >
                ⚠ Incomplete ({tenants.filter(t => !getRowStats(t.id).complete).length})
              </Button>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || statusFilter !== "all") && (
            <p className="text-xs text-gray-500">
              Showing {filteredTenants.length} of {tenants.length} tenants
            </p>
          )}
        </div>
      </Card>

      {/* Status Matrix */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Shop</TableHead>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Name</TableHead>
                {DOCUMENT_TYPES.map(type => (
                  <TableHead key={type.key} className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">{type.label}</span>
                      {!isLoading && (
                        <div className="flex gap-1 text-xs text-muted-foreground">
                          {(() => {
                            const stats = getColumnStats(type.key);
                            return (
                              <>
                                <span className="text-emerald-500">{stats.uploaded}</span>
                                <span>/</span>
                                <span className="text-blue-500">{stats.byTenant}</span>
                                <span>/</span>
                                <span>{stats.missing}</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={DOCUMENT_TYPES.length + 3} className="text-center py-8">
                    Loading document status...
                  </TableCell>
                </TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={DOCUMENT_TYPES.length + 3} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? `No tenants found matching "${searchQuery}"` : "No tenants found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map(tenant => {
                  const rowStats = getRowStats(tenant.id);
                  return (
                    <TableRow key={tenant.id} className={rowStats.complete ? "bg-emerald-50/50" : ""}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {tenant.shop_number}
                      </TableCell>
                      <TableCell className="sticky left-0 bg-background">
                        {tenant.shop_name}
                      </TableCell>
                      {DOCUMENT_TYPES.map(type => (
                        <TableCell key={type.key} className="text-center">
                          {getStatusIcon(getDocumentStatus(tenant.id, type.key))}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {rowStats.complete ? (
                            <Badge variant="default" className="bg-emerald-500">
                              Complete
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {rowStats.uploaded + rowStats.byTenant}/{DOCUMENT_TYPES.length}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
