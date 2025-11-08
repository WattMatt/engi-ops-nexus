import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenantList } from "@/components/tenant/TenantList";
import { TenantDialog } from "@/components/tenant/TenantDialog";
import { DBSizingRulesSettings } from "@/components/tenant/DBSizingRulesSettings";
import { FloorPlanMasking } from "@/components/tenant/FloorPlanMasking";
import { TenantOverview } from "@/components/tenant/TenantOverview";
import { TenantReportGenerator } from "@/components/tenant/TenantReportGenerator";
import { SavedReportsList } from "@/components/tenant/SavedReportsList";
import { TenantChangeAuditLog } from "@/components/tenant/TenantChangeAuditLog";
import { OutdatedReportsIndicator } from "@/components/tenant/OutdatedReportsIndicator";
import { TenantVersionBadge } from "@/components/tenant/TenantVersionBadge";
import { TenantDocumentsTab } from "@/components/tenant/TenantDocumentsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TenantTracker = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [documentsView, setDocumentsView] = useState<"by-tenant" | "status-report">("by-tenant");

  // Fetch project name from database
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const projectName = projectData?.name || "Project";

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
    <div className="h-full flex flex-col p-4 md:p-8 pt-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Tenant Tracker</h1>
            {projectId && <TenantVersionBadge projectId={projectId} />}
          </div>
          <p className="text-muted-foreground mt-1">{projectName || "No project selected"}</p>
        </div>
        <div className="flex gap-2">
          <TenantReportGenerator 
            tenants={tenants} 
            projectId={projectId || ""} 
            projectName={projectName || "Project"} 
          />
          <TenantDialog projectId={projectId || ""} onSuccess={handleUpdate} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Schedule</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="report-status">Report Status</TabsTrigger>
          <TabsTrigger value="change-history">Change History</TabsTrigger>
          <TabsTrigger value="floor-plan">Floor Plan Masking</TabsTrigger>
          <TabsTrigger value="settings">DB Sizing Rules</TabsTrigger>
          <TabsTrigger value="reports">Saved Reports</TabsTrigger>
        </TabsList>

        {/* Documents View Toggle - only shown when on documents tab */}
        {activeTab === "documents" && (
          <div className="flex gap-2 mt-4 flex-shrink-0">
            <Button
              variant={documentsView === "by-tenant" ? "default" : "outline"}
              onClick={() => setDocumentsView("by-tenant")}
              size="sm"
            >
              By Tenant
            </Button>
            <Button
              variant={documentsView === "status-report" ? "default" : "outline"}
              onClick={() => setDocumentsView("status-report")}
              size="sm"
            >
              Status Report
            </Button>
          </div>
        )}
        
        <TabsContent value="overview" className="flex-1 overflow-auto pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <TenantOverview tenants={tenants} />
          )}
        </TabsContent>
        
        <TabsContent value="tenants" className="flex-1 overflow-auto pr-4 space-y-4">
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
          
          <div className="border rounded-lg">
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
        
        <TabsContent value="documents" className="flex-1 overflow-auto">
          <TenantDocumentsTab 
            projectId={projectId || ""} 
            tenants={tenants}
            activeView={documentsView}
          />
        </TabsContent>
        
        <TabsContent value="report-status" className="flex-1 overflow-auto pr-4">
          {projectId && <OutdatedReportsIndicator projectId={projectId} />}
        </TabsContent>
        
        <TabsContent value="change-history" className="flex-1 overflow-auto pr-4">
          {projectId && <TenantChangeAuditLog projectId={projectId} />}
        </TabsContent>
        
        <TabsContent value="reports" className="flex-1 overflow-auto pr-4">
          <SavedReportsList 
            projectId={projectId || ""} 
            projectName={projectName || undefined}
          />
        </TabsContent>
        
        <TabsContent value="floor-plan" className="flex-1 overflow-hidden pr-4">
          <FloorPlanMasking 
            key={`floor-plan-${activeTab === 'floor-plan' ? Date.now() : 'cached'}`}
            projectId={projectId || ""} 
          />
        </TabsContent>
        
        <TabsContent value="settings" className="flex-1 overflow-auto pr-4">
          <DBSizingRulesSettings projectId={projectId || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantTracker;
