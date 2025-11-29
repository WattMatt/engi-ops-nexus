import { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { TrendingUp, Zap, DollarSign, Activity, Gauge, BarChart3, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GeneratorOverviewProps {
  projectId: string;
}

export function GeneratorOverview({ projectId }: GeneratorOverviewProps) {
  // Fetch generator zones
  const { data: zones = [], refetch: refetchZones } = useQuery({
    queryKey: ["generator-zones-overview", projectId],
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

  // Fetch all saved settings
  const { data: allSettings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["running-recovery-settings-overview", projectId],
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

  // Fetch tenants to track kW overrides
  const { data: tenants = [], refetch: refetchTenants } = useQuery({
    queryKey: ["tenants-overview", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Memoize expensive KPI calculations to prevent recalculation on unrelated renders
  const metrics = useMemo(() => {
    if (zones.length === 0) return null;

    let totalCapacity = 0;
    let totalMonthlyEnergy = 0;
    let totalDieselCost = 0;
    let totalServicingCost = 0;
    let totalGenerators = 0;
    const zoneTariffs: number[] = [];

    zones.forEach((zone) => {
      const settings = allSettings.find(s => s.generator_zone_id === zone.id);
      if (!settings) return;

      const numGenerators = zone.num_generators || 1;
      totalGenerators += numGenerators;

      const netEnergyKVA = Number(settings.net_energy_kva);
      const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
      const fuelConsumptionRate = Number(settings.fuel_consumption_rate);
      const dieselPricePerLitre = Number(settings.diesel_price_per_litre);
      const servicingCostPerYear = Number(settings.servicing_cost_per_year);
      const servicingCostPer250Hours = Number(settings.servicing_cost_per_250_hours);
      const expectedHoursPerMonth = Number(settings.expected_hours_per_month);

      // Calculate capacity
      const zoneCapacity = netEnergyKVA * kvaToKwhConversion * numGenerators;
      totalCapacity += zoneCapacity;

      // Calculate monthly energy
      const monthlyEnergy = zoneCapacity * expectedHoursPerMonth;
      totalMonthlyEnergy += monthlyEnergy;

      // Calculate diesel cost
      const dieselCostPerHour = fuelConsumptionRate * dieselPricePerLitre * numGenerators;
      const monthlyDieselCost = dieselCostPerHour * expectedHoursPerMonth;
      totalDieselCost += monthlyDieselCost;

      // Calculate servicing cost
      const servicingCostPerMonth = servicingCostPerYear / 12;
      const servicingCostPerMonthByHours = (servicingCostPer250Hours / 250) * expectedHoursPerMonth;
      const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
      totalServicingCost += additionalServicingCost;

      // Calculate tariff
      const monthlyDieselCostPerKWh = zoneCapacity > 0 ? dieselCostPerHour / zoneCapacity : 0;
      const totalServicesCostPerKWh = monthlyEnergy > 0 ? additionalServicingCost / monthlyEnergy : 0;
      const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
      const maintenanceContingency = totalTariffBeforeContingency * 0.1;
      const zoneTariff = totalTariffBeforeContingency + maintenanceContingency;
      
      zoneTariffs.push(zoneTariff);
    });

    const averageTariff = zoneTariffs.length > 0 
      ? zoneTariffs.reduce((sum, t) => sum + t, 0) / zoneTariffs.length 
      : 0;

    const totalMonthlyCost = totalDieselCost + totalServicingCost;
    const contingencyCost = totalMonthlyCost * 0.1;
    const totalWithContingency = totalMonthlyCost + contingencyCost;
    const annualCost = totalWithContingency * 12;

    // Find best and worst performing zones
    const bestZoneIndex = zoneTariffs.indexOf(Math.min(...zoneTariffs));
    const worstZoneIndex = zoneTariffs.indexOf(Math.max(...zoneTariffs));
    const costVariance = zoneTariffs.length > 1 
      ? ((zoneTariffs[worstZoneIndex] - zoneTariffs[bestZoneIndex]) / zoneTariffs[bestZoneIndex] * 100)
      : 0;

    // Calculate utilization (assuming settings exist)
    const avgExpectedHours = allSettings.length > 0
      ? allSettings.reduce((sum, s) => sum + Number(s.expected_hours_per_month), 0) / allSettings.length
      : 0;
    const utilizationRate = (avgExpectedHours / 730) * 100; // 730 hours/month max

    return {
      averageTariff,
      totalCapacity,
      totalMonthlyEnergy,
      totalMonthlyCost,
      totalDieselCost,
      totalServicingCost,
      contingencyCost,
      annualCost,
      totalGenerators,
      numZones: zones.length,
      bestZoneName: zones[bestZoneIndex]?.zone_name || "N/A",
      worstZoneName: zones[worstZoneIndex]?.zone_name || "N/A",
      costVariance,
      utilizationRate,
      dieselPercentage: totalDieselCost > 0 ? (totalDieselCost / totalMonthlyCost * 100) : 0,
      servicingPercentage: totalServicingCost > 0 ? (totalServicingCost / totalMonthlyCost * 100) : 0,
      contingencyPercentage: contingencyCost > 0 ? (contingencyCost / totalWithContingency * 100) : 0,
    };
  }, [zones, allSettings]);

  // Set up real-time subscription for updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('generator-overview-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenants',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          refetchTenants();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generator_zones',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          refetchZones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'running_recovery_settings',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          refetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetchTenants, refetchZones, refetchSettings]);

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generator System Overview</CardTitle>
          <CardDescription>Summary of generator specifications and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No generator data available. Please configure your generators in the Settings tab.</p>
        </CardContent>
      </Card>
    );
  }

  // Check if we have zones but no settings
  const hasZonesWithoutSettings = zones.length > 0 && allSettings.length === 0;
  const hasZonesWithPartialSettings = zones.length > 0 && allSettings.length > 0 && allSettings.length < zones.length;

  return (
    <div className="space-y-6">
      {/* Warning Messages */}
      {hasZonesWithoutSettings && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">Running Recovery Settings Required</p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              You have {zones.length} generator zone{zones.length !== 1 ? 's' : ''} configured, but no running recovery settings have been set up yet.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              Please go to the <strong>Costs → Running Recovery</strong> tab to configure diesel prices, fuel consumption rates, and servicing costs for each zone to see accurate calculations.
            </p>
          </div>
        </div>
      )}

      {hasZonesWithPartialSettings && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900 dark:text-yellow-100">Some Zones Missing Settings</p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              You have {zones.length} generator zone{zones.length !== 1 ? 's' : ''} but only {allSettings.length} {allSettings.length === 1 ? 'has' : 'have'} running recovery settings configured.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              Please configure running recovery settings for all zones in the <strong>Costs → Running Recovery</strong> tab for accurate calculations.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI - Average Tariff */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-center text-xl">Average Recovery Tariff</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Theoretical Tariff at Full Capacity</p>
                  <p className="text-sm">This tariff assumes generators run at 100% capacity. In practice, generators typically operate at 50-75% load, which results in higher per-kWh costs. See the "Running Recovery" tab for real-world operating costs.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-center">Your primary pricing metric across all generators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-primary mb-2">
              R {metrics.averageTariff.toFixed(4)}
            </div>
            <p className="text-sm text-muted-foreground">per kWh (including 10% contingency)</p>
            <p className="text-xs text-muted-foreground mt-1 italic">Based on 100% generator capacity</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Financial Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Monthly Operating Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R {metrics.totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Diesel + Servicing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Annual Operating Cost</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R {metrics.annualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Projected yearly expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Fuel Costs</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.dieselPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">R {metrics.totalDieselCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.servicingPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">R {metrics.totalServicingCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">System Capacity</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalCapacity.toFixed(0)} kWh</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.totalGenerators} generator{metrics.totalGenerators !== 1 ? 's' : ''} ({metrics.numZones} zone{metrics.numZones !== 1 ? 's' : ''})</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Monthly Generation</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.totalMonthlyEnergy / 1000).toFixed(1)}k kWh</div>
              <p className="text-xs text-muted-foreground mt-1">Expected energy output</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.utilizationRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Average hours vs capacity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Contingency Buffer</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.contingencyPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">R {metrics.contingencyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Zone Comparison */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Zone Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best Performing Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.bestZoneName}</div>
              <p className="text-xs text-muted-foreground mt-1">Lowest tariff per kWh</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.costVariance.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Difference between zones</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cost Breakdown</CardTitle>
          <CardDescription>Distribution of operating expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Diesel Costs</span>
                <span className="font-semibold">R {metrics.totalDieselCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: `${metrics.dieselPercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Servicing Costs</span>
                <span className="font-semibold">R {metrics.totalServicingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${metrics.servicingPercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Contingency (10%)</span>
                <span className="font-semibold">R {metrics.contingencyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${metrics.contingencyPercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-bold">Total Monthly Cost</span>
                <span className="text-2xl font-bold">R {(metrics.totalMonthlyCost + metrics.contingencyCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
