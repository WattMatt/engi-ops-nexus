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
  db_size_allowance: string | null;
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
  const [cablesInParallel, setCablesInParallel] = useState(1); // Track parallel cables needed
  const [loadPerCable, setLoadPerCable] = useState<number | null>(null); // Track load per cable
  const [costAlternatives, setCostAlternatives] = useState<any[]>([]); // Track alternative configurations
  const [costSavings, setCostSavings] = useState<number>(0); // Track cost savings
  const [formData, setFormData] = useState({
    cable_tag: "",
    from_location: "",
    to_location: "",
    voltage: "400", // Default to 400V
    load_amps: "",
    cable_type: "Aluminium", // Default to Aluminium
    ohm_per_km: "",
    cable_number: "1",
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
          // Fetch all tenants for the project
          const { data: tenantsData } = await supabase
            .from("tenants")
            .select("id, shop_number, shop_name, db_size_allowance")
            .eq("project_id", schedule.project_id);

          // Fetch existing cable entries to filter out already used tenants
          const { data: existingEntries } = await supabase
            .from("cable_entries")
            .select("to_location")
            .eq("schedule_id", scheduleId);

          if (tenantsData) {
            // Create set of used tenant identifiers
            const usedTenants = new Set(
              existingEntries?.map(entry => entry.to_location) || []
            );

            // Filter out already used tenants and sort numerically
            const availableTenants = tenantsData
              .filter(tenant => {
                const identifier = `${tenant.shop_number} - ${tenant.shop_name}`;
                return !usedTenants.has(identifier);
              })
              .sort((a, b) => {
                // Extract numeric part from shop_number for proper sorting
                const getNumericValue = (str: string) => {
                  const match = str.match(/\d+/);
                  return match ? parseInt(match[0], 10) : 0;
                };
                
                const numA = getNumericValue(a.shop_number);
                const numB = getNumericValue(b.shop_number);
                
                return numA - numB;
              });

            setTenants(availableTenants);
          }
        }
      };

      fetchTenants();
    }
  }, [open, scheduleId]);

  // Auto-populate load_amps from tenant's DB allowance when tenant is selected
  useEffect(() => {
    const selectedTenant = tenants.find(
      (t) => `${t.shop_number} - ${t.shop_name}` === formData.to_location
    );
    
    if (selectedTenant?.db_size_allowance) {
      // Extract amperage from DB allowance (e.g., "63A TPN DB" -> 63)
      const match = selectedTenant.db_size_allowance.match(/(\d+)\s*A/);
      if (match) {
        setFormData((prev) => ({
          ...prev,
          load_amps: match[1],
        }));
      }
    }
  }, [formData.to_location, tenants]);

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

  // Auto-calculate cable sizing based on load, voltage, and optionally length
  useEffect(() => {
    const loadAmps = parseFloat(formData.load_amps);
    const voltage = parseFloat(formData.voltage);
    const totalLength = parseFloat(formData.total_length);

    // Calculate if we have at least load and voltage
    if (loadAmps && voltage) {
      const material = formData.cable_type.toLowerCase() === "copper" ? "copper" : "aluminium";
      
      const result = calculateCableSize({
        loadAmps,
        voltage,
        totalLength: totalLength || 0, // Use 0 if no length provided yet
        deratingFactor: 0.8, // Conservative derating factor
        material: material as "copper" | "aluminium",
      });

      if (result) {
        setCablesInParallel(result.cablesInParallel);
        setLoadPerCable(result.loadPerCable);
        setCostAlternatives(result.alternatives || []);
        setCostSavings(result.costSavings || 0);
        
        setFormData((prev) => ({
          ...prev,
          cable_size: result.recommendedSize,
          ohm_per_km: result.ohmPerKm.toString(),
          volt_drop: totalLength ? result.voltDrop.toString() : "0",
          supply_cost: result.supplyCost.toString(),
          install_cost: result.installCost.toString(),
          load_amps: result.loadPerCable.toString(), // Update to show load per cable
        }));
      }
    }
  }, [formData.load_amps, formData.voltage, formData.total_length, formData.cable_type]);

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
      // Create multiple cable entries if cables are in parallel
      const entriesToCreate = [];
      
      for (let i = 0; i < cablesInParallel; i++) {
        entriesToCreate.push({
          schedule_id: scheduleId,
          cable_tag: formData.cable_tag,
          from_location: formData.from_location,
          to_location: formData.to_location,
          voltage: formData.voltage ? parseFloat(formData.voltage) : null,
          load_amps: formData.load_amps ? parseFloat(formData.load_amps) : null,
          cable_type: formData.cable_type || null,
          ohm_per_km: formData.ohm_per_km ? parseFloat(formData.ohm_per_km) : null,
          cable_number: i + 1, // Number cables 1, 2, 3, 4...
          extra_length: formData.extra_length ? parseFloat(formData.extra_length) : 0,
          measured_length: formData.measured_length ? parseFloat(formData.measured_length) : 0,
          total_length: formData.total_length ? parseFloat(formData.total_length) : 0,
          volt_drop: formData.volt_drop ? parseFloat(formData.volt_drop) : null,
          notes: cablesInParallel > 1 
            ? `Cable ${i + 1} of ${cablesInParallel} in parallel. ${formData.notes || ""}`.trim()
            : formData.notes || null,
          cable_size: formData.cable_size || null,
          supply_cost: formData.supply_cost ? parseFloat(formData.supply_cost) : 0,
          install_cost: formData.install_cost ? parseFloat(formData.install_cost) : 0,
          total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
        });
      }

      const { error } = await supabase.from("cable_entries").insert(entriesToCreate);

      if (error) throw error;

      toast({
        title: "Success",
        description: cablesInParallel > 1 
          ? `Created ${cablesInParallel} cable entries in parallel`
          : "Cable entry added successfully",
      });

      onSuccess();
      setFormData({
        cable_tag: "",
        from_location: "",
        to_location: "",
        voltage: "400", // Reset to default 400V
        load_amps: "",
        cable_type: "Aluminium", // Reset to default Aluminium
        ohm_per_km: "",
        cable_number: "1",
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
      setCablesInParallel(1);
      setLoadPerCable(null);
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
            <div className="space-y-2 col-span-2">
              {cablesInParallel > 1 && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      💰 Cost-Optimized Recommendation
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      <strong>{cablesInParallel}x {formData.cable_size}</strong> cables @ <strong>{loadPerCable?.toFixed(2)}A</strong> each
                      <br />
                      Total Cost: <strong>R {formData.total_cost}</strong>
                      {costSavings > 0 && (
                        <span className="text-green-600 dark:text-green-400"> (Saves R {costSavings.toFixed(2)})</span>
                      )}
                    </p>
                  </div>
                  
                  {costAlternatives.length > 1 && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Alternative Configurations:</p>
                      <div className="space-y-1">
                        {costAlternatives.map((alt, idx) => (
                          <div key={idx} className={`text-xs p-2 rounded ${alt.isRecommended ? 'bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-800' : 'bg-background'}`}>
                            {alt.isRecommended && <span className="text-green-600 dark:text-green-400 font-medium">✓ </span>}
                            <strong>{alt.cablesInParallel}x {alt.cableSize}</strong> @ {alt.loadPerCable.toFixed(2)}A each
                            <span className="float-right">R {alt.totalCost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {cablesInParallel === 1 && formData.cable_size && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Single cable (No.1) is sufficient for this load
                  </p>
                </div>
              )}
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
              <Label htmlFor="load_amps">Load (Amps) - Auto-filled from tenant DB allowance</Label>
              <Input
                id="load_amps"
                type="number"
                step="0.01"
                value={formData.load_amps}
                onChange={(e) =>
                  setFormData({ ...formData, load_amps: e.target.value })
                }
                placeholder="Auto-populated for tenants"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cable_type">Cable Type</Label>
              <Select
                value={formData.cable_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, cable_type: value })
                }
              >
                <SelectTrigger id="cable_type">
                  <SelectValue placeholder="Select cable type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                  <SelectItem value="Copper">Copper</SelectItem>
                </SelectContent>
              </Select>
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
