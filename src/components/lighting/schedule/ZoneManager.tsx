import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical, Copy, MapPin } from "lucide-react";
import { toast } from "sonner";

interface ZoneManagerProps {
  projectId: string;
}

interface LightingZone {
  id: string;
  project_id: string;
  zone_name: string;
  zone_type: string;
  description: string | null;
  min_lux: number | null;
  max_wattage_per_m2: number | null;
  color_temperature_min: number | null;
  color_temperature_max: number | null;
  area_m2: number | null;
  display_order: number;
}

const ZONE_TYPES = [
  { value: "mall", label: "Mall", defaultLux: 300 },
  { value: "parking", label: "Parking", defaultLux: 75 },
  { value: "back_of_house", label: "Back of House", defaultLux: 200 },
  { value: "ablutions", label: "Ablutions", defaultLux: 200 },
  { value: "service_passage", label: "Service Passages", defaultLux: 150 },
  { value: "sales_floor", label: "Sales Floor", defaultLux: 500 },
  { value: "storage", label: "Storage", defaultLux: 150 },
  { value: "corridor", label: "Corridor", defaultLux: 100 },
  { value: "exterior", label: "Exterior", defaultLux: 50 },
  { value: "food_court", label: "Food Court", defaultLux: 300 },
  { value: "anchor", label: "Anchor Store", defaultLux: 500 },
  { value: "office", label: "Office", defaultLux: 400 },
  { value: "plant_room", label: "Plant Room", defaultLux: 200 },
  { value: "loading_dock", label: "Loading Dock", defaultLux: 150 },
  { value: "general", label: "General", defaultLux: 300 },
];

const ZONE_TEMPLATES = [
  { name: "Shopping Centre", zones: [
    { zone_name: "Parking", zone_type: "parking", min_lux: 75 },
    { zone_name: "Mall", zone_type: "mall", min_lux: 300 },
    { zone_name: "Back of House", zone_type: "back_of_house", min_lux: 200 },
    { zone_name: "Ablutions", zone_type: "ablutions", min_lux: 200 },
    { zone_name: "Service Passages", zone_type: "service_passage", min_lux: 150 },
  ]},
  { name: "Shopping Centre (Extended)", zones: [
    { zone_name: "Parking - Basement", zone_type: "parking", min_lux: 75 },
    { zone_name: "Parking - Surface", zone_type: "parking", min_lux: 50 },
    { zone_name: "Mall - Ground Floor", zone_type: "mall", min_lux: 300 },
    { zone_name: "Mall - Upper Level", zone_type: "mall", min_lux: 300 },
    { zone_name: "Food Court", zone_type: "food_court", min_lux: 300 },
    { zone_name: "Back of House", zone_type: "back_of_house", min_lux: 200 },
    { zone_name: "Ablutions - Public", zone_type: "ablutions", min_lux: 200 },
    { zone_name: "Ablutions - Staff", zone_type: "ablutions", min_lux: 150 },
    { zone_name: "Service Passages", zone_type: "service_passage", min_lux: 150 },
    { zone_name: "Loading Dock", zone_type: "loading_dock", min_lux: 150 },
    { zone_name: "Plant Rooms", zone_type: "plant_room", min_lux: 200 },
  ]},
  { name: "Standard Retail", zones: [
    { zone_name: "Sales Floor", zone_type: "sales_floor", min_lux: 500 },
    { zone_name: "Back of House", zone_type: "back_of_house", min_lux: 200 },
    { zone_name: "Storage", zone_type: "storage", min_lux: 150 },
  ]},
  { name: "Office Building", zones: [
    { zone_name: "Open Plan Office", zone_type: "office", min_lux: 400 },
    { zone_name: "Meeting Rooms", zone_type: "office", min_lux: 300 },
    { zone_name: "Corridors", zone_type: "corridor", min_lux: 100 },
    { zone_name: "Ablutions", zone_type: "ablutions", min_lux: 200 },
    { zone_name: "Parking", zone_type: "parking", min_lux: 75 },
  ]},
];

