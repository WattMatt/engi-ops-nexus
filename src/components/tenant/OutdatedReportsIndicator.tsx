import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { GeneratorReportExportPDFButton } from "./GeneratorReportExportPDFButton";

interface OutdatedReportsIndicatorProps {
  projectId: string;
}

export function OutdatedReportsIndicator({ projectId }: OutdatedReportsIndicatorProps) {
  const [showRegenerateOptions, setShowRegenerateOptions] = useState(false);

  // Get current tenant schedule version
  const { data: currentVersion } = useQuery({
    queryKey: ["current-tenant-version", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_current_tenant_schedule_version", { p_project_id: projectId });
      return data || 0;
    },
    enabled: !!projectId,
  });

  // Get all generator reports with their tenant schedule versions
  const { data: reports = [], refetch } = useQuery({
    queryKey: ["generator-reports-versions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get latest tenant modification date
  const { data: latestTenantChange } = useQuery({
    queryKey: ["latest-tenant-change", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("last_modified_at")
        .eq("project_id", projectId)
        .order("last_modified_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data?.last_modified_at ? new Date(data.last_modified_at) : null;
    },
    enabled: !!projectId,
  });

  // Filter outdated reports
  const outdatedReports = reports.filter(report => {
    if (!report.tenant_schedule_version || !currentVersion) return false;
    return report.tenant_schedule_version < currentVersion;
  });

  const handleReportGenerated = () => {
    refetch();
    setShowRegenerateOptions(false);
  };

  if (!currentVersion || currentVersion === 0) {
    return null;
  }

  return (
    <Card className={outdatedReports.length > 0 ? "border-amber-500 bg-amber-50/50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${outdatedReports.length > 0 ? "text-amber-500" : "text-green-500"}`} />
            <CardTitle>Report Status</CardTitle>
          </div>
          <Badge variant={outdatedReports.length > 0 ? "destructive" : "default"}>
            Tenant Version: {currentVersion}
          </Badge>
        </div>
        <CardDescription>
          {outdatedReports.length > 0 
            ? `${outdatedReports.length} report(s) generated with outdated tenant data`
            : "All reports are up to date with current tenant data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {latestTenantChange && (
          <p className="text-sm text-muted-foreground mb-4">
            Last tenant data change: {format(latestTenantChange, "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}

        {outdatedReports.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              {outdatedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{report.report_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Generated with tenant version {report.tenant_schedule_version || 0}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Outdated
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant={showRegenerateOptions ? "outline" : "default"}
                onClick={() => setShowRegenerateOptions(!showRegenerateOptions)}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {showRegenerateOptions ? "Cancel" : "Regenerate Reports"}
              </Button>
            </div>

            {showRegenerateOptions && (
              <div className="p-4 border rounded-lg bg-background space-y-3">
                <p className="text-sm font-medium">Generate new report with current tenant data:</p>
                <GeneratorReportExportPDFButton
                  projectId={projectId}
                  onReportSaved={handleReportGenerated}
                />
              </div>
            )}
          </div>
        )}

        {outdatedReports.length === 0 && reports.length > 0 && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            All {reports.length} report(s) are current
          </p>
        )}
      </CardContent>
    </Card>
  );
}
