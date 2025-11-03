import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

interface GeneratorSettings {
  id: string;
  project_id: string;
  standard_kw_per_sqm: number;
  fast_food_kw_per_sqm: number;
  restaurant_kw_per_sqm: number;
  national_kw_per_sqm: number;
}

interface GeneratorLoadingSettingsProps {
  projectId: string;
}

export function GeneratorLoadingSettings({ projectId }: GeneratorLoadingSettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    standard_kw_per_sqm: 0.03,
    fast_food_kw_per_sqm: 0.045,
    restaurant_kw_per_sqm: 0.045,
    national_kw_per_sqm: 0.03,
  });

  const [newZoneName, setNewZoneName] = useState("");

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["generator-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as GeneratorSettings | null;
    },
    enabled: !!projectId,
  });

  // Fetch zones
  const { data: zones = [], refetch: refetchZones } = useQuery({
    queryKey: ["generator-zones", projectId],
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

  // Fetch tenants for zone loading calculations
  const { data: tenants = [] } = useQuery({
    queryKey: ["generator-tenants", projectId],
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

  // Calculate loading for a tenant
  const calculateLoading = (tenant: any): number => {
    if (!tenant.area || tenant.own_generator_provided) return 0;
    
    const kwPerSqm = {
      standard: settings.standard_kw_per_sqm,
      fast_food: settings.fast_food_kw_per_sqm,
      restaurant: settings.restaurant_kw_per_sqm,
      national: settings.national_kw_per_sqm,
    };

    return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
  };

  // Calculate total loading per zone
  const getZoneLoading = (zoneId: string) => {
    return tenants
      .filter(t => t.generator_zone_id === zoneId && !t.own_generator_provided)
      .reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
  };

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        standard_kw_per_sqm: Number(existingSettings.standard_kw_per_sqm),
        fast_food_kw_per_sqm: Number(existingSettings.fast_food_kw_per_sqm),
        restaurant_kw_per_sqm: Number(existingSettings.restaurant_kw_per_sqm),
        national_kw_per_sqm: Number(existingSettings.national_kw_per_sqm),
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from("generator_settings")
          .update(settings)
          .eq("id", existingSettings.id);
        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from("generator_settings")
          .insert({ ...settings, project_id: projectId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Generator loading settings saved");
      queryClient.invalidateQueries({ queryKey: ["generator-settings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["generator-tenants", projectId] });
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) {
      toast.error("Please enter a zone name");
      return;
    }

    try {
      const { error } = await supabase
        .from("generator_zones")
        .insert({
          project_id: projectId,
          zone_name: newZoneName,
          zone_number: zones.length + 1,
          display_order: zones.length,
        });

      if (error) throw error;
      toast.success("Zone added successfully");
      setNewZoneName("");
      refetchZones();
    } catch (error) {
      console.error("Error adding zone:", error);
      toast.error("Failed to add zone");
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .delete()
        .eq("id", zoneId);

      if (error) throw error;
      toast.success("Zone deleted successfully");
      refetchZones();
    } catch (error) {
      console.error("Error deleting zone:", error);
      toast.error("Failed to delete zone");
    }
  };

  const handleUpdateZoneSize = async (zoneId: string, size: string | null) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ generator_size: size })
        .eq("id", zoneId);

      if (error) throw error;
      toast.success("Generator size updated");
      refetchZones();
    } catch (error) {
      console.error("Error updating zone size:", error);
      toast.error("Failed to update generator size");
    }
  };

  const handleUpdateZoneCost = async (zoneId: string, cost: number) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ generator_cost: cost })
        .eq("id", zoneId);

      if (error) throw error;
      toast.success("Generator cost updated");
      refetchZones();
    } catch (error) {
      console.error("Error updating zone cost:", error);
      toast.error("Failed to update generator cost");
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader>
        <CardTitle>Generator Loading Settings</CardTitle>
        <CardDescription>
          Configure kW per square meter for each shop category. These values will be used to automatically calculate generator loading.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="standard">Standard (kW per m²)</Label>
            <Input
              id="standard"
              type="number"
              step="0.0001"
              value={settings.standard_kw_per_sqm}
              onChange={(e) => setSettings({ ...settings, standard_kw_per_sqm: Number(e.target.value) })}
              onBlur={handleSave}
            />
            <p className="text-sm text-muted-foreground mt-1">Typically 0.03 kW/m²</p>
          </div>

          <div>
            <Label htmlFor="fast_food">Fast Food (kW per m²)</Label>
            <Input
              id="fast_food"
              type="number"
              step="0.0001"
              value={settings.fast_food_kw_per_sqm}
              onChange={(e) => setSettings({ ...settings, fast_food_kw_per_sqm: Number(e.target.value) })}
              onBlur={handleSave}
            />
            <p className="text-sm text-muted-foreground mt-1">Typically 0.045 kW/m²</p>
          </div>

          <div>
            <Label htmlFor="restaurant">Restaurant (kW per m²)</Label>
            <Input
              id="restaurant"
              type="number"
              step="0.0001"
              value={settings.restaurant_kw_per_sqm}
              onChange={(e) => setSettings({ ...settings, restaurant_kw_per_sqm: Number(e.target.value) })}
              onBlur={handleSave}
            />
            <p className="text-sm text-muted-foreground mt-1">Typically 0.045 kW/m²</p>
          </div>

          <div>
            <Label htmlFor="national">National (kW per m²)</Label>
            <Input
              id="national"
              type="number"
              step="0.0001"
              value={settings.national_kw_per_sqm}
              onChange={(e) => setSettings({ ...settings, national_kw_per_sqm: Number(e.target.value) })}
              onBlur={handleSave}
            />
            <p className="text-sm text-muted-foreground mt-1">Typically 0.03 kW/m²</p>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How it works</h4>
          <p className="text-sm text-muted-foreground">
            Generator loading is calculated as: <strong>Area (m²) × kW per m²</strong>
            <br />
            Example: A 100m² standard shop = 100 × 0.03 = 3.00 kW
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Generator Zones</CardTitle>
        <CardDescription>
          Define generator zones for separate load calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Enter zone name (e.g., Zone 1, Sector A)"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddZone()}
            />
          </div>
          <Button onClick={handleAddZone}>
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        </div>

        {zones.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Number</TableHead>
                <TableHead>Zone Name</TableHead>
                <TableHead>Calculated Load (kW)</TableHead>
                <TableHead>Generator Size</TableHead>
                <TableHead>Generator Cost (R)</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => {
                const zoneLoading = getZoneLoading(zone.id);
                return (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">Zone {zone.zone_number}</TableCell>
                    <TableCell>{zone.zone_name}</TableCell>
                    <TableCell className="font-mono text-lg font-semibold text-primary">
                      {zoneLoading.toFixed(2)} kW
                    </TableCell>
                    <TableCell>
                      <Select
                        value={zone.generator_size || "none"}
                        onValueChange={(value) => handleUpdateZoneSize(zone.id, value === "none" ? null : value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No size</SelectItem>
                          {GENERATOR_SIZING_TABLE.map((gen) => (
                            <SelectItem key={gen.rating} value={gen.rating}>
                              {gen.rating}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={zone.generator_cost || 0}
                        onChange={(e) => handleUpdateZoneCost(zone.id, parseFloat(e.target.value) || 0)}
                        className="w-[140px]"
                        placeholder="Cost"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            No zones configured yet. Add zones to enable zone-based load calculations.
          </p>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