export function ZoneManager({ projectId }: ZoneManagerProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<LightingZone | null>(null);
  const [formData, setFormData] = useState({
    zone_name: "",
    zone_type: "general",
    description: "",
    min_lux: "",
    max_wattage_per_m2: "",
    color_temperature_min: "",
    color_temperature_max: "",
    area_m2: "",
  });

  const { data: zones, isLoading } = useQuery({
    queryKey: ["lighting-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lighting_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data as LightingZone[];
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: async (zoneData: Partial<LightingZone>) => {
      const { data, error } = await supabase
        .from("lighting_zones")
        .insert({
          project_id: projectId,
          zone_name: zoneData.zone_name,
          zone_type: zoneData.zone_type,
          description: zoneData.description || null,
          min_lux: zoneData.min_lux || null,
          max_wattage_per_m2: zoneData.max_wattage_per_m2 || null,
          color_temperature_min: zoneData.color_temperature_min || null,
          color_temperature_max: zoneData.color_temperature_max || null,
          area_m2: zoneData.area_m2 || null,
          display_order: (zones?.length || 0),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-zones", projectId] });
      toast.success("Zone created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create zone: " + error.message);
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, ...zoneData }: Partial<LightingZone> & { id: string }) => {
      const { data, error } = await supabase
        .from("lighting_zones")
        .update({
          zone_name: zoneData.zone_name,
          zone_type: zoneData.zone_type,
          description: zoneData.description || null,
          min_lux: zoneData.min_lux || null,
          max_wattage_per_m2: zoneData.max_wattage_per_m2 || null,
          color_temperature_min: zoneData.color_temperature_min || null,
          color_temperature_max: zoneData.color_temperature_max || null,
          area_m2: zoneData.area_m2 || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-zones", projectId] });
      toast.success("Zone updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update zone: " + error.message);
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lighting_zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-zones", projectId] });
      toast.success("Zone deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete zone: " + error.message);
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (template: typeof ZONE_TEMPLATES[0]) => {
      const zonesData = template.zones.map((z, idx) => ({
        project_id: projectId,
        zone_name: z.zone_name,
        zone_type: z.zone_type,
        min_lux: z.min_lux,
        display_order: (zones?.length || 0) + idx,
      }));
      const { error } = await supabase
        .from("lighting_zones")
        .insert(zonesData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-zones", projectId] });
      toast.success("Template applied successfully");
    },
    onError: (error) => {
      toast.error("Failed to apply template: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      zone_name: "",
      zone_type: "general",
      description: "",
      min_lux: "",
      max_wattage_per_m2: "",
      color_temperature_min: "",
      color_temperature_max: "",
      area_m2: "",
    });
    setEditingZone(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (zone: LightingZone) => {
    setEditingZone(zone);
    setFormData({
      zone_name: zone.zone_name,
      zone_type: zone.zone_type,
      description: zone.description || "",
      min_lux: zone.min_lux?.toString() || "",
      max_wattage_per_m2: zone.max_wattage_per_m2?.toString() || "",
      color_temperature_min: zone.color_temperature_min?.toString() || "",
      color_temperature_max: zone.color_temperature_max?.toString() || "",
      area_m2: zone.area_m2?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.zone_name.trim()) {
      toast.error("Zone name is required");
      return;
    }

    const zoneData = {
      zone_name: formData.zone_name.trim(),
      zone_type: formData.zone_type,
      description: formData.description.trim() || null,
      min_lux: formData.min_lux ? parseInt(formData.min_lux) : null,
      max_wattage_per_m2: formData.max_wattage_per_m2 ? parseFloat(formData.max_wattage_per_m2) : null,
      color_temperature_min: formData.color_temperature_min ? parseInt(formData.color_temperature_min) : null,
      color_temperature_max: formData.color_temperature_max ? parseInt(formData.color_temperature_max) : null,
      area_m2: formData.area_m2 ? parseFloat(formData.area_m2) : null,
    };

    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, ...zoneData });
    } else {
      createZoneMutation.mutate(zoneData);
    }
  };

  const handleZoneTypeChange = (value: string) => {
    setFormData(prev => {
      const zoneType = ZONE_TYPES.find(z => z.value === value);
      return {
        ...prev,
        zone_type: value,
        min_lux: prev.min_lux || zoneType?.defaultLux?.toString() || "",
      };
    });
  };

  const getZoneTypeLabel = (value: string) => {
    return ZONE_TYPES.find(z => z.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Lighting Zones</h3>
          <p className="text-sm text-muted-foreground">
            Define zones with specific lighting requirements for this project.
          </p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={(value) => {
            const template = ZONE_TEMPLATES.find(t => t.name === value);
            if (template) applyTemplateMutation.mutate(template);
          }}>
            <SelectTrigger className="w-48">
              <Copy className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Apply Template" />
            </SelectTrigger>
            <SelectContent>
              {ZONE_TEMPLATES.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingZone ? "Edit Zone" : "Add New Zone"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zone_name">Zone Name *</Label>
                    <Input
                      id="zone_name"
                      value={formData.zone_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, zone_name: e.target.value }))}
                      placeholder="e.g. Sales Floor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone_type">Zone Type</Label>
                    <Select value={formData.zone_type} onValueChange={handleZoneTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_lux">Min Lux Level</Label>
                    <Input
                      id="min_lux"
                      type="number"
                      value={formData.min_lux}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_lux: e.target.value }))}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_wattage">Max W/m²</Label>
                    <Input
                      id="max_wattage"
                      type="number"
                      step="0.1"
                      value={formData.max_wattage_per_m2}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_wattage_per_m2: e.target.value }))}
                      placeholder="e.g. 15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cct_min">CCT Min (K)</Label>
                    <Input
                      id="cct_min"
                      type="number"
                      value={formData.color_temperature_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, color_temperature_min: e.target.value }))}
                      placeholder="e.g. 3000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cct_max">CCT Max (K)</Label>
                    <Input
                      id="cct_max"
                      type="number"
                      value={formData.color_temperature_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, color_temperature_max: e.target.value }))}
                      placeholder="e.g. 4000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    step="0.01"
                    value={formData.area_m2}
                    onChange={(e) => setFormData(prev => ({ ...prev, area_m2: e.target.value }))}
                    placeholder="Optional zone area"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createZoneMutation.isPending || updateZoneMutation.isPending}>
                  {editingZone ? "Update Zone" : "Create Zone"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading zones...</div>
          ) : zones && zones.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Min Lux</TableHead>
                  <TableHead className="text-right">Max W/m²</TableHead>
                  <TableHead className="text-right">CCT Range</TableHead>
                  <TableHead className="text-right">Area (m²)</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{zone.zone_name}</TableCell>
                    <TableCell>{getZoneTypeLabel(zone.zone_type)}</TableCell>
                    <TableCell className="text-right">
                      {zone.min_lux ? `${zone.min_lux} lx` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {zone.max_wattage_per_m2 ? `${zone.max_wattage_per_m2}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {zone.color_temperature_min || zone.color_temperature_max
                        ? `${zone.color_temperature_min || "?"}-${zone.color_temperature_max || "?"}K`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {zone.area_m2 ? zone.area_m2.toFixed(1) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(zone)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteZoneMutation.mutate(zone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No zones defined yet.</p>
              <p className="text-sm">Add zones manually or apply a template to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
