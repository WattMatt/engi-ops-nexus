import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, FileText, Package } from "lucide-react";
import MallLayout from "./MallLayout";
import SiteDiary from "./SiteDiary";
import { TenantDialog } from "@/components/tenant/TenantDialog";
import { TenantList } from "@/components/tenant/TenantList";

const Dashboard = () => {
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: tenants = [], refetch: refetchTenants } = useQuery({
    queryKey: ["tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId)
        .order("shop_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const totalTenants = tenants.length;
  const sowReceived = tenants.filter(t => t.sow_received).length;
  const layoutReceived = tenants.filter(t => t.layout_received).length;
  const dbOrdered = tenants.filter(t => t.db_ordered).length;
  const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;

  const totalArea = tenants.reduce((sum, t) => sum + (Number(t.area) || 0), 0);
  const totalDbCost = tenants.reduce((sum, t) => sum + (Number(t.db_cost) || 0), 0);
  const totalLightingCost = tenants.reduce((sum, t) => sum + (Number(t.lighting_cost) || 0), 0);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mall-layout">Mall Layout</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Details</TabsTrigger>
          <TabsTrigger value="diary">Site Diary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SOW Received</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sowReceived}/{totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? Math.round((sowReceived / totalTenants) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Layouts Received</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{layoutReceived}/{totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? Math.round((layoutReceived / totalTenants) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB's Ordered</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dbOrdered}/{totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? Math.round((dbOrdered / totalTenants) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lighting Ordered</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lightingOrdered}/{totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {totalTenants > 0 ? Math.round((lightingOrdered / totalTenants) * 100) : 0}% complete
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Tenants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTenants}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Area</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalArea.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">sqm</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">DB:</span>
                    <span className="font-bold">R{totalDbCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Lighting:</span>
                    <span className="font-bold">R{totalLightingCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mall-layout">
          <MallLayout />
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tenant Details</CardTitle>
              <TenantDialog projectId={projectId!} onSuccess={refetchTenants} />
            </CardHeader>
            <CardContent>
              <TenantList tenants={tenants} projectId={projectId!} onUpdate={refetchTenants} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary">
          <SiteDiary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;