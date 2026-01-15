import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";

interface RunningRecoveryCalculatorProps {
  projectId: string;
}

interface ZoneSettings {
  generator_zone_id: string;
  plant_name: string;
  running_load: number;
  net_energy_kva: number;
  kva_to_kwh_conversion: number;
  fuel_consumption_rate: number;
  diesel_price_per_litre: number;
  servicing_cost_per_year: number;
  servicing_cost_per_250_hours: number;
  expected_hours_per_month: number;
}

export function RunningRecoveryCalculator({ projectId }: RunningRecoveryCalculatorProps) {
  const queryClient = useQueryClient();
  const [zoneSettings, setZoneSettings] = useState<Map<string, ZoneSettings>>(new Map());
  const [localInputs, setLocalInputs] = useState<Map<string, Partial<ZoneSettings>>>(new Map());
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Memoized function to get fuel consumption from sizing table
  const getFuelConsumption = useCallback((generatorSize: string, loadPercentage: number): number => {
    const sizingData = GENERATOR_SIZING_TABLE.find(g => g.rating === generatorSize);
    if (!sizingData) return 0;

    if (loadPercentage <= 25) return sizingData.load25;
    if (loadPercentage <= 50) {
      const ratio = (loadPercentage - 25) / 25;
      return sizingData.load25 + ratio * (sizingData.load50 - sizingData.load25);
    }
    if (loadPercentage <= 75) {
      const ratio = (loadPercentage - 50) / 25;
      return sizingData.load50 + ratio * (sizingData.load75 - sizingData.load50);
    }
    if (loadPercentage <= 100) {
      const ratio = (loadPercentage - 75) / 25;
      return sizingData.load75 + ratio * (sizingData.load100 - sizingData.load75);
    }
    return sizingData.load100;
  }, []);

  // Fetch all generator zones
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-running", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order")
        .limit(4);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch all saved settings for all zones
  const { data: allSettings = [] } = useQuery({
    queryKey: ["running-recovery-settings-all", projectId],
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

  // Initialize zone settings when zones and saved settings are loaded
  useEffect(() => {
    if (!zones.length) return;
    
    const initialSettings = new Map<string, ZoneSettings>();
    
    zones.forEach((zone) => {
      const savedSetting = allSettings.find(s => s.generator_zone_id === zone.id);
      
      if (savedSetting) {
        // Load saved settings
        initialSettings.set(zone.id, {
          generator_zone_id: zone.id,
          plant_name: savedSetting.plant_name,
          running_load: Number(savedSetting.running_load),
          net_energy_kva: Number(savedSetting.net_energy_kva),
          kva_to_kwh_conversion: Number(savedSetting.kva_to_kwh_conversion),
          fuel_consumption_rate: Number(savedSetting.fuel_consumption_rate),
          diesel_price_per_litre: Number(savedSetting.diesel_price_per_litre),
          servicing_cost_per_year: Number(savedSetting.servicing_cost_per_year),
          servicing_cost_per_250_hours: Number(savedSetting.servicing_cost_per_250_hours),
          expected_hours_per_month: Number(savedSetting.expected_hours_per_month),
        });
      } else {
        // Initialize with defaults
        const sizeMatch = zone.generator_size?.match(/(\d+)/);
        const kvaValue = sizeMatch ? Number(sizeMatch[1]) : 200; // Default to 200 kVA if no size set
        let fuelRate = getFuelConsumption(zone.generator_size || "", 75);
        
        // If no fuel rate found (generator size not in table), estimate based on kVA
        // Typical fuel consumption is approximately 0.25-0.35 L/kWh at 75% load
        if (fuelRate === 0) {
          // Use a conservative estimate: ~0.15 L per kVA at 75% load
          fuelRate = kvaValue * 0.15;
        }
        
        initialSettings.set(zone.id, {
          generator_zone_id: zone.id,
          plant_name: zone.zone_name,
          running_load: 75,
          net_energy_kva: kvaValue,
          kva_to_kwh_conversion: 0.95,
          fuel_consumption_rate: fuelRate,
          diesel_price_per_litre: 23.00,
          servicing_cost_per_year: 18800.00,
          servicing_cost_per_250_hours: 18800.00,
          expected_hours_per_month: 100,
        });
      }
    });
    
    // Only update if settings have actually changed to prevent infinite loops
    setZoneSettings(prev => {
      const hasChanged = prev.size !== initialSettings.size || 
        Array.from(initialSettings.entries()).some(([key, value]) => {
          const prevValue = prev.get(key);
          return !prevValue || JSON.stringify(prevValue) !== JSON.stringify(value);
        });
      
      return hasChanged ? initialSettings : prev;
    });
  }, [zones, allSettings, getFuelConsumption]);

  // Get display value (local input or saved setting)
  const getDisplayValue = (zoneId: string, field: keyof ZoneSettings): number | string => {
    const localValue = localInputs.get(zoneId)?.[field];
    if (localValue !== undefined) return localValue;
    return zoneSettings.get(zoneId)?.[field] ?? '';
  };

  // Update local input only (no calculations yet)
  const updateLocalInput = (zoneId: string, field: keyof ZoneSettings, value: number | string) => {
    setLocalInputs(prev => {
      const updated = new Map(prev);
      const current = updated.get(zoneId) || {};
      updated.set(zoneId, { ...current, [field]: value });
      return updated;
    });

    // Clear existing timeout for this zone
    const existingTimeout = saveTimeoutRef.current.get(zoneId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set timeout to commit changes after user stops typing
    const newTimeout = setTimeout(() => {
      commitChanges(zoneId);
    }, 1000);

    saveTimeoutRef.current.set(zoneId, newTimeout);
  };

  // Commit local changes to actual settings and save
  const commitChanges = (zoneId: string) => {
    const localChanges = localInputs.get(zoneId);
    if (!localChanges) return;

    let updatedSettings: ZoneSettings | undefined;
    
    setZoneSettings(prev => {
      const updated = new Map(prev);
      const current = updated.get(zoneId);
      if (current) {
        const newSettings = { ...current, ...localChanges };
        
        // Auto-update fuel consumption if running load changed
        if (localChanges.running_load !== undefined) {
          const zone = zones.find(z => z.id === zoneId);
          if (zone?.generator_size) {
            const fuelRate = getFuelConsumption(zone.generator_size, newSettings.running_load);
            newSettings.fuel_consumption_rate = fuelRate;
          }
        }
        
        updated.set(zoneId, newSettings);
        updatedSettings = newSettings;
      }
      return updated;
    });

    // Clear local inputs for this zone
    setLocalInputs(prev => {
      const updated = new Map(prev);
      updated.delete(zoneId);
      return updated;
    });

    // Save to database
    if (updatedSettings) {
      saveSingleZone(zoneId, updatedSettings);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      saveTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Save a single zone's settings
  const saveSingleZone = async (zoneId: string, settings: ZoneSettings) => {
    setPendingSaves(prev => new Set(prev).add(zoneId));
    
    try {
      const { error } = await supabase
        .from("running_recovery_settings")
        .upsert({
          project_id: projectId,
          generator_zone_id: settings.generator_zone_id,
          plant_name: settings.plant_name,
          running_load: settings.running_load,
          net_energy_kva: settings.net_energy_kva,
          kva_to_kwh_conversion: settings.kva_to_kwh_conversion,
          fuel_consumption_rate: settings.fuel_consumption_rate,
          diesel_price_per_litre: settings.diesel_price_per_litre,
          servicing_cost_per_year: settings.servicing_cost_per_year,
          servicing_cost_per_250_hours: settings.servicing_cost_per_250_hours,
          expected_hours_per_month: settings.expected_hours_per_month,
        }, {
          onConflict: "project_id,generator_zone_id"
        });

      if (error) throw error;

      // Invalidate queries to refresh all dependent data
      queryClient.invalidateQueries({ queryKey: ["running-recovery-settings-all"] });
      queryClient.invalidateQueries({ queryKey: ["running-recovery-settings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["running-recovery-settings-overview", projectId] });
      queryClient.invalidateQueries({ queryKey: ["generator-zones-overview", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tenants-overview", projectId] });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save changes");
    } finally {
      setPendingSaves(prev => {
        const updated = new Set(prev);
        updated.delete(zoneId);
        return updated;
      });
    }
  };


  // Memoize tariff calculation for a specific zone
  const calculateZoneTariff = useCallback((zoneId: string): number => {
    const settings = zoneSettings.get(zoneId);
    const zone = zones.find(z => z.id === zoneId);
    if (!settings || !zone) return 0;

    const numGenerators = zone.num_generators || 1;
    const netTotalEnergyKWh = settings.net_energy_kva * settings.kva_to_kwh_conversion * (settings.running_load / 100) * numGenerators;
    const monthlyEnergyKWh = netTotalEnergyKWh * settings.expected_hours_per_month;
    const totalDieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre * numGenerators;
    const monthlyDieselCostPerKWh = netTotalEnergyKWh > 0 ? totalDieselCostPerHour / netTotalEnergyKWh : 0;

    const servicingCostPerMonth = settings.servicing_cost_per_year / 12;
    const servicingCostPerMonthByHours = (settings.servicing_cost_per_250_hours / 250) * settings.expected_hours_per_month;
    const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth) * numGenerators;
    const totalServicesCostPerKWh = monthlyEnergyKWh > 0 ? additionalServicingCost / monthlyEnergyKWh : 0;

    const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
    const maintenanceContingency = totalTariffBeforeContingency * 0.1;
    
    return totalTariffBeforeContingency + maintenanceContingency;
  }, [zoneSettings, zones]);

  // Memoize expanded generators to prevent recalculation on unrelated renders
  const expandedGenerators = useMemo(() => {
    return zones.flatMap(zone => {
      const numGenerators = zone.num_generators || 1;
      return Array.from({ length: numGenerators }, (_, index) => ({
        zoneId: zone.id,
        zoneName: zone.zone_name,
        generatorSize: zone.generator_size,
        generatorIndex: index + 1,
        totalInZone: numGenerators,
      }));
    }).slice(0, 4); // Limit to 4 generators
  }, [zones]);

  // Memoize average tariff calculation
  const averageTariff = useMemo(() => {
    const tariffs = zones.map(zone => calculateZoneTariff(zone.id)).filter(t => t > 0);
    if (tariffs.length === 0) return 0;
    return tariffs.reduce((sum, t) => sum + t, 0) / tariffs.length;
  }, [zones, calculateZoneTariff]);

  const totalGenerators = expandedGenerators.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Running Recovery Calculator</CardTitle>
              <CardDescription>Enter values and they'll save automatically after you stop typing</CardDescription>
            </div>
            {pendingSaves.size > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                Saving...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 font-bold">Parameter</TableHead>
                {expandedGenerators.map((gen, idx) => (
                  <TableHead key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-bold">
                    Generator {idx + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Zone Information */}
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Zone Name</TableCell>
                {expandedGenerators.map((gen) => (
                  <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">
                    {gen.zoneName} (Unit {gen.generatorIndex})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Generator Size</TableCell>
                {expandedGenerators.map((gen) => (
                  <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">
                    {gen.generatorSize}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Synchronized Pair</TableCell>
                {expandedGenerators.map((gen) => (
                  <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">
                    {gen.totalInZone > 1 ? `Yes (${gen.totalInZone} units)` : 'No'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Section Header */}
              <TableRow className="bg-primary/10">
                <TableCell colSpan={5} className="text-center font-bold text-primary">
                  INPUT PARAMETERS
                </TableCell>
              </TableRow>

              {/* Running Load */}
              <TableRow>
                <TableCell className="font-medium">Running Load (%)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={getDisplayValue(zone.id, 'running_load')}
                        onChange={(e) => updateLocalInput(zone.id, 'running_load', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="0"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Net Energy kVA */}
              <TableRow>
                <TableCell className="font-medium">Net Energy (kVA)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={getDisplayValue(zone.id, 'net_energy_kva')}
                        onChange={(e) => updateLocalInput(zone.id, 'net_energy_kva', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="0"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* kVA to kWh Conversion */}
              <TableRow>
                <TableCell className="font-medium">kVA to kWh Factor</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={getDisplayValue(zone.id, 'kva_to_kwh_conversion')}
                        onChange={(e) => updateLocalInput(zone.id, 'kva_to_kwh_conversion', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="0.95"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Fuel Consumption Rate */}
              <TableRow>
                <TableCell className="font-medium">Fuel Rate (L/h per unit)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings?.fuel_consumption_rate.toFixed(2) || 0}
                        disabled
                        className="text-center bg-muted"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Diesel Price */}
              <TableRow>
                <TableCell className="font-medium">Diesel Price (R/L)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getDisplayValue(zone.id, 'diesel_price_per_litre')}
                        onChange={(e) => updateLocalInput(zone.id, 'diesel_price_per_litre', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="23.00"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Servicing Cost Per Year */}
              <TableRow>
                <TableCell className="font-medium">Servicing Cost/Year (R)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getDisplayValue(zone.id, 'servicing_cost_per_year')}
                        onChange={(e) => updateLocalInput(zone.id, 'servicing_cost_per_year', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="18800.00"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Servicing Cost Per 250 Hours */}
              <TableRow>
                <TableCell className="font-medium">Servicing Cost/250h (R)</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getDisplayValue(zone.id, 'servicing_cost_per_250_hours')}
                        onChange={(e) => updateLocalInput(zone.id, 'servicing_cost_per_250_hours', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="18800.00"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Expected Hours Per Month */}
              <TableRow>
                <TableCell className="font-medium">Expected Hours/Month</TableCell>
                {zones.slice(0, 2).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  const numGenerators = zone.num_generators || 1;
                  return (
                    <TableCell key={zone.id} colSpan={numGenerators} className="text-center">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={getDisplayValue(zone.id, 'expected_hours_per_month')}
                        onChange={(e) => updateLocalInput(zone.id, 'expected_hours_per_month', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-center"
                        placeholder="100"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Section Header */}
              <TableRow className="bg-primary/10">
                <TableCell colSpan={5} className="text-center font-bold text-primary">
                  CALCULATED VALUES
                </TableCell>
              </TableRow>

              {/* Total Energy Capacity */}
              <TableRow>
                <TableCell className="font-medium">Total Energy (kWh)</TableCell>
                {expandedGenerators.map((gen) => {
                  const settings = zoneSettings.get(gen.zoneId);
                  if (!settings) return <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">-</TableCell>;
                  const totalEnergy = settings.net_energy_kva * settings.kva_to_kwh_conversion * (settings.running_load / 100);
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-semibold">
                      {totalEnergy.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Energy */}
              <TableRow>
                <TableCell className="font-medium">Monthly Energy (kWh)</TableCell>
                {expandedGenerators.map((gen) => {
                  const settings = zoneSettings.get(gen.zoneId);
                  if (!settings) return <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">-</TableCell>;
                  const totalEnergy = settings.net_energy_kva * settings.kva_to_kwh_conversion * (settings.running_load / 100);
                  const monthlyEnergy = totalEnergy * settings.expected_hours_per_month;
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-semibold">
                      {monthlyEnergy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Diesel Cost Per Hour */}
              <TableRow>
                <TableCell className="font-medium">Diesel Cost/Hour (R)</TableCell>
                {expandedGenerators.map((gen) => {
                  const settings = zoneSettings.get(gen.zoneId);
                  if (!settings) return <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">-</TableCell>;
                  const dieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre;
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-semibold">
                      R {dieselCostPerHour.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Diesel Cost */}
              <TableRow>
                <TableCell className="font-medium">Monthly Diesel Cost (R)</TableCell>
                {expandedGenerators.map((gen) => {
                  const settings = zoneSettings.get(gen.zoneId);
                  if (!settings) return <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">-</TableCell>;
                  const dieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre;
                  const monthlyDieselCost = dieselCostPerHour * settings.expected_hours_per_month;
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-semibold">
                      R {monthlyDieselCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Servicing Cost */}
              <TableRow>
                <TableCell className="font-medium">Monthly Servicing Cost (R)</TableCell>
                {expandedGenerators.map((gen) => {
                  const settings = zoneSettings.get(gen.zoneId);
                  if (!settings) return <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center">-</TableCell>;
                  const servicingCostPerMonth = settings.servicing_cost_per_year / 12;
                  const servicingCostPerMonthByHours = (settings.servicing_cost_per_250_hours / 250) * settings.expected_hours_per_month;
                  const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-semibold">
                      R {additionalServicingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Tariff Per kWh */}
              <TableRow className="bg-accent">
                <TableCell className="font-bold text-lg">TARIFF PER kWh (R)</TableCell>
                {expandedGenerators.map((gen) => {
                  const tariff = calculateZoneTariff(gen.zoneId);
                  return (
                    <TableCell key={`${gen.zoneId}-${gen.generatorIndex}`} className="text-center font-bold text-lg">
                      R {tariff.toFixed(4)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Average Tariff Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-center text-2xl">Average Recovery Tariff</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Real-World Operating Tariff</p>
                  <p className="text-sm mb-2">This tariff is calculated based on your actual running load settings (typically 50-75%). Since diesel costs remain constant while energy output decreases at partial load, the per-kWh cost is higher than theoretical full-capacity rates.</p>
                  <p className="text-sm font-semibold">Example:</p>
                  <p className="text-xs">• 100% load: R100/hr ÷ 1000 kWh = R0.100/kWh</p>
                  <p className="text-xs">• 75% load: R100/hr ÷ 750 kWh = R0.133/kWh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-center">
            Average tariff across {totalGenerators} generator{totalGenerators !== 1 ? 's' : ''} ({zones.length} synchronized pair{zones.length !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">
              R {averageTariff.toFixed(4)}
            </div>
            <div className="text-sm text-muted-foreground">
              per kWh (including 10% contingency)
            </div>
            <p className="text-xs text-muted-foreground mt-1 italic">Based on actual running load settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
