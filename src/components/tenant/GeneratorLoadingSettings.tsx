import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronRight, Pencil, Check, X, Palette } from "lucide-react";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");

  // Predefined color palette for zones
  const zoneColors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Amber", value: "#f59e0b" },
  ];

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

  // Fetch individual generators for all zones
  const { data: zoneGenerators = [], refetch: refetchZoneGenerators } = useQuery({
    queryKey: ["zone-generators", projectId],
    queryFn: async () => {
      if (!zones.length) return [];
      
      const zoneIds = zones.map(z => z.id);
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds)
        .order("generator_number");

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zones.length > 0,
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

  const handleUpdateNumGenerators = async (zoneId: string, numGenerators: number) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ num_generators: numGenerators })
        .eq("id", zoneId);

      if (error) throw error;

      // Create or remove generators to match the new count
      const existingGenerators = zoneGenerators.filter(g => g.zone_id === zoneId);
      const currentCount = existingGenerators.length;

      if (numGenerators > currentCount) {
        // Add new generators
        const newGenerators = Array.from({ length: numGenerators - currentCount }, (_, i) => ({
          zone_id: zoneId,
          generator_number: currentCount + i + 1,
          generator_size: null,
          generator_cost: 0,
        }));

        const { error: insertError } = await supabase
          .from("zone_generators")
          .insert(newGenerators);

        if (insertError) throw insertError;
      } else if (numGenerators < currentCount) {
        // Remove excess generators
        const generatorsToRemove = existingGenerators
          .filter(g => g.generator_number > numGenerators)
          .map(g => g.id);

        const { error: deleteError } = await supabase
          .from("zone_generators")
          .delete()
          .in("id", generatorsToRemove);

        if (deleteError) throw deleteError;
      }

      toast.success("Number of generators updated");
      refetchZones();
      refetchZoneGenerators();
    } catch (error) {
      console.error("Error updating number of generators:", error);
      toast.error("Failed to update number of generators");
    }
  };

  const handleUpdateGeneratorSize = async (generatorId: string, size: string | null) => {
    try {
      const { error } = await supabase
        .from("zone_generators")
        .update({ generator_size: size })
        .eq("id", generatorId);

      if (error) throw error;
      toast.success("Generator size updated");
      refetchZoneGenerators();
    } catch (error) {
      console.error("Error updating generator size:", error);
      toast.error("Failed to update generator size");
    }
  };

  const handleUpdateGeneratorCost = async (generatorId: string, cost: number) => {
    try {
      const { error } = await supabase
        .from("zone_generators")
        .update({ generator_cost: cost })
        .eq("id", generatorId);

      if (error) throw error;
      toast.success("Generator cost updated");
      refetchZoneGenerators();
    } catch (error) {
      console.error("Error updating generator cost:", error);
      toast.error("Failed to update generator cost");
    }
  };

  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  };

  const getZoneGenerators = (zoneId: string) => {
    return zoneGenerators.filter(g => g.zone_id === zoneId).sort((a, b) => a.generator_number - b.generator_number);
  };

  const getZoneTotalCost = (zoneId: string) => {
    return getZoneGenerators(zoneId).reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
  };

  const handleStartEditZoneName = (zoneId: string, currentName: string) => {
    setEditingZoneId(zoneId);
    setEditingZoneName(currentName);
  };

  const handleCancelEditZoneName = () => {
    setEditingZoneId(null);
    setEditingZoneName("");
  };

  const handleSaveZoneName = async (zoneId: string) => {
    if (!editingZoneName.trim()) {
      toast.error("Zone name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ zone_name: editingZoneName.trim() })
        .eq("id", zoneId);

      if (error) throw error;
      toast.success("Zone name updated");
      setEditingZoneId(null);
      setEditingZoneName("");
      refetchZones();
    } catch (error) {
      console.error("Error updating zone name:", error);
      toast.error("Failed to update zone name");
    }
  };

  const handleUpdateZoneColor = async (zoneId: string, color: string) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ zone_color: color })
        .eq("id", zoneId);

      if (error) throw error;
      toast.success("Zone color updated");
      refetchZones();
    } catch (error) {
      console.error("Error updating zone color:", error);
      toast.error("Failed to update zone color");
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
          <div className="space-y-4">
            {zones.map((zone) => {
              const zoneLoading = getZoneLoading(zone.id);
              const generators = getZoneGenerators(zone.id);
              const isExpanded = expandedZones.has(zone.id);
              const totalCost = getZoneTotalCost(zone.id);
              const zoneColor = zone.zone_color || "#3b82f6";

              return (
                <Card key={zone.id} className="relative overflow-hidden">
                  {/* Color indicator bar */}
                  <div 
                    className="absolute top-0 left-0 w-1.5 h-full" 
                    style={{ backgroundColor: zoneColor }}
                  />
                  <CardHeader className="pb-3 pl-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {/* Color picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-2"
                                style={{ borderColor: zoneColor }}
                              >
                                <div 
                                  className="h-4 w-4 rounded-sm" 
                                  style={{ backgroundColor: zoneColor }}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Select Zone Color</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {zoneColors.map((color) => (
                                    <button
                                      key={color.value}
                                      className="h-8 w-8 rounded border-2 hover:scale-110 transition-transform"
                                      style={{ 
                                        backgroundColor: color.value,
                                        borderColor: zoneColor === color.value ? "#000" : "transparent"
                                      }}
                                      onClick={() => handleUpdateZoneColor(zone.id, color.value)}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg">Zone {zone.zone_number}</CardTitle>
                          {editingZoneId === zone.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={editingZoneName}
                                onChange={(e) => setEditingZoneName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveZoneName(zone.id);
                                  if (e.key === "Escape") handleCancelEditZoneName();
                                }}
                                className="h-8 max-w-xs"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveZoneName(zone.id)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEditZoneName}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CardDescription>{zone.zone_name}</CardDescription>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditZoneName(zone.id, zone.zone_name)}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Calculated Load</p>
                            <p className="font-mono text-lg font-semibold" style={{ color: zoneColor }}>
                              {zoneLoading.toFixed(2)} kW
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Cost</p>
                            <p className="font-mono text-lg font-semibold" style={{ color: zoneColor }}>
                              R {totalCost.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={(zone.num_generators || 1).toString()}
                          onValueChange={(value) => handleUpdateNumGenerators(zone.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Generator</SelectItem>
                            <SelectItem value="2">2 Synchronized</SelectItem>
                            <SelectItem value="3">3 Synchronized</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleZoneExpanded(zone.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && generators.length > 0 && (
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Generator #</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Cost (R)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generators.map((generator) => (
                            <TableRow key={generator.id}>
                              <TableCell className="font-medium">
                                Generator {generator.generator_number}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={generator.generator_size || "none"}
                                  onValueChange={(value) => 
                                    handleUpdateGeneratorSize(generator.id, value === "none" ? null : value)
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No size selected</SelectItem>
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
                                  defaultValue={generator.generator_cost || 0}
                                  onBlur={(e) => 
                                    handleUpdateGeneratorCost(generator.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-[180px]"
                                  placeholder="Enter cost"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
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
