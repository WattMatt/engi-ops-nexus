import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Store, Search, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TenantDocumentUpload } from "./TenantDocumentUpload";

interface TenantCompletionDashboardProps {
  projectId: string;
}

const TENANT_DOCUMENT_TYPES = [
  "electrical_coc",
  "as_built_drawing",
  "line_diagram",
  "qc_inspection_report",
  "lighting_guarantee",
  "db_guarantee",
];

export const TenantCompletionDashboard = ({ projectId }: TenantCompletionDashboardProps) => {
  const [completionFilter, setCompletionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  // Fetch all tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["handover-tenants-dashboard", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name")
        .eq("project_id", projectId)
        .order("shop_number", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all documents
  const { data: allDocuments = [] } = useQuery({
    queryKey: ["handover-all-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("source_type", "tenant");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all exclusions
  const { data: allExclusions = [] } = useQuery({
    queryKey: ["handover-all-exclusions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_document_exclusions" as any)
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate completion for each tenant
  const tenantsWithCompletion = useMemo(() => {
    return tenants.map((tenant) => {
      const tenantDocs = allDocuments.filter(
        (doc: any) => doc.source_id === tenant.id
      );
      const tenantExclusions = allExclusions.filter(
        (exc: any) => exc.tenant_id === tenant.id
      );

      const completedCount = TENANT_DOCUMENT_TYPES.filter((type) => {
        const hasDocument = tenantDocs.some((d: any) => d.document_type === type);
        const hasExclusion = tenantExclusions.some((e: any) => e.document_type === type);
        return hasDocument || hasExclusion;
      }).length;

      const completionPercentage = Math.round(
        (completedCount / TENANT_DOCUMENT_TYPES.length) * 100
      );

      return {
        ...tenant,
        completedCount,
        totalCount: TENANT_DOCUMENT_TYPES.length,
        completionPercentage,
      };
    });
  }, [tenants, allDocuments, allExclusions]);

  // Filter tenants
  const filteredTenants = useMemo(() => {
    let filtered = tenantsWithCompletion;

    // Apply completion filter
    if (completionFilter === "complete") {
      filtered = filtered.filter((t) => t.completionPercentage === 100);
    } else if (completionFilter === "incomplete") {
      filtered = filtered.filter((t) => t.completionPercentage < 100 && t.completionPercentage > 0);
    } else if (completionFilter === "not-started") {
      filtered = filtered.filter((t) => t.completionPercentage === 0);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.shop_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [tenantsWithCompletion, completionFilter, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tenantsWithCompletion.length;
    const complete = tenantsWithCompletion.filter((t) => t.completionPercentage === 100).length;
    const inProgress = tenantsWithCompletion.filter(
      (t) => t.completionPercentage > 0 && t.completionPercentage < 100
    ).length;
    const notStarted = tenantsWithCompletion.filter((t) => t.completionPercentage === 0).length;
    const overallPercentage = Math.round(
      (tenantsWithCompletion.reduce((sum, t) => sum + t.completionPercentage, 0) / total) || 0
    );

    return { total, complete, inProgress, notStarted, overallPercentage };
  }, [tenantsWithCompletion]);

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    } else if (percentage > 0) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Started
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallPercentage}%</div>
            <Progress value={stats.overallPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.notStarted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tenant Completion Status</CardTitle>
              <CardDescription>
                Track handover document completion across all tenants
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shop number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={completionFilter} onValueChange={setCompletionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                <SelectItem value="complete">Complete (100%)</SelectItem>
                <SelectItem value="incomplete">In Progress (1-99%)</SelectItem>
                <SelectItem value="not-started">Not Started (0%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tenant List */}
          <div className="space-y-2">
            {filteredTenants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tenants found matching your filters</p>
              </div>
            ) : (
              filteredTenants.map((tenant) => {
                const isExpanded = expandedTenants.has(tenant.id);
                return (
                  <Collapsible
                    key={tenant.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTenant(tenant.id)}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <Store className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-semibold">
                                {tenant.shop_number}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tenant.shop_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right min-w-[120px]">
                              <div className="text-sm font-medium">
                                {tenant.completedCount} of {tenant.totalCount}
                              </div>
                              <Progress
                                value={tenant.completionPercentage}
                                className="h-2 w-24"
                              />
                            </div>
                            {getStatusBadge(tenant.completionPercentage)}
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <TenantDocumentUpload
                            tenantId={tenant.id}
                            projectId={projectId}
                            shopNumber={tenant.shop_number}
                            shopName={tenant.shop_name}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
