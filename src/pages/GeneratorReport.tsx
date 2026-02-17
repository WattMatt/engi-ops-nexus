import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GeneratorTenantList } from "@/components/tenant/GeneratorTenantList";
import { GeneratorSizingTable } from "@/components/tenant/GeneratorSizingTable";
import { RunningRecoveryCalculator } from "@/components/tenant/RunningRecoveryCalculator";
import { CapitalRecoveryCalculator } from "@/components/tenant/CapitalRecoveryCalculator";
import { GeneratorLoadingSettings } from "@/components/tenant/GeneratorLoadingSettings";
import { GeneratorCostingSection } from "@/components/tenant/GeneratorCostingSection";
import { GeneratorOverview } from "@/components/tenant/GeneratorOverview";
import { GeneratorReportExportPDFButton } from "@/components/tenant/GeneratorReportExportPDFButton";
import { GeneratorSavedReportsList } from "@/components/tenant/GeneratorSavedReportsList";
import { OutdatedReportsIndicator } from "@/components/tenant/OutdatedReportsIndicator";
import { TenantVersionBadge } from "@/components/tenant/TenantVersionBadge";
import { KwOverrideAuditLog } from "@/components/tenant/KwOverrideAuditLog";
import { LoadDistributionChart } from "@/components/tenant/charts/EnhancedLoadDistributionChart";
import { CostBreakdownChart } from "@/components/tenant/charts/EnhancedCostBreakdownChart";
import { RecoveryProjectionChart } from "@/components/tenant/charts/EnhancedRecoveryProjectionChart";
import { ShareGeneratorReportDialog } from "@/components/generator/ShareGeneratorReportDialog";
import { GeneratorShareHistory } from "@/components/generator/GeneratorShareHistory";
import { ChevronDown, Share2 } from "lucide-react";

