import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { GeneratorTenantList } from "@/components/tenant/GeneratorTenantList";
import { GeneratorSizingTable } from "@/components/tenant/GeneratorSizingTable";
import { RunningRecoveryCalculator } from "@/components/tenant/RunningRecoveryCalculator";
import { CapitalRecoveryCalculator } from "@/components/tenant/CapitalRecoveryCalculator";
import { ChevronDown } from "lucide-react";

const GeneratorReport = () => {
  const projectId = localStorage.getItem("selectedProjectId");
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

  const handleUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Generator Report</h1>
        <p className="text-muted-foreground">
          Comprehensive generator analysis and cost recovery planning
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenant-schedule">Tenant Schedule</TabsTrigger>
          <TabsTrigger value="sizing">Generator Sizing & Consumption</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generator System Overview</CardTitle>
              <CardDescription>Summary of generator specifications and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Overview content will be displayed here.</p>
            </CardContent>
          </Card>
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
              <GeneratorTenantList tenants={tenants} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sizing" className="space-y-4">
          <GeneratorSizingTable />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="space-y-4">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Capital Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <CapitalRecoveryCalculator />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <h3 className="text-lg font-semibold">Running Recovery</h3>
                <ChevronDown className="h-5 w-5 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RunningRecoveryCalculator />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorReport;
