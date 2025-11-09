import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

interface BulkServicesSettingsOverviewProps {
  documentId: string;
  currentCalculationType?: string;
}

export const BulkServicesSettingsOverview = ({
  documentId,
  currentCalculationType,
}: BulkServicesSettingsOverviewProps) => {
  const [calculationType, setCalculationType] = useState(
    currentCalculationType || "sans_204"
  );
  const [saving, setSaving] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(true);

  // Calculate statistics
  const allVaValues = Object.values(SANS_204_TABLE).flatMap(bt => bt.zones);
  const minVa = Math.min(...allVaValues);
  const maxVa = Math.max(...allVaValues);
  const avgVa = allVaValues.reduce((sum, val) => sum + val, 0) / allVaValues.length;

  // Per-zone statistics
  const zoneStats = Array.from({ length: 6 }, (_, zoneIdx) => {
    const zoneValues = Object.values(SANS_204_TABLE).map(bt => bt.zones[zoneIdx]);
    const avg = zoneValues.reduce((sum, val) => sum + val, 0) / zoneValues.length;
    const min = Math.min(...zoneValues);
    const max = Math.max(...zoneValues);
    return { avg, min, max };
  });

  // Generate heat map color based on VA value
  const getHeatMapColor = (va: number) => {
    if (!showHeatMap) return "";
    const normalized = (va - minVa) / (maxVa - minVa);
    
    if (normalized < 0.33) {
      return "bg-green-100 dark:bg-green-950/30";
    } else if (normalized < 0.67) {
      return "bg-yellow-100 dark:bg-yellow-950/30";
    } else {
      return "bg-red-100 dark:bg-red-950/30";
    }
  };

  const handleSaveCalculationType = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({ building_calculation_type: calculationType })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Calculation method updated successfully");
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating calculation type:", error);
      toast.error("Failed to update calculation method");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold">Calculation Method</h3>
        
        <div className="space-y-2">
          <Label>Select Calculation Standard</Label>
          <Select value={calculationType} onValueChange={setCalculationType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select calculation method" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="sans_204">SANS 204 - Commercial/Retail</SelectItem>
              <SelectItem value="sans_10142">SANS 10142-1 - General Buildings</SelectItem>
              <SelectItem value="residential">Residential ADMD Method</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Button onClick={handleSaveCalculationType} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Calculation Method"}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>SANS 204:</strong> Used for commercial and retail buildings. Provides maximum energy demand based on building classification and climatic zone.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>SANS 10142-1:</strong> General electrical installation standard for various building types including offices, industrial, and educational facilities.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Residential ADMD:</strong> After Diversity Maximum Demand method specifically designed for residential developments and multi-unit dwellings.
          </p>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">SANS 204 Summary Statistics</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeatMap(!showHeatMap)}
          >
            {showHeatMap ? "Hide" : "Show"} Heat Map
          </Button>
        </div>

        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold">{Math.round(avgVa * 10) / 10}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <p className="text-sm text-muted-foreground mb-1">Minimum</p>
            <p className="text-2xl font-bold">{minVa}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
          <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <p className="text-sm text-muted-foreground mb-1">Maximum</p>
            <p className="text-2xl font-bold">{maxVa}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
        </div>

        {/* Zone Statistics Grid */}
        <div className="pt-4">
          <h4 className="text-sm font-semibold mb-3">Statistics by Climatic Zone</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {zoneStats.map((stat, idx) => (
              <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">Zone {idx + 1}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg:</span>
                    <span className="font-medium">{Math.round(stat.avg * 10) / 10}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="font-medium">{stat.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="font-medium">{stat.max}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold">SANS 204 Complete Zone Comparison (VA/m²)</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Maximum energy demand values per building class across all climatic zones
          </p>

          {showHeatMap && (
            <div className="flex items-center gap-4 text-xs">
              <span className="font-medium">Heat Map Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 dark:bg-green-950/30 border rounded"></div>
                <span>Low ({minVa}-{minVa + 6} VA/m²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950/30 border rounded"></div>
                <span>Medium ({minVa + 7}-{maxVa - 7} VA/m²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-950/30 border rounded"></div>
                <span>High ({maxVa - 6}-{maxVa} VA/m²)</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3 text-sm font-semibold bg-muted/50">Class</th>
                  <th className="text-left p-3 text-sm font-semibold bg-muted/50">Building Type</th>
                  {CLIMATIC_ZONES.map((zone) => (
                    <th key={zone.value} className="text-center p-3 text-sm font-semibold bg-muted/50">
                      <div>Zone {zone.value}</div>
                      <div className="text-xs font-normal text-muted-foreground">{zone.name.split(' ')[0]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SANS_204_TABLE).map(([code, data]) => (
                  <tr key={code} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono">{code}</Badge>
                    </td>
                    <td className="p-3 text-sm font-medium">{data.name}</td>
                    {data.zones.map((value, idx) => (
                      <td 
                        key={idx} 
                        className={`text-center p-3 text-sm font-bold transition-colors ${getHeatMapColor(value)}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3">Climatic Zones Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CLIMATIC_ZONES.map((zone) => (
                <div key={zone.value} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs font-mono">Zone {zone.value}</Badge>
                    <span className="text-sm font-semibold">{zone.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Major cities: {zone.cities}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
