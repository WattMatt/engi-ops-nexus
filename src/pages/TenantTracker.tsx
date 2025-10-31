import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenantList } from "@/components/tenant/TenantList";
import { TenantDialog } from "@/components/tenant/TenantDialog";
import { DBSizingRulesSettings } from "@/components/tenant/DBSizingRulesSettings";
import { FloorPlanMasking } from "@/components/tenant/FloorPlanMasking";
import { TenantOverview } from "@/components/tenant/TenantOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Schedule</TabsTrigger>
          <TabsTrigger value="floor-plan">Floor Plan Masking</TabsTrigger>
          <TabsTrigger value="settings">DB Sizing Rules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <TenantOverview tenants={tenants} />
          )}
        </TabsContent>
        
        <TabsContent value="tenants" className="mt-4 space-y-4">
          <div className="bg-background border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">Legend:</span>
              <Badge variant="outline" className="bg-blue-500 text-white border-blue-600">
                Standard
              </Badge>
              <Badge variant="outline" className="bg-red-500 text-white border-red-600">
                Fast Food
              </Badge>
              <Badge variant="outline" className="bg-emerald-500 text-white border-emerald-600">
                Restaurant
              </Badge>
              <Badge variant="outline" className="bg-purple-600 text-white border-purple-700">
                National
              </Badge>
            </div>
          </div>
          
          <div className="h-[calc(100vh-280px)] overflow-y-auto border rounded-lg">
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
        </TabsContent>
        
        <TabsContent value="floor-plan" className="mt-4">
          <FloorPlanMasking projectId={projectId || ""} />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-4">
          <DBSizingRulesSettings projectId={projectId || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantTracker;
