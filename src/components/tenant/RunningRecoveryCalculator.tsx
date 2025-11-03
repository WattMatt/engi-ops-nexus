import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

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
  const [isEditing, setIsEditing] = useState(false);
  const [zoneSettings, setZoneSettings] = useState<Map<string, ZoneSettings>>(new Map());

  // Function to get fuel consumption from sizing table
  const getFuelConsumption = (generatorSize: string, loadPercentage: number): number => {
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
  };

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
        const kvaValue = sizeMatch ? Number(sizeMatch[1]) : 1200;
        const fuelRate = getFuelConsumption(zone.generator_size || "", 75);
        
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
    
    setZoneSettings(initialSettings);
  }, [zones, allSettings]);

  // Update individual zone setting
  const updateZoneSetting = (zoneId: string, field: keyof ZoneSettings, value: number | string) => {
    setZoneSettings(prev => {
      const updated = new Map(prev);
      const current = updated.get(zoneId);
      if (current) {
        updated.set(zoneId, { ...current, [field]: value });
        
        // Auto-update fuel consumption when running load changes
        if (field === 'running_load' && isEditing) {
          const zone = zones.find(z => z.id === zoneId);
          if (zone?.generator_size) {
            const fuelRate = getFuelConsumption(zone.generator_size, value as number);
            updated.set(zoneId, { ...updated.get(zoneId)!, fuel_consumption_rate: fuelRate });
          }
        }
      }
      return updated;
    });
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const settingsArray = Array.from(zoneSettings.values()).map(settings => ({
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
      }));

      const { error } = await supabase
        .from("running_recovery_settings")
        .upsert(settingsArray, {
          onConflict: "project_id,generator_zone_id"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["running-recovery-settings-all"] });
      toast.success("Settings saved successfully");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload settings from saved data
    const initialSettings = new Map<string, ZoneSettings>();
    zones.forEach((zone) => {
      const savedSetting = allSettings.find(s => s.generator_zone_id === zone.id);
      if (savedSetting) {
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
      }
    });
    setZoneSettings(initialSettings);
  };

  // Calculate tariff for a specific zone
  const calculateZoneTariff = (zoneId: string): number => {
    const settings = zoneSettings.get(zoneId);
    const zone = zones.find(z => z.id === zoneId);
    if (!settings || !zone) return 0;

    const numGenerators = zone.num_generators || 1;
    const netTotalEnergyKWh = settings.net_energy_kva * settings.kva_to_kwh_conversion * numGenerators;
    const monthlyEnergyKWh = netTotalEnergyKWh * settings.expected_hours_per_month;
    const totalDieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre * numGenerators;
    const monthlyDieselCostPerKWh = netTotalEnergyKWh > 0 ? totalDieselCostPerHour / netTotalEnergyKWh : 0;

    const servicingCostPerMonth = settings.servicing_cost_per_year / 12;
    const servicingCostPerMonthByHours = (settings.servicing_cost_per_250_hours / 250) * settings.expected_hours_per_month;
    const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
    const totalServicesCostPerKWh = monthlyEnergyKWh > 0 ? additionalServicingCost / monthlyEnergyKWh : 0;

    const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
    const maintenanceContingency = totalTariffBeforeContingency * 0.1;
    
    return totalTariffBeforeContingency + maintenanceContingency;
  };

  // Calculate average tariff across all zones
  const calculateAverageTariff = (): number => {
    const tariffs = zones.map(zone => calculateZoneTariff(zone.id)).filter(t => t > 0);
    if (tariffs.length === 0) return 0;
    return tariffs.reduce((sum, t) => sum + t, 0) / tariffs.length;
  };

  const averageTariff = calculateAverageTariff();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Running Recovery Calculator</CardTitle>
              <CardDescription>Compare operational costs across all generators</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 font-bold">Parameter</TableHead>
                {zones.slice(0, 4).map((zone, idx) => (
                  <TableHead key={zone.id} className="text-center font-bold">
                    Generator {idx + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Zone Information */}
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Zone Name</TableCell>
                {zones.slice(0, 4).map((zone) => (
                  <TableCell key={zone.id} className="text-center">
                    {zone.zone_name}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Generator Size</TableCell>
                {zones.slice(0, 4).map((zone) => (
                  <TableCell key={zone.id} className="text-center">
                    {zone.generator_size}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Synchronized Units</TableCell>
                {zones.slice(0, 4).map((zone) => (
                  <TableCell key={zone.id} className="text-center">
                    {zone.num_generators || 1}
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
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        value={settings?.running_load || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'running_load', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Net Energy kVA */}
              <TableRow>
                <TableCell className="font-medium">Net Energy (kVA)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        value={settings?.net_energy_kva || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'net_energy_kva', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* kVA to kWh Conversion */}
              <TableRow>
                <TableCell className="font-medium">kVA to kWh Factor</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings?.kva_to_kwh_conversion || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'kva_to_kwh_conversion', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Fuel Consumption Rate */}
              <TableRow>
                <TableCell className="font-medium">Fuel Rate (L/h per unit)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
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
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings?.diesel_price_per_litre || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'diesel_price_per_litre', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Servicing Cost Per Year */}
              <TableRow>
                <TableCell className="font-medium">Servicing Cost/Year (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings?.servicing_cost_per_year || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'servicing_cost_per_year', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Servicing Cost Per 250 Hours */}
              <TableRow>
                <TableCell className="font-medium">Servicing Cost/250h (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings?.servicing_cost_per_250_hours || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'servicing_cost_per_250_hours', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Expected Hours Per Month */}
              <TableRow>
                <TableCell className="font-medium">Expected Hours/Month</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center">
                      <Input
                        type="number"
                        value={settings?.expected_hours_per_month || 0}
                        onChange={(e) => updateZoneSetting(zone.id, 'expected_hours_per_month', Number(e.target.value))}
                        disabled={!isEditing}
                        className="text-center"
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
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  if (!settings) return <TableCell key={zone.id} className="text-center">-</TableCell>;
                  const numGenerators = zone.num_generators || 1;
                  const totalEnergy = settings.net_energy_kva * settings.kva_to_kwh_conversion * numGenerators;
                  return (
                    <TableCell key={zone.id} className="text-center font-semibold">
                      {totalEnergy.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Energy */}
              <TableRow>
                <TableCell className="font-medium">Monthly Energy (kWh)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  if (!settings) return <TableCell key={zone.id} className="text-center">-</TableCell>;
                  const numGenerators = zone.num_generators || 1;
                  const totalEnergy = settings.net_energy_kva * settings.kva_to_kwh_conversion * numGenerators;
                  const monthlyEnergy = totalEnergy * settings.expected_hours_per_month;
                  return (
                    <TableCell key={zone.id} className="text-center font-semibold">
                      {monthlyEnergy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Diesel Cost Per Hour */}
              <TableRow>
                <TableCell className="font-medium">Diesel Cost/Hour (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  if (!settings) return <TableCell key={zone.id} className="text-center">-</TableCell>;
                  const numGenerators = zone.num_generators || 1;
                  const dieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre * numGenerators;
                  return (
                    <TableCell key={zone.id} className="text-center font-semibold">
                      R {dieselCostPerHour.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Diesel Cost */}
              <TableRow>
                <TableCell className="font-medium">Monthly Diesel Cost (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  if (!settings) return <TableCell key={zone.id} className="text-center">-</TableCell>;
                  const numGenerators = zone.num_generators || 1;
                  const dieselCostPerHour = settings.fuel_consumption_rate * settings.diesel_price_per_litre * numGenerators;
                  const monthlyDieselCost = dieselCostPerHour * settings.expected_hours_per_month;
                  return (
                    <TableCell key={zone.id} className="text-center font-semibold">
                      R {monthlyDieselCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Monthly Servicing Cost */}
              <TableRow>
                <TableCell className="font-medium">Monthly Servicing Cost (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const settings = zoneSettings.get(zone.id);
                  if (!settings) return <TableCell key={zone.id} className="text-center">-</TableCell>;
                  const servicingCostPerMonth = settings.servicing_cost_per_year / 12;
                  const servicingCostPerMonthByHours = (settings.servicing_cost_per_250_hours / 250) * settings.expected_hours_per_month;
                  const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
                  return (
                    <TableCell key={zone.id} className="text-center font-semibold">
                      R {additionalServicingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Tariff Per kWh */}
              <TableRow className="bg-accent">
                <TableCell className="font-bold text-lg">TARIFF PER kWh (R)</TableCell>
                {zones.slice(0, 4).map((zone) => {
                  const tariff = calculateZoneTariff(zone.id);
                  return (
                    <TableCell key={zone.id} className="text-center font-bold text-lg">
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
          <CardTitle className="text-center text-2xl">Average Recovery Tariff</CardTitle>
          <CardDescription className="text-center">
            Average tariff across all {zones.length} generator{zones.length !== 1 ? 's' : ''}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
