import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

interface RunningRecoveryCalculatorProps {
  projectId: string;
}

export function RunningRecoveryCalculator({ projectId }: RunningRecoveryCalculatorProps) {
  const [selectedGeneratorId, setSelectedGeneratorId] = useState<string>("");
  const [plantName, setPlantName] = useState("STANDBY PLANT 1");
  const [runningLoad, setRunningLoad] = useState(75);
  const [netEnergyKVA, setNetEnergyKVA] = useState(1200);
  const [kvaToKwhConversion, setKvaToKwhConversion] = useState(0.95);
  const [fuelConsumptionRate, setFuelConsumptionRate] = useState(200.55);
  const [dieselPricePerLitre, setDieselPricePerLitre] = useState(23.00);
  const [servicingCostPerYear, setServicingCostPerYear] = useState(18800.00);
  const [servicingCostPer250Hours, setServicingCostPer250Hours] = useState(18800.00);
  const [expectedHoursPerMonth, setExpectedHoursPerMonth] = useState(100);

  // Function to get fuel consumption from sizing table
  const getFuelConsumption = (generatorSize: string, loadPercentage: number): number => {
    const sizingData = GENERATOR_SIZING_TABLE.find(g => g.rating === generatorSize);
    if (!sizingData) return 0;

    // Interpolate between load percentages
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

  // Fetch generator zones
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-running", projectId],
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

  // Handle generator selection and auto-update fuel consumption
  const handleGeneratorSelect = (zoneId: string) => {
    setSelectedGeneratorId(zoneId);
    const selectedZone = zones.find(z => z.id === zoneId);
    if (selectedZone) {
      setPlantName(selectedZone.zone_name);
      // Parse generator size to extract kVA value (e.g., "1200 kVA" -> 1200)
      const sizeMatch = selectedZone.generator_size?.match(/(\d+)/);
      if (sizeMatch) {
        const kvaValue = Number(sizeMatch[1]);
        setNetEnergyKVA(kvaValue);
        
        // Auto-update fuel consumption based on sizing table
        const fuelRate = getFuelConsumption(selectedZone.generator_size || "", runningLoad);
        setFuelConsumptionRate(fuelRate);
      }
    }
  };

  // Update fuel consumption when running load changes
  useEffect(() => {
    if (selectedGeneratorId) {
      const selectedZone = zones.find(z => z.id === selectedGeneratorId);
      if (selectedZone?.generator_size) {
        const fuelRate = getFuelConsumption(selectedZone.generator_size, runningLoad);
        setFuelConsumptionRate(fuelRate);
      }
    }
  }, [runningLoad, selectedGeneratorId, zones]);

  // Calculations
  const netTotalEnergyKWh = netEnergyKVA * kvaToKwhConversion;
  const totalDieselCostPerHour = fuelConsumptionRate * dieselPricePerLitre;
  const monthlyDieselCostPerKWh = totalDieselCostPerHour / netTotalEnergyKWh;

  const servicingCostPerMonth = servicingCostPerYear / 12;
  const servicingCostPerMonthByHours = (servicingCostPer250Hours / 250) * expectedHoursPerMonth;
  const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
  const totalServicesCostPerKWh = additionalServicingCost / netTotalEnergyKWh;

  const totalFuelCost = monthlyDieselCostPerKWh;
  const totalMaintenanceCost = totalServicesCostPerKWh;
  const totalTariffBeforeContingency = totalFuelCost + totalMaintenanceCost;
  const maintenanceContingency = totalTariffBeforeContingency * 0.1;
  const totalTariffForUseKWh = totalTariffBeforeContingency + maintenanceContingency;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Running Recovery Calculator</CardTitle>
              <CardDescription>Calculate operational costs and tariff per kWh</CardDescription>
            </div>
            <Badge variant="secondary">{plantName}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="generator">Select Generator</Label>
              <Select value={selectedGeneratorId} onValueChange={handleGeneratorSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a generator" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.zone_name} - {zone.generator_size}
                      {zone.num_generators > 1 && ` (${zone.num_generators} Synchronized)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="runningLoad">Running Load (%)</Label>
              <Input
                id="runningLoad"
                type="number"
                value={runningLoad}
                onChange={(e) => setRunningLoad(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="netEnergyKVA">Net Energy (kVA)</Label>
              <Input
                id="netEnergyKVA"
                type="number"
                value={netEnergyKVA}
                onChange={(e) => setNetEnergyKVA(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="kvaConversion">kVA to kWh Conversion</Label>
              <Input
                id="kvaConversion"
                type="number"
                step="0.01"
                value={kvaToKwhConversion}
                onChange={(e) => setKvaToKwhConversion(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="fuelRate">Fuel Consumption @ {runningLoad}% (L/h)</Label>
              <Input
                id="fuelRate"
                type="number"
                step="0.01"
                value={fuelConsumptionRate}
                onChange={(e) => setFuelConsumptionRate(Number(e.target.value))}
                className="font-semibold"
                disabled={!!selectedGeneratorId}
              />
              {selectedGeneratorId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-calculated from sizing table
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="dieselPrice">Diesel Price (R/L)</Label>
              <Input
                id="dieselPrice"
                type="number"
                step="0.01"
                value={dieselPricePerLitre}
                onChange={(e) => setDieselPricePerLitre(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="servicingYear">Servicing Cost/Year (R)</Label>
              <Input
                id="servicingYear"
                type="number"
                step="0.01"
                value={servicingCostPerYear}
                onChange={(e) => setServicingCostPerYear(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="servicing250">Servicing Cost/250h (R)</Label>
              <Input
                id="servicing250"
                type="number"
                step="0.01"
                value={servicingCostPer250Hours}
                onChange={(e) => setServicingCostPer250Hours(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="expectedHours">Expected Hours/Month</Label>
              <Input
                id="expectedHours"
                type="number"
                value={expectedHoursPerMonth}
                onChange={(e) => setExpectedHoursPerMonth(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Diesel Consumption Cost */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Diesel Consumption Cost
              <Badge variant="outline">Fuel</Badge>
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Running Load (Correction already made in sizing)</TableCell>
                  <TableCell className="text-right">{runningLoad}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Net energy generated (usable kVA)</TableCell>
                  <TableCell className="text-right">{netEnergyKVA.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Convert kVA to kWh</TableCell>
                  <TableCell className="text-right">{kvaToKwhConversion.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Net total energy generated (usable kWh)</TableCell>
                  <TableCell className="text-right">{netTotalEnergyKWh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Assumed running load on generators</TableCell>
                  <TableCell className="text-right">{runningLoad}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fuel Consumption @ {runningLoad}%</TableCell>
                  <TableCell className="text-right">{fuelConsumptionRate.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cost of diesel per litre</TableCell>
                  <TableCell className="text-right">R {dieselPricePerLitre.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total cost of diesel per hour</TableCell>
                  <TableCell className="text-right">R {totalDieselCostPerHour.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5">
                  <TableCell className="font-bold">Monthly diesel cost /kWh</TableCell>
                  <TableCell className="text-right font-bold">R {monthlyDieselCostPerKWh.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Maintenance Cost */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Maintenance Cost
              <Badge variant="outline">Service</Badge>
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Cost of servicing units per year</TableCell>
                  <TableCell className="text-right">R {servicingCostPerYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Months</TableCell>
                  <TableCell className="text-right">12.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cost of servicing units per month</TableCell>
                  <TableCell className="text-right">R {servicingCostPerMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cost of Servicing units per 250 hours</TableCell>
                  <TableCell className="text-right">R {servicingCostPer250Hours.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Expected hours per Month</TableCell>
                  <TableCell className="text-right">{expectedHoursPerMonth.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cost of servicing units per month</TableCell>
                  <TableCell className="text-right">R {servicingCostPerMonthByHours.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Additional Cost of Servicing - above Annual Cost</TableCell>
                  <TableCell className="text-right">R {additionalServicingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5">
                  <TableCell className="font-bold">Total Services cost per kWH (Excluding Annual Service)</TableCell>
                  <TableCell className="text-right font-bold">R {totalServicesCostPerKWh.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Total Cost per kWH</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">TOTAL FUEL COST</TableCell>
                  <TableCell className="text-right">R {totalFuelCost.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">TOTAL MAINTENANCE COST</TableCell>
                  <TableCell className="text-right">R {totalMaintenanceCost.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">TOTAL TARIFF FOR USE KWH</TableCell>
                  <TableCell className="text-right">R {totalTariffBeforeContingency.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">MAINTENANCE CONTINGENCY</TableCell>
                  <TableCell className="text-right">R {maintenanceContingency.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="bg-primary text-primary-foreground">
                  <TableCell className="font-bold text-lg">TOTAL TARIFF FOR USE KWH</TableCell>
                  <TableCell className="text-right font-bold text-lg">R {totalTariffForUseKWh.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
