import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin, Lightbulb, Zap, Sun, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleDashboardProps {
  projectId: string;
}

export function ScheduleDashboard({ projectId }: ScheduleDashboardProps) {
  // Fetch zones for this project
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ["lighting-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lighting_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch schedule items for this project
  const { data: scheduleItems, isLoading: scheduleLoading } = useQuery({
    queryKey: ["lighting-schedule-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_lighting_schedules")
        .select(`
          *,
          lighting_fittings (
            id,
            fitting_code,
            model_name,
            wattage,
            lumen_output
          )
        `)
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch tenants for this project to show coverage
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["project-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number, area")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = zonesLoading || scheduleLoading || tenantsLoading;

  // Calculate stats
  const totalZones = zones?.length || 0;
  const totalScheduleItems = scheduleItems?.length || 0;
  const totalFittingsQty = scheduleItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const totalWattage = scheduleItems?.reduce((sum, item) => {
    const wattage = item.lighting_fittings?.wattage || 0;
    return sum + (wattage * (item.quantity || 0));
  }, 0) || 0;
  const totalLumens = scheduleItems?.reduce((sum, item) => {
    const lumens = item.lighting_fittings?.lumen_output || 0;
    return sum + (lumens * (item.quantity || 0));
  }, 0) || 0;

  // Tenant coverage
  const totalTenants = tenants?.length || 0;
  const tenantsWithFittings = new Set(scheduleItems?.map(item => item.tenant_id).filter(Boolean)).size;
  const coveragePercent = totalTenants > 0 ? (tenantsWithFittings / totalTenants) * 100 : 0;

  // Zone stats
  const zonesWithFittings = new Set(scheduleItems?.map(item => item.zone_id).filter(Boolean)).size;
  const zoneCoveragePercent = totalZones > 0 ? (zonesWithFittings / totalZones) * 100 : 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones Defined</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalZones}</div>
            <p className="text-xs text-muted-foreground">
              {zonesWithFittings} with fittings assigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fittings</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFittingsQty}</div>
            <p className="text-xs text-muted-foreground">
              {totalScheduleItems} line items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Load</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalWattage >= 1000 
                ? `${(totalWattage / 1000).toFixed(1)} kW` 
                : `${totalWattage} W`}
            </div>
            <p className="text-xs text-muted-foreground">
              Connected load
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Output</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLumens >= 1000000 
                ? `${(totalLumens / 1000000).toFixed(1)} Mlm`
                : totalLumens >= 1000 
                  ? `${(totalLumens / 1000).toFixed(1)} klm`
                  : `${totalLumens} lm`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total luminous flux
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tenant Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {tenantsWithFittings} of {totalTenants} tenants
              </span>
              <span className="text-sm font-medium">{coveragePercent.toFixed(0)}%</span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
            {totalTenants === 0 && (
              <p className="text-xs text-muted-foreground">
                No tenants defined for this project yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Zone Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {zonesWithFittings} of {totalZones} zones
              </span>
              <span className="text-sm font-medium">{zoneCoveragePercent.toFixed(0)}%</span>
            </div>
            <Progress value={zoneCoveragePercent} className="h-2" />
            {totalZones === 0 && (
              <p className="text-xs text-muted-foreground">
                Define zones in the Zones tab to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${totalZones > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">1. Define Lighting Zones</p>
                <p className="text-sm text-muted-foreground">
                  Create zones like "Sales Floor", "Back of House", "Exterior" with lux requirements.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${totalScheduleItems > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">2. Assign Fittings</p>
                <p className="text-sm text-muted-foreground">
                  Select fittings from your library and assign them to zones or tenants.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2 bg-muted text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">3. Review & Export</p>
                <p className="text-sm text-muted-foreground">
                  Validate compliance and export schedules for documentation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
