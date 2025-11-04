import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, FileText, History, ArrowRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function TenantChangesWidget() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId");

  // Get current tenant schedule version
  const { data: currentVersion } = useQuery({
    queryKey: ["widget-tenant-version", projectId],
    queryFn: async () => {
      if (!projectId) return 0;
      const { data } = await supabase
        .rpc("get_current_tenant_schedule_version", { p_project_id: projectId });
      return data || 0;
    },
    enabled: !!projectId,
  });

  // Get recent tenant changes (last 5)
  const { data: recentChanges = [], isLoading: changesLoading } = useQuery({
    queryKey: ["widget-recent-changes", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tenant_change_audit_log")
        .select(`
          *,
          version:tenant_schedule_versions(version_number, change_summary)
        `)
        .eq("project_id", projectId)
        .order("changed_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get outdated reports count
  const { data: outdatedCount = 0, isLoading: reportsLoading } = useQuery({
    queryKey: ["widget-outdated-reports", projectId, currentVersion],
    queryFn: async () => {
      if (!projectId || !currentVersion) return 0;
      const { data, error } = await supabase
        .from("generator_reports")
        .select("id, tenant_schedule_version")
        .eq("project_id", projectId);

      if (error) throw error;
      
      const outdated = (data || []).filter(
        report => !report.tenant_schedule_version || report.tenant_schedule_version < currentVersion
      );
      
      return outdated.length;
    },
    enabled: !!projectId && !!currentVersion,
  });

  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tenant Schedule Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a project to view tenant changes</p>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (changeType: string) => {
    const iconClass = "h-3 w-3";
    switch (changeType) {
      case "created": return <div className={`${iconClass} rounded-full bg-green-500`} />;
      case "updated": return <div className={`${iconClass} rounded-full bg-blue-500`} />;
      case "deleted": return <div className={`${iconClass} rounded-full bg-red-500`} />;
      default: return <div className={`${iconClass} rounded-full bg-gray-500`} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Tenant Schedule Updates</CardTitle>
          </div>
          {currentVersion > 0 && (
            <Badge variant="secondary">v{currentVersion}</Badge>
          )}
        </div>
        <CardDescription>
          Track tenant data changes and report status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outdated Reports Alert */}
        {reportsLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : outdatedCount > 0 ? (
          <div className="p-4 border border-amber-500 bg-amber-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {outdatedCount} {outdatedCount === 1 ? "Report" : "Reports"} Outdated
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {outdatedCount === 1 ? "A report was" : "Reports were"} generated with older tenant data
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-amber-700 p-0 h-auto mt-2"
                  onClick={() => navigate("/dashboard/projects-report/generator")}
                >
                  Review & Regenerate
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-green-500 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm text-green-700 font-medium">
                All reports are up to date
              </p>
            </div>
          </div>
        )}

        {/* Recent Changes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Changes
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/tenant-tracker")}
            >
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {changesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentChanges.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent changes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentChanges.map((change: any) => (
                <div
                  key={change.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  {getChangeIcon(change.change_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {change.version?.change_summary || "Tenant modified"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {change.change_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(change.changed_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate("/dashboard/tenant-tracker")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Tenant Tracker
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate("/dashboard/projects-report/generator")}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Generator Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
