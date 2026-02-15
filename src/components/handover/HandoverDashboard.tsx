import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";
import {
  Store,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  HardDrive,
  Calendar,
} from "lucide-react";
import { DocumentTypeChart } from "./DocumentTypeChart";
import { RecentActivityTimeline } from "./RecentActivityTimeline";
import { TenantCompletionExportPDFButton } from "./TenantCompletionExportPDFButton";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";

interface HandoverDashboardProps {
  projectId: string;
  projectName: string;
}

const TENANT_DOCUMENT_TYPES = [
  "electrical_coc",
  "as_built_drawing",
  "line_diagram",
  "qc_inspection_report",
  "lighting_guarantee",
  "db_guarantee",
  // Phase 1: New electrical document types
  "cable_certificate",
  "metering_certificate",
  "earth_continuity_test",
  "insulation_resistance_test",
  "loop_impedance_test",
  "rcd_test_certificate",
  "tenant_load_schedule",
];

export const HandoverDashboard = ({ projectId, projectName }: HandoverDashboardProps) => {
  // Fetch all tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["handover-dashboard-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name")
        .eq("project_id", projectId);

      if (error) throw error;
      return data ? sortTenantsByShopNumber(data) : [];
    },
  });

  // Fetch all documents
  const { data: allDocuments = [] } = useQuery({
    queryKey: ["handover-dashboard-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select(`
          *,
          tenants:source_id (
            shop_number,
            shop_name
          )
        `)
        .eq("project_id", projectId)
        .eq("source_type", "tenant")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch all exclusions
  const { data: allExclusions = [] } = useQuery({
    queryKey: ["handover-dashboard-exclusions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_document_exclusions" as any)
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return (data || []) as any[];
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

  // Document type distribution
  const documentTypeData = useMemo(() => {
    return TENANT_DOCUMENT_TYPES.map((type) => ({
      type,
      count: allDocuments.filter((d: any) => d.document_type === type).length,
      total: tenants.length,
    }));
  }, [allDocuments, tenants]);

  // Top performing tenants
  const topTenants = useMemo(() => {
    return [...tenantsWithCompletion]
      .sort((a, b) => b.completionPercentage - a.completionPercentage)
      .slice(0, 5);
  }, [tenantsWithCompletion]);

  // Tenants needing attention
  const attentionTenants = useMemo(() => {
    return [...tenantsWithCompletion]
      .filter((t) => t.completionPercentage < 100)
      .sort((a, b) => a.completionPercentage - b.completionPercentage)
      .slice(0, 5);
  }, [tenantsWithCompletion]);

  // Calculate total file size
  const totalFileSize = useMemo(() => {
    const bytes = allDocuments.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0);
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }, [allDocuments]);

  // Recent activity (last 10 uploads)
  const recentActivity = useMemo(() => {
    return allDocuments.slice(0, 10);
  }, [allDocuments]);

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Handover Overview</h2>
          <p className="text-muted-foreground">
            Comprehensive dashboard of project handover status
          </p>
        </div>
        <TenantCompletionExportPDFButton
          projectId={projectId}
          projectName={projectName}
          tenants={tenantsWithCompletion}
          allDocuments={allDocuments}
          allExclusions={allExclusions}
          stats={stats}
        />
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.overallPercentage}%</div>
            <Progress value={stats.overallPercentage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              Project-wide completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.complete}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Not Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.notStarted}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0}% of tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              Total Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Active tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allDocuments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFileSize}</div>
            <p className="text-xs text-muted-foreground mt-1">Total file size</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Lists Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Document Type Chart */}
        <DocumentTypeChart data={documentTypeData} />

        {/* Recent Activity Timeline */}
        <RecentActivityTimeline activities={recentActivity} />
      </div>

      {/* Top Performers and Attention Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performing Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Performers
            </CardTitle>
            <CardDescription>Tenants with highest completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topTenants.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No tenants yet
                </p>
              ) : (
                topTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{tenant.shop_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {tenant.shop_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={tenant.completionPercentage} className="w-24" />
                      <Badge
                        variant={tenant.completionPercentage === 100 ? "default" : "secondary"}
                      >
                        {tenant.completionPercentage}%
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tenants Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Needs Attention
            </CardTitle>
            <CardDescription>Tenants with lowest completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attentionTenants.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  All tenants complete!
                </p>
              ) : (
                attentionTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{tenant.shop_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {tenant.shop_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={tenant.completionPercentage} className="w-24" />
                      <Badge variant="outline">
                        {tenant.completionPercentage}%
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report History */}
      <ReportHistoryPanel
        dbTable="handover_completion_reports"
        foreignKeyColumn="project_id"
        foreignKeyValue={projectId}
        storageBucket="handover-reports"
        title="Handover Completion Reports"
      />
    </div>
  );
};
