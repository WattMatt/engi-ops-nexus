import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenantList } from "@/components/tenant/TenantList";
import { TenantDialog } from "@/components/tenant/TenantDialog";

const TenantTracker = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const projectName = localStorage.getItem("currentProjectName");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants", projectId, refreshTrigger],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      
      // Sort shop numbers numerically (handles "Shop 77", "Shop 27/28", "Shop 66A" formats)
      return (data || []).sort((a, b) => {
        // Extract first number from strings like "Shop 77", "Shop 27/28" or "Shop 66A"
        const matchA = a.shop_number.match(/\d+/);
        const matchB = b.shop_number.match(/\d+/);
        
        const numA = matchA ? parseInt(matchA[0]) : 0;
        const numB = matchB ? parseInt(matchB[0]) : 0;
        
        // Sort numerically by first number
        if (numA !== numB) {
          return numA - numB;
        }
        
        // If first numbers are equal (e.g., "Shop 66" vs "Shop 66A"), sort alphabetically
        return a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
      });
    },
    enabled: !!projectId,
  });

  const handleUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Tracker</h1>
          <p className="text-muted-foreground mt-1">{projectName || "No project selected"}</p>
        </div>
        <TenantDialog projectId={projectId || ""} onSuccess={handleUpdate} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      ) : (
        <TenantList
          tenants={tenants}
          projectId={projectId || ""}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default TenantTracker;
