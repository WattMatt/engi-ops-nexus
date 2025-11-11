import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Calculator } from "lucide-react";
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

interface BulkServicesKPICardProps {
  documentId: string;
}

export const BulkServicesKPICard = ({ documentId }: BulkServicesKPICardProps) => {
  const [projectArea, setProjectArea] = useState("");
  const [buildingClass, setBuildingClass] = useState<keyof typeof SANS_204_TABLE>("F1");
  const [climaticZone, setClimaticZone] = useState("1");
  const [diversityFactor, setDiversityFactor] = useState("0.75");
  const [saving, setSaving] = useState(false);

  const { data: document } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (document) {
      setProjectArea(document.project_area?.toString() || "");
      setClimaticZone(document.climatic_zone || "1");
      setDiversityFactor(document.diversity_factor?.toString() || "0.75");
    }
  }, [document]);

  const vaPerSqm = SANS_204_TABLE[buildingClass].zones[parseInt(climaticZone) - 1];
  const area = parseFloat(projectArea) || 0;
  const totalConnectedLoad = area * vaPerSqm;
  const diversity = parseFloat(diversityFactor) || 0.75;
  const maximumDemand = totalConnectedLoad * diversity;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({
          project_area: parseFloat(projectArea),
          climatic_zone: climaticZone,
          diversity_factor: parseFloat(diversityFactor),
          va_per_sqm: vaPerSqm,
          total_connected_load: totalConnectedLoad,
          maximum_demand: maximumDemand,
        })
        .eq("id", documentId);

      if (error) throw error;
      toast.success("Baseline parameters saved successfully");
    } catch (error: any) {
      console.error("Error saving parameters:", error);
      toast.error("Failed to save parameters");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Project Parameters & KPIs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Project Area (m²)</Label>
            <Input
              type="number"
              value={projectArea}
              onChange={(e) => setProjectArea(e.target.value)}
              placeholder="Enter total floor area"
            />
          </div>

          <div className="space-y-2">
            <Label>Building Classification (SANS 204)</Label>
            <Select value={buildingClass} onValueChange={(value) => setBuildingClass(value as keyof typeof SANS_204_TABLE)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
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
            <Select value={climaticZone} onValueChange={setClimaticZone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {CLIMATIC_ZONES.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    Zone {zone.value} - {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.cities}
            </p>
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

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">VA/m²</p>
            <p className="text-2xl font-bold">{vaPerSqm}</p>
            <Badge variant="outline" className="text-xs">SANS 204</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Connected Load</p>
            <p className="text-2xl font-bold">{(totalConnectedLoad / 1000).toFixed(1)} kVA</p>
            <Badge variant="outline" className="text-xs">Calculated</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Maximum Demand</p>
            <p className="text-2xl font-bold">{(maximumDemand / 1000).toFixed(1)} kVA</p>
            <Badge variant="outline" className="text-xs">After Diversity</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Recommended Size</p>
            <p className="text-2xl font-bold">{Math.ceil((maximumDemand * 1.2) / 100) * 100 / 1000} kVA</p>
            <Badge variant="outline" className="text-xs">+20% Expansion</Badge>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Parameters"}
        </Button>
      </CardContent>
    </Card>
  );
};
