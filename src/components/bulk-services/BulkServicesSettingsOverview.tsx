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
        <h3 className="text-lg font-semibold">SANS 204 Theta Values (VA/m²)</h3>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Maximum energy demand values per building class across all climatic zones
          </p>

          <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-semibold">Building Class</th>
                    <th className="text-left p-2 text-sm font-semibold">Building Type</th>
                    {CLIMATIC_ZONES.map((zone) => (
                      <th key={zone.value} className="text-center p-2 text-sm font-semibold">
                        Zone {zone.value}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SANS_204_TABLE).map(([code, data]) => (
                    <tr key={code} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Badge variant="outline">{code}</Badge>
                      </td>
                      <td className="p-2 text-sm">{data.name}</td>
                      {data.zones.map((value, idx) => (
                        <td key={idx} className="text-center p-2 text-sm font-medium">
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
                <div key={zone.value} className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Zone {zone.value}</Badge>
                    <span className="text-sm font-medium">{zone.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{zone.cities}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
