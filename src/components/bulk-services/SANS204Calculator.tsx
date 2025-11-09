import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, CheckCircle2, RefreshCw, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClimaticZoneMap } from "./ClimaticZoneMap";

interface SANS204CalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyValues: (values: {
    project_area: number;
    va_per_sqm: number;
    total_connected_load: number;
    maximum_demand: number;
    climatic_zone: string;
  }) => void;
  initialValues?: {
    project_area?: number;
    climatic_zone?: string;
    diversity_factor?: number;
  };
}

// SANS 204 Table 1 - Maximum energy demand (VA/m²)
const SANS_204_TABLE = {
  A1: { name: "Entertainment & Public Assembly", zones: [85, 80, 90, 80, 80, 85] },
  A2: { name: "Theatrical & Indoor Sport", zones: [85, 80, 90, 80, 80, 85] },
  A3: { name: "Places of Instruction", zones: [80, 75, 85, 75, 75, 80] },
  A4: { name: "Worship", zones: [80, 75, 85, 75, 75, 80] },
  F1: { name: "Large Shop (Retail)", zones: [90, 85, 95, 85, 85, 90] },
  G1: { name: "Offices", zones: [80, 75, 85, 75, 75, 80] },
  H1: { name: "Hotel", zones: [90, 85, 95, 85, 85, 90] },
};

const CLIMATIC_ZONES = [
  { value: "1", name: "Cold Interior", cities: "Johannesburg, Bloemfontein" },
  { value: "2", name: "Temperate Interior", cities: "Pretoria, Polokwane" },
  { value: "3", name: "Hot Interior", cities: "Makhado, Nelspruit" },
  { value: "4", name: "Temperate Coastal", cities: "Cape Town, Port Elizabeth" },
  { value: "5", name: "Sub-tropical Coastal", cities: "Durban, East London" },
  { value: "6", name: "Arid Interior", cities: "Kimberley, Upington" },
];

