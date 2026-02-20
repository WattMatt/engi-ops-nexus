import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenantList } from "@/components/tenant/TenantList";
import { TenantDialog } from "@/components/tenant/TenantDialog";
import { ImportTenantsDialog } from "@/components/tenant/ImportTenantsDialog";
import { ImportTenantsFromBudget } from "@/components/tenant/ImportTenantsFromBudget";
import { DBSizingRulesSettings } from "@/components/tenant/DBSizingRulesSettings";
import { FloorPlanMasking } from "@/components/tenant/FloorPlanMasking";
import { TenantOverview } from "@/components/tenant/TenantOverview";
import { TenantReportGenerator } from "@/components/tenant/TenantReportGenerator";
import { SavedReportsList } from "@/components/tenant/SavedReportsList";
import { TenantChangeAuditLog } from "@/components/tenant/TenantChangeAuditLog";
import { OutdatedReportsIndicator } from "@/components/tenant/OutdatedReportsIndicator";
import { TenantVersionBadge } from "@/components/tenant/TenantVersionBadge";
import { TenantDocumentsTab } from "@/components/tenant/TenantDocumentsTab";
import { TenantEvaluationTab } from "@/components/tenant/evaluation/TenantEvaluationTab";
import { TenantQCTab } from "@/components/tenant/TenantQCTab";
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

  const { data: tenants = [], isLoading, refetch } = useQuery({
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

  // Real-time subscription for tenant changes
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('tenants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenants',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Only refetch on INSERT and DELETE to add/remove tenants
          // UPDATE events are handled by optimistic updates in TenantList
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetch]);

  const handleUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="border-b bg-background">
        <div className="flex justify-between items-center px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Tenant Tracker</h1>
              {projectId && <TenantVersionBadge projectId={projectId} />}
            </div>
            <p className="text-muted-foreground mt-1">{projectName || "No project selected"}</p>
          </div>
          <div className="flex gap-2">
            <ImportTenantsDialog projectId={projectId || ""} onSuccess={handleUpdate} />
            <ImportTenantsFromBudget projectId={projectId || ""} onSuccess={handleUpdate} />
            <TenantReportGenerator 
              tenants={tenants} 
              projectId={projectId || ""} 
              projectName={projectName || "Project"} 
            />
            <TenantDialog projectId={projectId || ""} onSuccess={handleUpdate} />
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-background px-6 flex-shrink-0">
            <TabsList className="my-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="tenants">Tenant Schedule</TabsTrigger>
              <TabsTrigger value="qc-inspections">QC Inspections</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="report-status">Report Status</TabsTrigger>
              <TabsTrigger value="change-history">Change History</TabsTrigger>
              <TabsTrigger value="floor-plan">Floor Plan Masking</TabsTrigger>
              <TabsTrigger value="settings">DB Sizing Rules</TabsTrigger>
              <TabsTrigger value="reports">Saved Reports</TabsTrigger>
            </TabsList>

            {/* Documents View Toggle - only shown when on documents tab */}
            {activeTab === "documents" && (
              <div className="flex gap-2 pb-3">
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
          </div>

          {/* Tab Content - No outer scroll, each tab manages its own */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading data...</p>
                  </div>
                ) : (
                  <TenantOverview tenants={tenants} projectId={projectId || ""} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="evaluation" className="h-full m-0 data-[state=active]:block">
              <TenantEvaluationTab
                tenants={tenants}
                projectId={projectId || ""}
                projectName={projectName || "Project"}
              />
            </TabsContent>
            
            <TabsContent value="tenants" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col gap-4">
              <div className="bg-background border rounded-lg p-4 shadow-sm flex-shrink-0 mx-6">
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
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading tenants...</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 px-6 max-w-full overflow-hidden">
                  <TenantList
                    tenants={tenants}
                    projectId={projectId || ""}
                    onUpdate={handleUpdate}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="qc-inspections" className="h-full m-0 data-[state=active]:block">
              <TenantQCTab projectId={projectId || ""} tenants={tenants} />
            </TabsContent>
            
            <TabsContent value="documents" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                <TenantDocumentsTab 
                  projectId={projectId || ""} 
                  tenants={tenants}
                  activeView={documentsView}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="report-status" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                {projectId && <OutdatedReportsIndicator projectId={projectId} />}
              </div>
            </TabsContent>
            
            <TabsContent value="change-history" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                {projectId && <TenantChangeAuditLog projectId={projectId} />}
              </div>
            </TabsContent>
            
            <TabsContent value="reports" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                <SavedReportsList 
                  projectId={projectId || ""} 
                  projectName={projectName || undefined}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="floor-plan" className="h-full m-0 data-[state=active]:block">
              <div className="h-full">
                <FloorPlanMasking 
                  key={`floor-plan-${activeTab === 'floor-plan' ? Date.now() : 'cached'}`}
                  projectId={projectId || ""}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0 data-[state=active]:block">
              <div className="h-full overflow-auto px-6 py-6">
                <DBSizingRulesSettings projectId={projectId || ""} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default TenantTracker;
