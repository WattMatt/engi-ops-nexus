import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TenantVersionBadgeProps {
  projectId: string;
}

export function TenantVersionBadge({ projectId }: TenantVersionBadgeProps) {
  const { data: currentVersion, isLoading } = useQuery({
    queryKey: ["current-tenant-version-badge", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_current_tenant_schedule_version", { p_project_id: projectId });
      return data || 0;
    },
    enabled: !!projectId,
  });

  const { data: latestChange } = useQuery({
    queryKey: ["latest-version-info", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_schedule_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!projectId && !!currentVersion && currentVersion > 0,
  });

  if (isLoading || !currentVersion) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 cursor-help">
            <InfoIcon className="h-3 w-3" />
            Tenant Schedule v{currentVersion}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Tenant Schedule Version {currentVersion}</p>
            {latestChange && (
              <p className="text-muted-foreground mt-1">
                {latestChange.change_summary}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Reports generated with older versions may be outdated
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