export const SANS204Calculator = ({
  open,
  onOpenChange,
  onApplyValues,
  initialValues,
}: SANS204CalculatorProps) => {
  const projectId = localStorage.getItem("selectedProjectId");
  
  const [projectArea, setProjectArea] = useState(initialValues?.project_area?.toString() || "");
  const [buildingClass, setBuildingClass] = useState<keyof typeof SANS_204_TABLE>("F1");
  const [climaticZone, setClimaticZone] = useState(initialValues?.climatic_zone || "1");
  const [diversityFactor, setDiversityFactor] = useState(
    initialValues?.diversity_factor?.toString() || "0.75"
  );
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [showPercentages, setShowPercentages] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({
    vaPerSqm: 90,
    totalConnectedLoad: 0,
    maximumDemand: 0,
  });

  // Calculate min and max VA values for heat map
  const allVaValues = Object.values(SANS_204_TABLE).flatMap(bt => bt.zones);
  const minVa = Math.min(...allVaValues);
  const maxVa = Math.max(...allVaValues);

  // Generate heat map color based on VA value
  const getHeatMapColor = (va: number) => {
    if (!showHeatMap) return "";
    const normalized = (va - minVa) / (maxVa - minVa);
    
    // Color scale: green (low) -> yellow (mid) -> red (high)
    if (normalized < 0.33) {
      return "bg-green-100 dark:bg-green-950/30";
    } else if (normalized < 0.67) {
      return "bg-yellow-100 dark:bg-yellow-950/30";
    } else {
      return "bg-red-100 dark:bg-red-950/30";
    }
  };

  // Calculate percentage difference from minimum value for each building type
  const getPercentageDiff = (buildingType: keyof typeof SANS_204_TABLE, zoneIdx: number) => {
    const zones = SANS_204_TABLE[buildingType].zones;
    const minValue = Math.min(...zones);
    const currentValue = zones[zoneIdx];
    const diff = ((currentValue - minValue) / minValue) * 100;
    return diff;
  };

  // Fetch total area from tenant tracker
  const { data: tenantData, refetch: refetchTenants } = useQuery({
    queryKey: ["tenant-total-area", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("area")
        .eq("project_id", projectId);

      if (error) throw error;

      const totalArea = data?.reduce((sum, tenant) => sum + (tenant.area || 0), 0) || 0;
      return {
        totalArea: Math.round(totalArea * 100) / 100,
        tenantCount: data?.length || 0,
      };
    },
    enabled: !!projectId && open,
  });

  const loadTenantArea = () => {
    if (tenantData?.totalArea) {
      setProjectArea(tenantData.totalArea.toString());
      toast.success(`Loaded ${tenantData.totalArea} m² from ${tenantData.tenantCount} tenants`);
    } else {
      toast.error("No tenant area data found");
    }
  };

  useEffect(() => {
    calculateLoads();
  }, [projectArea, buildingClass, climaticZone, diversityFactor]);

  const calculateLoads = () => {
    const area = parseFloat(projectArea) || 0;
    const diversity = parseFloat(diversityFactor) || 0.75;
    const zoneIndex = parseInt(climaticZone) - 1;

    // Get VA/m² from SANS 204 table
    const vaPerSqm = SANS_204_TABLE[buildingClass].zones[zoneIndex] || 90;

    // Calculate total connected load (VA to kVA conversion)
    const totalConnectedLoad = (area * vaPerSqm) / 1000;

    // Calculate maximum demand with diversity factor
    const maximumDemand = totalConnectedLoad * diversity;

    setCalculatedValues({
      vaPerSqm,
      totalConnectedLoad: Math.round(totalConnectedLoad * 100) / 100,
      maximumDemand: Math.round(maximumDemand * 100) / 100,
    });
  };

  const handleApply = () => {
    onApplyValues({
      project_area: parseFloat(projectArea),
      va_per_sqm: calculatedValues.vaPerSqm,
      total_connected_load: calculatedValues.totalConnectedLoad,
      maximum_demand: calculatedValues.maximumDemand,
      climatic_zone: `${climaticZone} (${CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.name})`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            SANS 204 Load Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate maximum electrical demand based on SANS 204 energy efficiency standards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Project Area (m²)</Label>
                    {tenantData && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={loadTenantArea}
                        className="h-6 text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Load from Tenants
                      </Button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={projectArea}
                    onChange={(e) => setProjectArea(e.target.value)}
                    placeholder="23814"
                  />
                  {tenantData && (
                    <p className="text-xs text-muted-foreground">
                      Tenant tracker total: {tenantData.totalArea.toLocaleString()} m² ({tenantData.tenantCount} tenants)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Building Classification (SANS 204)</Label>
                  <Select value={buildingClass} onValueChange={(value) => setBuildingClass(value as keyof typeof SANS_204_TABLE)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SANS_204_TABLE).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {key} - {value.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Climatic Zone</Label>
                  <Tabs defaultValue="dropdown" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="dropdown">Dropdown</TabsTrigger>
                      <TabsTrigger value="map">
                        <Map className="h-4 w-4 mr-2" />
                        Map
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dropdown" className="mt-2">
                      <Select value={climaticZone} onValueChange={setClimaticZone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIMATIC_ZONES.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              Zone {zone.value} - {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.cities}
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="map" className="mt-2">
                      <ClimaticZoneMap
                        selectedZone={climaticZone}
                        onZoneSelect={setClimaticZone}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Diversity Factor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={diversityFactor}
                    onChange={(e) => setDiversityFactor(e.target.value)}
                    placeholder="0.75"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical: 0.65-0.85 for commercial
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SANS 204 Complete Comparison Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">SANS 204 Table 1 - Complete Zone Comparison (VA/m²)</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="percentage-toggle" className="text-xs cursor-pointer">% Difference</Label>
                  <input
                    id="percentage-toggle"
                    type="checkbox"
                    checked={showPercentages}
                    onChange={(e) => setShowPercentages(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="heatmap-toggle" className="text-xs cursor-pointer">Heat Map</Label>
                  <input
                    id="heatmap-toggle"
                    type="checkbox"
                    checked={showHeatMap}
                    onChange={(e) => setShowHeatMap(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left sticky left-0 bg-muted z-10">Class</th>
                      <th className="p-2 text-left min-w-[200px]">Building Type</th>
                      <th className="p-2 text-center">Zone 1<br/><span className="text-xs font-normal">Cold Interior</span></th>
                      <th className="p-2 text-center">Zone 2<br/><span className="text-xs font-normal">Temp Interior</span></th>
                      <th className="p-2 text-center">Zone 3<br/><span className="text-xs font-normal">Hot Interior</span></th>
                      <th className="p-2 text-center">Zone 4<br/><span className="text-xs font-normal">Temp Coastal</span></th>
                      <th className="p-2 text-center">Zone 5<br/><span className="text-xs font-normal">Sub-tropical</span></th>
                      <th className="p-2 text-center">Zone 6<br/><span className="text-xs font-normal">Arid Interior</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SANS_204_TABLE).map(([key, value]) => (
                      <tr 
                        key={key}
                        className="hover:bg-muted/50"
                      >
                        <td className="p-2 font-medium sticky left-0 bg-background border-r z-10">
                          {key}
                        </td>
                        <td className="p-2">{value.name}</td>
                        {value.zones.map((va, zoneIdx) => {
                          const isSelected = parseInt(climaticZone) === zoneIdx + 1 && buildingClass === key;
                          const heatMapClass = isSelected ? "" : getHeatMapColor(va);
                          const percentDiff = getPercentageDiff(key as keyof typeof SANS_204_TABLE, zoneIdx);
                          const isMinValue = percentDiff === 0;
                          
                          return (
                            <td 
                              key={zoneIdx}
                              className={`p-2 text-center font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-inset"
                                  : heatMapClass
                              }`}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{va}</span>
                                {showPercentages && (
                                  <span className={`text-[10px] ${
                                    isSelected 
                                      ? "text-primary-foreground/80" 
                                      : isMinValue 
                                        ? "text-green-600 dark:text-green-400 font-semibold" 
                                        : "text-muted-foreground"
                                  }`}>
                                    {isMinValue ? "BASE" : `+${percentDiff.toFixed(1)}%`}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legends */}
              <div className="mt-4 space-y-2">
                {showHeatMap && (
                  <div className="flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/30 border"></div>
                      <span className="text-muted-foreground">Low ({minVa}-{minVa + Math.floor((maxVa - minVa) / 3)} VA/m²)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-950/30 border"></div>
                      <span className="text-muted-foreground">Medium ({minVa + Math.floor((maxVa - minVa) / 3) + 1}-{minVa + Math.floor((maxVa - minVa) * 2 / 3)} VA/m²)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/30 border"></div>
                      <span className="text-muted-foreground">High ({minVa + Math.floor((maxVa - minVa) * 2 / 3) + 1}-{maxVa} VA/m²)</span>
                    </div>
                  </div>
                )}
                
                {showPercentages && (
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    <p>
                      <span className="text-green-600 dark:text-green-400 font-semibold">BASE</span> = Lowest VA/m² for each building type | 
                      <span className="ml-2">Percentages show increase from base value</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground">
                <p>Your selection: <span className="font-medium">{buildingClass} - {SANS_204_TABLE[buildingClass].name}</span> in <span className="font-medium">Zone {climaticZone}</span> = <span className="font-medium text-primary">{calculatedValues.vaPerSqm} VA/m²</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Calculated Results */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Calculated Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Applied Load (SANS 204)</p>
                    <p className="text-2xl font-bold">{calculatedValues.vaPerSqm} VA/m²</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Project Area</p>
                    <p className="text-2xl font-bold">
                      {parseFloat(projectArea).toLocaleString()} m²
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Connected Load</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatedValues.totalConnectedLoad.toLocaleString()} kVA
                    </p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg">
                    <p className="text-sm text-muted-foreground">Maximum Demand (After Diversity)</p>
                    <p className="text-2xl font-bold text-green-700">
                      {calculatedValues.maximumDemand.toLocaleString()} kVA
                    </p>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold">Calculation Breakdown:</p>
                  <p>
                    1. SANS 204 Applied Load: <span className="font-medium">{calculatedValues.vaPerSqm} VA/m²</span> ({buildingClass} - Zone {climaticZone})
                  </p>
                  <p>
                    2. Total Connected Load: <span className="font-medium">{projectArea} m² × {calculatedValues.vaPerSqm} VA/m² = {(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA</span>
                  </p>
                  <p>
                    3. Convert to kVA: <span className="font-medium">{(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA ÷ 1000 = {calculatedValues.totalConnectedLoad} kVA</span>
                  </p>
                  <p>
                    4. Apply Diversity Factor: <span className="font-medium">{calculatedValues.totalConnectedLoad} kVA × {diversityFactor} = {calculatedValues.maximumDemand} kVA</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!projectArea || parseFloat(projectArea) <= 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply to Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
