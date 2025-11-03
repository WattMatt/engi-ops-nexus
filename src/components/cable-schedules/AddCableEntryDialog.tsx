import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateCableSize } from "@/utils/cableSizing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddCableEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  onSuccess: () => void;
}

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string;
}

export const AddCableEntryDialog = ({
  open,
  onOpenChange,
  scheduleId,
  onSuccess,
}: AddCableEntryDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [useCustomToLocation, setUseCustomToLocation] = useState(false);
  const [formData, setFormData] = useState({
    cable_tag: "",
    from_location: "",
    to_location: "",
    voltage: "400", // Default to 400V
    load_amps: "",
    cable_type: "",
    ohm_per_km: "",
    cable_number: "",
    quantity: "1",
    extra_length: "",
    measured_length: "",
    total_length: "",
    volt_drop: "",
    notes: "",
    cable_size: "",
    supply_cost: "",
    install_cost: "",
    total_cost: "",
  });

  // Fetch tenants when dialog opens
  useEffect(() => {
    if (open && scheduleId) {
      const fetchTenants = async () => {
        // First get the project_id from the schedule
        const { data: schedule } = await supabase
          .from("cable_schedules")
          .select("project_id")
          .eq("id", scheduleId)
          .single();

        if (schedule?.project_id) {
          // Then fetch tenants for that project
          const { data: tenantsData } = await supabase
            .from("tenants")
            .select("id, shop_number, shop_name")
            .eq("project_id", schedule.project_id)
            .order("shop_number");

          if (tenantsData) {
            setTenants(tenantsData);
          }
        }
      };

      fetchTenants();
    }
  }, [open, scheduleId]);

  // Auto-generate cable_tag
  useEffect(() => {
    const parts = [
      formData.from_location,
      formData.to_location,
      formData.voltage,
      formData.cable_number,
    ].filter(part => part && part.trim() !== "");
    
    if (parts.length > 0) {
      setFormData((prev) => ({
        ...prev,
        cable_tag: parts.join("-"),
      }));
    }
  }, [formData.from_location, formData.to_location, formData.voltage, formData.cable_number]);

  // Auto-calculate total_length
  useEffect(() => {
    const extra = parseFloat(formData.extra_length) || 0;
    const measured = parseFloat(formData.measured_length) || 0;
    setFormData((prev) => ({
      ...prev,
      total_length: (extra + measured).toString(),
    }));
  }, [formData.extra_length, formData.measured_length]);

  // Auto-calculate cable sizing based on load, voltage, and length
  useEffect(() => {
    const loadAmps = parseFloat(formData.load_amps);
    const voltage = parseFloat(formData.voltage);
    const totalLength = parseFloat(formData.total_length);

    if (loadAmps && voltage && totalLength) {
      const result = calculateCableSize({
        loadAmps,
        voltage,
        totalLength,
        deratingFactor: 0.8, // Conservative derating factor
      });

      if (result) {
        setFormData((prev) => ({
          ...prev,
          cable_size: result.recommendedSize,
          ohm_per_km: result.ohmPerKm.toString(),
          volt_drop: result.voltDrop.toString(),
          supply_cost: result.supplyCost.toString(),
          install_cost: result.installCost.toString(),
        }));
      }
    }
  }, [formData.load_amps, formData.voltage, formData.total_length]);

  // Auto-calculate total_cost
  useEffect(() => {
    const supply = parseFloat(formData.supply_cost) || 0;
    const install = parseFloat(formData.install_cost) || 0;
    setFormData((prev) => ({
      ...prev,
      total_cost: (supply + install).toString(),
    }));
  }, [formData.supply_cost, formData.install_cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("cable_entries").insert({
        schedule_id: scheduleId,
        cable_tag: formData.cable_tag,
        from_location: formData.from_location,
        to_location: formData.to_location,
        voltage: formData.voltage ? parseFloat(formData.voltage) : null,
        load_amps: formData.load_amps ? parseFloat(formData.load_amps) : null,
        cable_type: formData.cable_type || null,
        ohm_per_km: formData.ohm_per_km ? parseFloat(formData.ohm_per_km) : null,
        cable_number: formData.cable_number ? parseInt(formData.cable_number) : null,
        extra_length: formData.extra_length ? parseFloat(formData.extra_length) : 0,
        measured_length: formData.measured_length ? parseFloat(formData.measured_length) : 0,
        total_length: formData.total_length ? parseFloat(formData.total_length) : 0,
        volt_drop: formData.volt_drop ? parseFloat(formData.volt_drop) : null,
        notes: formData.notes || null,
        cable_size: formData.cable_size || null,
        supply_cost: formData.supply_cost ? parseFloat(formData.supply_cost) : 0,
        install_cost: formData.install_cost ? parseFloat(formData.install_cost) : 0,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable entry added successfully",
      });

      onSuccess();
      setFormData({
        cable_tag: "",
        from_location: "",
        to_location: "",
        voltage: "400", // Reset to default 400V
        load_amps: "",
        cable_type: "",
        ohm_per_km: "",
        cable_number: "",
        quantity: "1",
        extra_length: "",
        measured_length: "",
        total_length: "",
        volt_drop: "",
        notes: "",
        cable_size: "",
        supply_cost: "",
        install_cost: "",
        total_cost: "",
      });
      setUseCustomToLocation(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cable Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cable_tag">Cable Tag (Auto-generated) *</Label>
              <Input
                id="cable_tag"
                value={formData.cable_tag}
                readOnly
                required
                className="bg-muted"
                placeholder="Will be generated from: From-To-Voltage-Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cable_number">Cable Number</Label>
              <Input
                id="cable_number"
                type="number"
                value={formData.cable_number}
                onChange={(e) =>
                  setFormData({ ...formData, cable_number: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_location">From *</Label>
              <Input
                id="from_location"
                value={formData.from_location}
                onChange={(e) =>
                  setFormData({ ...formData, from_location: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_location">To *</Label>
              <div className="flex gap-2">
                {!useCustomToLocation ? (
                  <>
                    <Select
                      value={formData.to_location}
                      onValueChange={(value) => {
                        if (value === "_custom") {
                          setUseCustomToLocation(true);
                          setFormData({ ...formData, to_location: "" });
                        } else {
                          setFormData({ ...formData, to_location: value });
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select tenant or other" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_custom">Other (Custom)</SelectItem>
                        {tenants.map((tenant) => (
                          <SelectItem
                            key={tenant.id}
                            value={`${tenant.shop_number} - ${tenant.shop_name}`}
                          >
                            {tenant.shop_number} - {tenant.shop_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseCustomToLocation(true);
                        setFormData({ ...formData, to_location: "" });
                      }}
                    >
                      Custom
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      id="to_location"
                      value={formData.to_location}
                      onChange={(e) =>
                        setFormData({ ...formData, to_location: e.target.value })
                      }
                      required
                      placeholder="Enter custom destination"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseCustomToLocation(false);
                        setFormData({ ...formData, to_location: "" });
                      }}
                    >
                      Dropdown
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voltage">Voltage</Label>
              <Select
                value={formData.voltage}
                onValueChange={(value) =>
                  setFormData({ ...formData, voltage: value })
                }
              >
                <SelectTrigger id="voltage">
                  <SelectValue placeholder="Select voltage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400V (3-Phase)</SelectItem>
                  <SelectItem value="230">230V (Single Phase)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="load_amps">Load (Amps)</Label>
              <Input
                id="load_amps"
                type="number"
                step="0.01"
                value={formData.load_amps}
                onChange={(e) =>
                  setFormData({ ...formData, load_amps: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cable_type">Cable Type</Label>
              <Input
                id="cable_type"
                value={formData.cable_type}
                onChange={(e) =>
                  setFormData({ ...formData, cable_type: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ohm_per_km">Ohm/km (Auto-calculated)</Label>
              <Input
                id="ohm_per_km"
                type="number"
                step="0.001"
                value={formData.ohm_per_km}
                onChange={(e) =>
                  setFormData({ ...formData, ohm_per_km: e.target.value })
                }
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cable_size">Cable Size (Auto-calculated)</Label>
              <Input
                id="cable_size"
                value={formData.cable_size}
                onChange={(e) =>
                  setFormData({ ...formData, cable_size: e.target.value })
                }
                placeholder="e.g., 240mm²"
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volt_drop">Volt Drop (V) (Auto-calculated)</Label>
              <Input
                id="volt_drop"
                type="number"
                step="0.01"
                value={formData.volt_drop}
                onChange={(e) =>
                  setFormData({ ...formData, volt_drop: e.target.value })
                }
                className="bg-muted"
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra_length">Extra Length (m)</Label>
              <Input
                id="extra_length"
                type="number"
                step="0.01"
                value={formData.extra_length}
                onChange={(e) =>
                  setFormData({ ...formData, extra_length: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="measured_length">Measured Length (m)</Label>
              <Input
                id="measured_length"
                type="number"
                step="0.01"
                value={formData.measured_length}
                onChange={(e) =>
                  setFormData({ ...formData, measured_length: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_length">Total Length (m)</Label>
              <Input
                id="total_length"
                type="number"
                step="0.01"
                value={formData.total_length}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supply_cost">Supply Cost (R) (Auto-calculated)</Label>
              <Input
                id="supply_cost"
                type="number"
                step="0.01"
                value={formData.supply_cost}
                onChange={(e) =>
                  setFormData({ ...formData, supply_cost: e.target.value })
                }
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="install_cost">Install Cost (R) (Auto-calculated)</Label>
              <Input
                id="install_cost"
                type="number"
                step="0.01"
                value={formData.install_cost}
                onChange={(e) =>
                  setFormData({ ...formData, install_cost: e.target.value })
                }
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_cost">Total Cost (R)</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                value={formData.total_cost}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="e.g., See Note 14"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Cable Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
