import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronRight, Pencil, Check, X, Zap, UtensilsCrossed, Building2, Store, Settings2, MapPin } from "lucide-react";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

interface CategoryCardProps {
  id: string;
  label: string;
  value: number;
  typicalValue: string;
  icon: React.ReactNode;
  color: string;
  onChange: (value: number) => void;
  onBlur: () => void;
}

function CategoryCard({ id, label, value, typicalValue, icon, color, onChange, onBlur }: CategoryCardProps) {
  return (
    <div className={cn(
      "group relative rounded-xl border-2 bg-card p-4 transition-all hover:shadow-md",
      "hover:border-primary/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          color
        )}>
          {icon}
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="number"
              step="0.001"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              onBlur={onBlur}
              className="h-9 font-mono text-sm"
            />
            <span className="shrink-0 text-xs text-muted-foreground">kW/m²</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Typical: {typicalValue}
          </p>
        </div>
      </div>
    </div>
  );
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
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [zonesOpen, setZonesOpen] = useState(true);

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
    { name: "Amber", value: "#d97706" },
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
      const { error } = await supabase
        .from("generator_settings")
        .upsert(
          {
            ...(existingSettings?.id ? { id: existingSettings.id } : {}),
            project_id: projectId,
            ...settings,
          },
          { onConflict: "project_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
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

  const handleUpdateNumGenerators = async (zoneId: string, numGenerators: number) => {
    try {
      const { error } = await supabase
        .from("generator_zones")
        .update({ num_generators: numGenerators })
        .eq("id", zoneId);

      if (error) throw error;

      const existingGenerators = zoneGenerators.filter(g => g.zone_id === zoneId);
      const currentCount = existingGenerators.length;

      if (numGenerators > currentCount) {
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
      
      // Auto-expand the zone to show generator configuration
      setExpandedZones(prev => new Set(prev).add(zoneId));
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
      // Invalidate costing tab and capital recovery queries for bidirectional sync
      queryClient.invalidateQueries({ queryKey: ["zone-generators-costing", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-capital", projectId] });
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
      // Invalidate costing tab and capital recovery queries for bidirectional sync
      queryClient.invalidateQueries({ queryKey: ["zone-generators-costing", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-report", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-capital", projectId] });
    } catch (error) {
      console.error("Error updating generator cost:", error);
      toast.error("Failed to update generator cost");
    }
  };

  const toggleZoneExpanded = async (zoneId: string) => {
    const isCurrentlyExpanded = expandedZones.has(zoneId);
    
    setExpandedZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });

    // Auto-create generators if expanding and none exist
    if (!isCurrentlyExpanded) {
      const existingGens = zoneGenerators.filter(g => g.zone_id === zoneId);
      if (existingGens.length === 0) {
        const zone = zones.find(z => z.id === zoneId);
        const numGenerators = zone?.num_generators || 1;
        const newGenerators = Array.from({ length: numGenerators }, (_, i) => ({
          zone_id: zoneId,
          generator_number: i + 1,
          generator_size: null,
          generator_cost: 0,
        }));

        try {
          const { error } = await supabase
            .from("zone_generators")
            .insert(newGenerators);
          
          if (error) {
            console.error("Error adding generator:", error);
            toast.error("Failed to add generator");
          } else {
            refetchZoneGenerators();
          }
        } catch (err) {
          console.error("Error adding generator:", err);
          toast.error("Failed to add generator");
        }
      }
    }
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading Settings Section */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Settings2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Power Loading Rates</CardTitle>
                    <CardDescription>
                      Configure kW per m² for each shop category
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  settingsOpen && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Category Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CategoryCard
                  id="standard"
                  label="Standard Shop"
                  value={settings.standard_kw_per_sqm}
                  typicalValue="0.03 kW/m²"
                  icon={<Store className="h-5 w-5 text-blue-600" />}
                  color="bg-blue-100"
                  onChange={(value) => setSettings({ ...settings, standard_kw_per_sqm: value })}
                  onBlur={handleSave}
                />
                
                <CategoryCard
                  id="fast_food"
                  label="Fast Food"
                  value={settings.fast_food_kw_per_sqm}
                  typicalValue="0.045 kW/m²"
                  icon={<Zap className="h-5 w-5 text-orange-600" />}
                  color="bg-orange-100"
                  onChange={(value) => setSettings({ ...settings, fast_food_kw_per_sqm: value })}
                  onBlur={handleSave}
                />
                
                <CategoryCard
                  id="restaurant"
                  label="Restaurant"
                  value={settings.restaurant_kw_per_sqm}
                  typicalValue="0.045 kW/m²"
                  icon={<UtensilsCrossed className="h-5 w-5 text-purple-600" />}
                  color="bg-purple-100"
                  onChange={(value) => setSettings({ ...settings, restaurant_kw_per_sqm: value })}
                  onBlur={handleSave}
                />
                
                <CategoryCard
                  id="national"
                  label="National Tenant"
                  value={settings.national_kw_per_sqm}
                  typicalValue="0.03 kW/m²"
                  icon={<Building2 className="h-5 w-5 text-green-600" />}
                  color="bg-green-100"
                  onChange={(value) => setSettings({ ...settings, national_kw_per_sqm: value })}
                  onBlur={handleSave}
                />
              </div>

              {/* Formula Explanation */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm">How Loading is Calculated</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-mono bg-background px-1.5 py-0.5 rounded text-xs">
                        Load (kW) = Area (m²) × Rate (kW/m²)
                      </span>
                      <br />
                      <span className="text-xs mt-1 block">
                        Example: 100m² standard shop = 100 × 0.03 = <strong>3.00 kW</strong>
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Generator Zones Section */}
      <Collapsible open={zonesOpen} onOpenChange={setZonesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Generator Zones</CardTitle>
                    <CardDescription>
                      Configure zones for separate load calculations
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="hidden sm:flex">
                    {zones.length} zone{zones.length !== 1 ? 's' : ''}
                  </Badge>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    zonesOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Add Zone Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter zone name (e.g., Zone 1, Sector A)"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddZone()}
                    className="h-10"
                  />
                </div>
                <Button onClick={handleAddZone} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </div>

              {/* Zones List */}
              {zones.length > 0 ? (
                <div className="space-y-3">
                  {zones.map((zone) => {
                    const zoneLoading = getZoneLoading(zone.id);
                    const generators = getZoneGenerators(zone.id);
                    const isExpanded = expandedZones.has(zone.id);
                    const totalCost = getZoneTotalCost(zone.id);
                    const zoneColor = zone.zone_color || "#3b82f6";

                    return (
                      <div 
                        key={zone.id} 
                        className="rounded-lg border bg-card overflow-hidden"
                      >
                        {/* Zone Header */}
                        <div className="flex items-center gap-3 p-3 sm:p-4">
                          {/* Color Indicator */}
                          <div 
                            className="w-1 self-stretch rounded-full shrink-0" 
                            style={{ backgroundColor: zoneColor }}
                          />
                          
                          {/* Color Picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                style={{ borderColor: zoneColor }}
                              >
                                <div 
                                  className="h-4 w-4 rounded-sm" 
                                  style={{ backgroundColor: zoneColor }}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 z-50 bg-popover" align="start">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Zone Color</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {zoneColors.map((color) => (
                                    <button
                                      key={color.value}
                                      className="h-7 w-7 rounded border-2 hover:scale-110 transition-transform"
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
                          
                          {/* Zone Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                Zone {zone.zone_number}
                              </span>
                              {editingZoneId === zone.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingZoneName}
                                    onChange={(e) => setEditingZoneName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveZoneName(zone.id);
                                      if (e.key === "Escape") handleCancelEditZoneName();
                                    }}
                                    className="h-7 w-32 text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleSaveZoneName(zone.id)}
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleCancelEditZoneName}
                                  >
                                    <X className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => handleStartEditZoneName(zone.id, zone.zone_name)}
                                >
                                  <span className="truncate">{zone.zone_name}</span>
                                  <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                </button>
                              )}
                            </div>
                            
                            {/* Stats Row - Mobile Responsive */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                              <span className="text-muted-foreground">
                                Load: <span className="font-mono font-medium text-foreground">{zoneLoading.toFixed(2)} kW</span>
                              </span>
                              <span className="text-muted-foreground">
                                Cost: <span className="font-mono font-medium text-foreground">R {totalCost.toLocaleString()}</span>
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <Select
                              value={(zone.num_generators || 1).toString()}
                              onValueChange={(value) => handleUpdateNumGenerators(zone.id, parseInt(value))}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs sm:text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                <SelectItem value="1">1 Unit</SelectItem>
                                <SelectItem value="2">2 Units (Sync)</SelectItem>
                                <SelectItem value="3">3 Units (Sync)</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant={isExpanded ? "secondary" : "default"}
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => toggleZoneExpanded(zone.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Configure
                                </>
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteZone(zone.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Generators Table */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 p-3 sm:p-4">
                            {generators.length > 0 ? (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Generator</TableHead>
                                      <TableHead className="text-xs">Size</TableHead>
                                      <TableHead className="text-xs">Cost (R)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {generators.map((generator) => (
                                      <TableRow key={generator.id}>
                                        <TableCell className="font-medium text-sm py-2">
                                          #{generator.generator_number}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <Select
                                            value={generator.generator_size || "none"}
                                            onValueChange={(value) => 
                                              handleUpdateGeneratorSize(generator.id, value === "none" ? null : value)
                                            }
                                          >
                                            <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs">
                                              <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="z-50 bg-popover">
                                              <SelectItem value="none">Not selected</SelectItem>
                                              {GENERATOR_SIZING_TABLE.map((gen) => (
                                                <SelectItem key={gen.rating} value={gen.rating}>
                                                  {gen.rating}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <Input
                                            type="number"
                                            value={generator.generator_cost || 0}
                                            onChange={(e) => {
                                              const newCost = parseFloat(e.target.value) || 0;
                                              queryClient.setQueryData(
                                                ["zone-generators", projectId],
                                                (old: any[]) => old?.map(g => 
                                                  g.id === generator.id ? { ...g, generator_cost: newCost } : g
                                                )
                                              );
                                            }}
                                            onBlur={(e) => 
                                              handleUpdateGeneratorCost(generator.id, parseFloat(e.target.value) || 0)
                                            }
                                            className="w-full sm:w-[120px] h-8 text-xs"
                                            placeholder="Cost"
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                Loading generators...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-lg border-2 border-dashed">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No zones configured yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add zones to enable zone-based load calculations
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