const GeneratorReport = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const queryClient = useQueryClient();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reportsRefreshTrigger, setReportsRefreshTrigger] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Fetch project name
  const { data: projectData } = useQuery({
    queryKey: ["project-name", projectId],
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

  const { data: tenants = [], isLoading, refetch } = useQuery({
    queryKey: ["generator-tenants", projectId, refreshTrigger],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      
      // Sort shop numbers numerically
      return (data || []).sort((a, b) => {
        const matchA = a.shop_number.match(/\d+/);
        const matchB = b.shop_number.match(/\d+/);
        
        const numA = matchA ? parseInt(matchA[0]) : 0;
        const numB = matchB ? parseInt(matchB[0]) : 0;
        
        if (numA !== numB) {
          return numA - numB;
        }
        
        return a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
      });
    },
    enabled: !!projectId,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get zone IDs for dependent query
  const zoneIds = zones.map(z => z.id);

  // Fetch actual generator costs from zone_generators table
  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["zone-generators-report", projectId, zoneIds],
    queryFn: async () => {
      if (!zoneIds.length) return [];
      
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zoneIds.length > 0,
  });

  const { data: generatorSettings } = useQuery({
    queryKey: ["generator-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: allSettings = [] } = useQuery({
    queryKey: ["running-recovery-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("running_recovery_settings")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Calculate chart data
  const calculateLoading = (tenant: any) => {
    if (!tenant.area || tenant.own_generator_provided) return 0;
    
    const kwPerSqm = {
      standard: generatorSettings?.standard_kw_per_sqm || 0.03,
      fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
      restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
      national: generatorSettings?.national_kw_per_sqm || 0.03,
    };
    
    return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
  };

  const zoneLoadingData = zones.map(zone => {
    const loading = tenants
      .filter(t => t.generator_zone_id === zone.id && !t.own_generator_provided)
      .reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
    
    return {
      id: zone.id,
      zone_name: zone.zone_name,
      loading,
    };
  });

  // Calculate total generator cost from zone_generators table (matching GeneratorCostingSection)
  const totalGeneratorCost = zoneGenerators.reduce((sum, gen) => {
    return sum + (Number(gen.generator_cost) || 0);
  }, 0);

  const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
  const ratePerTenantDB = generatorSettings?.rate_per_tenant_db || 0;
  const tenantDBsCost = numTenantDBs * ratePerTenantDB;
  
  const numMainBoards = generatorSettings?.num_main_boards || 0;
  const ratePerMainBoard = generatorSettings?.rate_per_main_board || 0;
  const mainBoardsCost = numMainBoards * ratePerMainBoard;
  
  const additionalCablingCost = generatorSettings?.additional_cabling_cost || 0;
  const controlWiringCost = generatorSettings?.control_wiring_cost || 0;
  
  const totalCapitalCost = totalGeneratorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;
  
  // Calculate capital recovery - use saved settings or defaults
  const years = generatorSettings?.capital_recovery_period_years || 10;
  const rate = (generatorSettings?.capital_recovery_rate_percent || 12) / 100;
  const numerator = rate * Math.pow(1 + rate, years);
  const denominator = Math.pow(1 + rate, years) - 1;
  const annualRepayment = totalCapitalCost * (numerator / denominator);
  const monthlyCapitalRepayment = annualRepayment / 12;

  // Calculate total monthly running recovery from all settings
  const monthlyRunningRecovery = allSettings.reduce((sum, setting) => {
    const zone = zones.find(z => z.id === setting.generator_zone_id);
    const numGenerators = zone?.num_generators || 1;
    
    // Monthly diesel cost
    const dieselCostPerHour = setting.fuel_consumption_rate * setting.diesel_price_per_litre;
    const monthlyDieselCost = dieselCostPerHour * setting.expected_hours_per_month * numGenerators;
    
    // Monthly servicing cost
    const servicingCostPerMonth = setting.servicing_cost_per_year / 12;
    const servicingCostPerMonthByHours = (setting.servicing_cost_per_250_hours / 250) * setting.expected_hours_per_month;
    const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth) * numGenerators;
    
    // Total monthly cost for this zone
    const totalMonthlyCost = monthlyDieselCost + additionalServicingCost;
    
    // Add 10% contingency
    return sum + (totalMonthlyCost * 1.1);
  }, 0);

  const handleUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Set up real-time subscription for tenant updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('generator-tenants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenants',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetch]);

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Generator Report</h1>
            {projectId && <TenantVersionBadge projectId={projectId} />}
          </div>
          <p className="text-muted-foreground mt-2">
            Comprehensive generator analysis and cost recovery planning
          </p>
        </div>
        {projectId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Report
            </Button>
            <GeneratorReportExportPDFButton 
              projectId={projectId} 
              onReportSaved={() => {
                queryClient.invalidateQueries({ queryKey: ["generator-reports", projectId] });
                queryClient.invalidateQueries({ queryKey: ["generator-reports-versions", projectId] });
                setReportsRefreshTrigger(prev => prev + 1);
              }}
            />
          </div>
        )}
      </div>

      {projectId && (
        <ShareGeneratorReportDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          projectId={projectId}
          projectName={projectId}
        />
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="tenant-schedule">Tenant Schedule</TabsTrigger>
          <TabsTrigger value="sizing">Generator Sizing & Consumption</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="charts">Charts & Analysis</TabsTrigger>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
          <TabsTrigger value="saved-reports">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {projectId && <GeneratorOverview projectId={projectId} />}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {projectId && <GeneratorLoadingSettings projectId={projectId} />}
        </TabsContent>

        <TabsContent value="tenant-schedule" className="space-y-4">
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
          
          <div className="h-[calc(100vh-320px)] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading tenants...</p>
              </div>
            ) : (
              <GeneratorTenantList 
                tenants={tenants} 
                capitalCostRecovery={monthlyCapitalRepayment}
                onUpdate={() => refetch()}
                projectId={projectId}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sizing" className="space-y-4">
          <GeneratorSizingTable projectId={projectId || undefined} />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="space-y-4">
            {projectId && <GeneratorCostingSection projectId={projectId} />}
            
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Capital Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <CapitalRecoveryCalculator projectId={projectId} />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Running Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RunningRecoveryCalculator projectId={projectId} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadDistributionChart zones={zoneLoadingData} />
            <CostBreakdownChart 
              costs={{
                generatorCost: totalGeneratorCost,
                tenantDBsCost,
                mainBoardsCost,
                additionalCablingCost,
                controlWiringCost,
              }}
            />
          </div>
          <RecoveryProjectionChart 
            monthlyCapitalRecovery={monthlyCapitalRepayment}
            monthlyRunningRecovery={monthlyRunningRecovery}
          />
        </TabsContent>

        <TabsContent value="audit-log" className="space-y-4">
          {projectId && <KwOverrideAuditLog projectId={projectId} />}
        </TabsContent>

        <TabsContent value="saved-reports" className="space-y-4">
          {projectId && (
            <>
              <OutdatedReportsIndicator projectId={projectId} />
              <GeneratorSavedReportsList 
                key={reportsRefreshTrigger} 
                projectId={projectId} 
              />
              <GeneratorShareHistory projectId={projectId} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorReport;
