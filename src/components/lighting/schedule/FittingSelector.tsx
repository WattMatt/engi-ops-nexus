import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface FittingSelectorProps {
  projectId: string;
}

interface LightingFitting {
  id: string;
  fitting_code: string;
  model_name: string;
  manufacturer: string | null;
  wattage: number | null;
  lumen_output: number | null;
  color_temperature: number | null;
  fitting_type: string | null;
  image_url: string | null;
}

interface ScheduleItem {
  id: string;
  project_id: string;
  fitting_id: string;
  zone_id: string | null;
  tenant_id: string | null;
  quantity: number;
  notes: string | null;
  lighting_fittings: LightingFitting;
  lighting_zones?: { zone_name: string } | null;
  tenants?: { shop_name: string; shop_number: string } | null;
}

export function FittingSelector({ projectId }: FittingSelectorProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFitting, setSelectedFitting] = useState<LightingFitting | null>(null);
  const [formData, setFormData] = useState({
    zone_id: "",
    tenant_id: "",
    quantity: "1",
    notes: "",
  });

  // Fetch all fittings from library
  const { data: fittings, isLoading: fittingsLoading } = useQuery({
    queryKey: ["lighting-fittings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lighting_fittings")
        .select("id, fitting_code, model_name, manufacturer, wattage, lumen_output, color_temperature, fitting_type, image_url")
        .order("fitting_code");
      if (error) throw error;
      return data as LightingFitting[];
    },
  });

  // Fetch zones for this project
  const { data: zones } = useQuery({
    queryKey: ["lighting-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lighting_zones")
        .select("id, zone_name")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch tenants for this project
  const { data: tenants } = useQuery({
    queryKey: ["project-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number")
        .eq("project_id", projectId)
        .order("shop_number");
      if (error) throw error;
      return data;
    },
  });

  // Fetch current schedule items
  const { data: scheduleItems, isLoading: scheduleLoading } = useQuery({
    queryKey: ["lighting-schedule-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_lighting_schedules")
        .select(`
          *,
          lighting_fittings (
            id,
            fitting_code,
            model_name,
            manufacturer,
            wattage,
            lumen_output,
            color_temperature,
            fitting_type,
            image_url
          ),
          lighting_zones (zone_name),
          tenants (shop_name, shop_number)
        `)
        .eq("project_id", projectId);
      if (error) throw error;
      return data as ScheduleItem[];
    },
  });

  const addToScheduleMutation = useMutation({
    mutationFn: async (data: {
      fitting_id: string;
      zone_id: string | null;
      tenant_id: string | null;
      quantity: number;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from("project_lighting_schedules")
        .insert({
          project_id: projectId,
          fitting_id: data.fitting_id,
          zone_id: data.zone_id || null,
          tenant_id: data.tenant_id || null,
          quantity: data.quantity,
          notes: data.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-schedule-items", projectId] });
      toast.success("Fitting added to schedule");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add fitting: " + error.message);
    },
  });

  const removeFromScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_lighting_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-schedule-items", projectId] });
      toast.success("Fitting removed from schedule");
    },
    onError: (error) => {
      toast.error("Failed to remove fitting: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedFitting(null);
    setFormData({
      zone_id: "",
      tenant_id: "",
      quantity: "1",
      notes: "",
    });
    setIsDialogOpen(false);
  };

  const handleSelectFitting = (fitting: LightingFitting) => {
    setSelectedFitting(fitting);
    setIsDialogOpen(true);
  };

  const handleAddToSchedule = () => {
    if (!selectedFitting) return;

    const quantity = parseInt(formData.quantity) || 1;
    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    addToScheduleMutation.mutate({
      fitting_id: selectedFitting.id,
      zone_id: formData.zone_id || null,
      tenant_id: formData.tenant_id || null,
      quantity,
      notes: formData.notes.trim() || null,
    });
  };

  const filteredFittings = fittings?.filter((f) => {
    const query = searchQuery.toLowerCase();
    return (
      f.fitting_code.toLowerCase().includes(query) ||
      f.model_name.toLowerCase().includes(query) ||
      f.manufacturer?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Current Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Schedule ({scheduleItems?.length || 0} items)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scheduleLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : scheduleItems && scheduleItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fitting</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Wattage</TableHead>
                  <TableHead className="text-right">Lumens</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.lighting_fittings.fitting_code}</span>
                        <p className="text-xs text-muted-foreground">{item.lighting_fittings.model_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.lighting_zones?.zone_name || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {item.tenants ? (
                        <span>{item.tenants.shop_number} - {item.tenants.shop_name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.lighting_fittings.wattage 
                        ? `${item.lighting_fittings.wattage * item.quantity}W`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.lighting_fittings.lumen_output
                        ? `${(item.lighting_fittings.lumen_output * item.quantity).toLocaleString()} lm`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromScheduleMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No fittings assigned yet.</p>
              <p className="text-sm">Select fittings from your library below.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fitting Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fitting Library</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fittings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fittingsLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading fittings...</div>
          ) : filteredFittings && filteredFittings.length > 0 ? (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead className="text-right">Wattage</TableHead>
                    <TableHead className="text-right">Lumens</TableHead>
                    <TableHead className="text-right">CCT</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFittings.map((fitting) => (
                    <TableRow key={fitting.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                          {fitting.image_url ? (
                            <img 
                              src={fitting.image_url} 
                              alt={fitting.model_name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Lightbulb className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{fitting.fitting_code}</TableCell>
                      <TableCell>{fitting.model_name}</TableCell>
                      <TableCell>{fitting.manufacturer || "-"}</TableCell>
                      <TableCell className="text-right">
                        {fitting.wattage ? `${fitting.wattage}W` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {fitting.lumen_output ? `${fitting.lumen_output.toLocaleString()} lm` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {fitting.color_temperature ? `${fitting.color_temperature}K` : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectFitting(fitting)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No fittings match your search." : "No fittings in library yet."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fitting to Schedule</DialogTitle>
          </DialogHeader>
          {selectedFitting && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="font-medium">{selectedFitting.fitting_code}</div>
                <div className="text-sm text-muted-foreground">{selectedFitting.model_name}</div>
                <div className="flex gap-2 mt-2">
                  {selectedFitting.wattage && (
                    <Badge variant="secondary">{selectedFitting.wattage}W</Badge>
                  )}
                  {selectedFitting.lumen_output && (
                    <Badge variant="secondary">{selectedFitting.lumen_output} lm</Badge>
                  )}
                  {selectedFitting.color_temperature && (
                    <Badge variant="secondary">{selectedFitting.color_temperature}K</Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone">Assign to Zone</Label>
                  <Select 
                    value={formData.zone_id || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, zone_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No zone</SelectItem>
                      {zones?.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.zone_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant">Assign to Tenant</Label>
                  <Select 
                    value={formData.tenant_id || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tenant_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No tenant</SelectItem>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.shop_number} - {tenant.shop_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddToSchedule} disabled={addToScheduleMutation.isPending}>
              Add to Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
