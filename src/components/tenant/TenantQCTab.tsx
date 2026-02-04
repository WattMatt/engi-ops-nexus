import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  ClipboardCheck, 
  Search, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Store
} from "lucide-react";
import { TenantQCInspections } from "./TenantQCInspections";

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string | null;
  shop_category: string | null;
}

interface TenantQCTabProps {
  projectId: string;
  tenants: Tenant[];
}

interface InspectionStats {
  [tenantId: string]: {
    total: number;
    passed: number;
  };
}

export function TenantQCTab({ projectId, tenants }: TenantQCTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  // Fetch inspection stats for all tenants
  const { data: inspectionStats, isLoading } = useQuery({
    queryKey: ["tenant-inspection-stats", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_inspection_items")
        .select("tenant_id, status")
        .eq("project_id", projectId)
        .not("tenant_id", "is", null);

      if (error) throw error;

      const stats: InspectionStats = {};
      (data || []).forEach((item) => {
        if (!item.tenant_id) return;
        if (!stats[item.tenant_id]) {
          stats[item.tenant_id] = { total: 0, passed: 0 };
        }
        stats[item.tenant_id].total++;
        if (item.status === "passed") {
          stats[item.tenant_id].passed++;
        }
      });

      return stats;
    },
  });

  // Filter tenants
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const query = searchQuery.toLowerCase();
    return tenants.filter(
      (t) =>
        t.shop_number.toLowerCase().includes(query) ||
        t.shop_name?.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  // Calculate overall progress
  const overallStats = useMemo(() => {
    if (!inspectionStats) return { total: 0, passed: 0, percentage: 0 };
    
    let total = 0;
    let passed = 0;
    Object.values(inspectionStats).forEach((stat) => {
      total += stat.total;
      passed += stat.passed;
    });
    
    return {
      total,
      passed,
      percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  }, [inspectionStats]);

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

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            QC Inspections Overview
          </CardTitle>
          <CardDescription>
            Quality control inspections by tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tenants</span>
              </div>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Inspections</span>
              </div>
              <p className="text-2xl font-bold">{overallStats.total}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Passed</span>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{overallStats.passed}</p>
                <Progress value={overallStats.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {overallStats.percentage}% complete
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenant List */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Inspections</CardTitle>
          <CardDescription>
            Click on a tenant to manage their QC inspections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tenants found</p>
              {searchQuery && <p className="text-sm">Try adjusting your search</p>}
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filteredTenants.map((tenant) => {
                const isExpanded = expandedTenants.has(tenant.id);
                const stats = inspectionStats?.[tenant.id];
                const hasInspections = stats && stats.total > 0;
                const allPassed = hasInspections && stats.passed === stats.total;

                return (
                  <Collapsible
                    key={tenant.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTenant(tenant.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <p className="font-medium">{tenant.shop_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {tenant.shop_name || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasInspections ? (
                            <Badge
                              variant={allPassed ? "default" : "secondary"}
                              className={allPassed ? "bg-green-500" : ""}
                            >
                              {allPassed ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {stats.passed}/{stats.total}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No inspections
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0 border-t bg-muted/20">
                        <TenantQCInspections
                          tenantId={tenant.id}
                          projectId={projectId}
                          shopNumber={tenant.shop_number}
                          shopName={tenant.shop_name}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
