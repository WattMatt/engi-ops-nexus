import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
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
  );
}
