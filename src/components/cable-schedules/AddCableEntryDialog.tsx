import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
import { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE, calculateCableSize } from "@/utils/cableSizing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { InputWithSuffix } from "@/components/ui/input-with-suffix";

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
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [suggestedCableSize, setSuggestedCableSize] = useState<string>("");
  const [calculatedVoltDrop, setCalculatedVoltDrop] = useState<number | null>(null);
  const [voltDropWarning, setVoltDropWarning] = useState<string>("");
  
  const [formData, setFormData] = useState({
    cable_tag: "",
    from_location: "",
    to_location: "",
    voltage: "400",
    load_amps: "",
    cable_type: "Aluminium",
    installation_method: "air",
    cable_size: "",
    measured_length: "",
    notes: "",
    circuit_type: "power",
  });

  useEffect(() => {
    if (open && scheduleId) {
      const fetchTenants = async () => {
        const { data: schedule } = await supabase
          .from("cable_schedules")
          .select("project_id")
          .eq("id", scheduleId)
          .single();

        if (schedule?.project_id) {
          setProjectId(schedule.project_id);
          const { data: tenantsData } = await supabase
            .from("tenants")
            .select("id, shop_number, shop_name, db_size_allowance")
            .eq("project_id", schedule.project_id);

          const { data: existingEntries } = await supabase
            .from("cable_entries")
            .select("to_location")
            .eq("schedule_id", scheduleId);

          if (tenantsData) {
            const usedToLocations = existingEntries?.map((e) => e.to_location) || [];
            const availableTenants = tenantsData.filter(
              (t) => !usedToLocations.includes(`${t.shop_number} - ${t.shop_name}`)
            );
            setTenants(availableTenants);
          }
        }
      };

      fetchTenants();
    }
  }, [open, scheduleId]);

  // Auto-suggest cable size when load changes - now accounts for circuit types
  useEffect(() => {
    if (formData.load_amps && formData.measured_length) {
      const loadAmps = parseFloat(formData.load_amps);
      const length = parseFloat(formData.measured_length);
      const voltage = parseFloat(formData.voltage);
      
      if (!isNaN(loadAmps) && loadAmps > 0 && !isNaN(length) && length > 0) {
        // Apply circuit-type specific multipliers for starting current/diversity
        let adjustedLoad = loadAmps;
        switch (formData.circuit_type) {
          case 'motor':
            adjustedLoad = loadAmps * 1.5; // Motors: 5-7x starting current requires larger cable
            break;
          case 'hvac':
            adjustedLoad = loadAmps * 1.3; // HVAC: moderate starting surge
            break;
          case 'lighting':
            adjustedLoad = loadAmps * 1.1; // Lighting: minimal inrush
            break;
          case 'power':
          default:
            adjustedLoad = loadAmps * 1.15; // Standard outlets
            break;
        }
        
        const result = calculateCableSize({
          loadAmps: adjustedLoad,
          voltage: voltage,
          totalLength: length,
          material: formData.cable_type === "Copper" ? "copper" : "aluminium",
          installationMethod: formData.installation_method as 'air' | 'ducts' | 'ground',
          safetyMargin: 1.0, // Already applied in adjustedLoad
        });
        
        if (result) {
          setSuggestedCableSize(result.recommendedSize);
          if (!formData.cable_size) {
            setFormData(prev => ({ ...prev, cable_size: result.recommendedSize }));
          }
        }
      }
    }
  }, [formData.load_amps, formData.cable_type, formData.installation_method, formData.circuit_type, formData.measured_length, formData.voltage]);

  // Calculate voltage drop when length or cable size changes
  useEffect(() => {
    if (formData.cable_size && formData.measured_length && formData.load_amps && formData.voltage) {
      const cableTable = formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE;
      const selectedCable = cableTable.find(c => c.size === formData.cable_size);
      
      if (selectedCable) {
        const length = parseFloat(formData.measured_length);
        const loadAmps = parseFloat(formData.load_amps);
        const voltage = parseFloat(formData.voltage);
        
        if (!isNaN(length) && !isNaN(loadAmps) && !isNaN(voltage)) {
          // Voltage drop calculation: V = I × R × L
          // Using 3-phase voltage drop from table (mV/A/m)
          const voltDropValue = voltage === 400 ? selectedCable.voltDrop3Phase : selectedCable.voltDrop1Phase;
          const voltDrop = (voltDropValue * loadAmps * length) / 1000;
          const voltDropPercent = (voltDrop / voltage) * 100;
          
          setCalculatedVoltDrop(voltDropPercent);
          
          // Set warning if voltage drop exceeds limit
          const limit = voltage === 400 ? 5.0 : 3.0;
          if (voltDropPercent > limit) {
            setVoltDropWarning(`Voltage drop ${voltDropPercent.toFixed(2)}% exceeds ${limit}% limit for ${voltage}V`);
          } else {
            setVoltDropWarning("");
          }
        }
      }
    }
  }, [formData.cable_size, formData.measured_length, formData.load_amps, formData.voltage, formData.cable_type]);

  const handleSubmit = async () => {
    if (!formData.cable_tag || !formData.from_location || !formData.to_location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("cable_entries").insert({
        schedule_id: scheduleId,
        cable_tag: formData.cable_tag,
        from_location: formData.from_location,
        to_location: formData.to_location,
        voltage: parseFloat(formData.voltage) || 400,
        load_amps: parseFloat(formData.load_amps) || null,
        cable_type: formData.cable_type,
        installation_method: formData.installation_method,
        cable_size: formData.cable_size || null,
        measured_length: parseFloat(formData.measured_length) || null,
        volt_drop: calculatedVoltDrop || null,
        notes: formData.notes || null,
        quantity: 1,
        circuit_type: formData.circuit_type,
      });

      if (error) throw error;

      // Invalidate all cable-entries queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

      toast({
        title: "Success",
        description: "Cable entry added successfully",
      });
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        cable_tag: "",
        from_location: "",
        to_location: "",
        voltage: "400",
        load_amps: "",
        cable_type: "Aluminium",
        installation_method: "air",
        cable_size: "",
        measured_length: "",
        notes: "",
        circuit_type: "power",
      });
      setSuggestedCableSize("");
      setCalculatedVoltDrop(null);
      setVoltDropWarning("");
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

  const handleTenantSelect = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setFormData({
        ...formData,
        to_location: `${tenant.shop_number} - ${tenant.shop_name}`,
        cable_tag: tenant.shop_number,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cable Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cable_tag">Cable Tag *</Label>
              <Input
                id="cable_tag"
                value={formData.cable_tag}
                onChange={(e) => setFormData({ ...formData, cable_tag: e.target.value })}
                placeholder="e.g., CB-001"
              />
            </div>

            <div>
              <Label htmlFor="from_location">From Location *</Label>
              <Input
                id="from_location"
                value={formData.from_location}
                onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                placeholder="e.g., Main DB"
              />
            </div>
          </div>

          {/* Tenant Selection */}
          {tenants.length > 0 && (
            <div>
              <Label htmlFor="tenant_select">Select Tenant (Optional)</Label>
              <Select onValueChange={handleTenantSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant or enter custom location" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.shop_number} - {tenant.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="to_location">To Location *</Label>
            <Input
              id="to_location"
              value={formData.to_location}
              onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
              placeholder="e.g., Shop 001 - ABC Store"
            />
          </div>

          {/* Voltage and Load */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="voltage">Voltage (V) *</Label>
              <Select
                value={formData.voltage}
                onValueChange={(value) => setFormData({ ...formData, voltage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="230">230V (Single Phase)</SelectItem>
                  <SelectItem value="400">400V (Three Phase)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="load_amps">Load *</Label>
              <InputWithSuffix
                id="load_amps"
                type="number"
                suffix="A"
                value={formData.load_amps}
                onChange={(e) => setFormData({ ...formData, load_amps: e.target.value })}
                placeholder="e.g., 32"
              />
            </div>
          </div>

          {/* Circuit Type */}
          <div>
            <Label htmlFor="circuit_type">Circuit Type (affects cable sizing)</Label>
            <Select
              value={formData.circuit_type}
              onValueChange={(value) => setFormData({ ...formData, circuit_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="motor">Motor Load (1.5x - High starting current)</SelectItem>
                <SelectItem value="hvac">HVAC Load (1.3x - Moderate surge)</SelectItem>
                <SelectItem value="lighting">Lighting Load (1.1x - Low inrush)</SelectItem>
                <SelectItem value="power">Power/Outlets (1.15x - Standard)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cable Type and Installation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cable_type">Cable Material</Label>
              <Select
                value={formData.cable_type}
                onValueChange={(value) => setFormData({ ...formData, cable_type: value, cable_size: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Copper">Copper</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="installation_method">Installation Method</Label>
              <Select
                value={formData.installation_method}
                onValueChange={(value) => setFormData({ ...formData, installation_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="ground">Underground</SelectItem>
                  <SelectItem value="ducts">In Ducts</SelectItem>
                  <SelectItem value="air">In Air / On Tray</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cable Size with Suggestion */}
          <div>
            <Label htmlFor="cable_size">Cable Size</Label>
            {suggestedCableSize && (
              <Badge variant="secondary" className="ml-2">
                Suggested: {suggestedCableSize}
              </Badge>
            )}
            <Select
              value={formData.cable_size}
              onValueChange={(value) => setFormData({ ...formData, cable_size: value })}
            >
              <SelectTrigger id="cable_size">
                <SelectValue placeholder={suggestedCableSize ? `Suggested: ${suggestedCableSize}` : "Select cable size"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {(formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE).map((cable) => (
                  <SelectItem key={cable.size} value={cable.size}>
                    {cable.size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Length */}
          <div>
            <Label htmlFor="measured_length">Cable Length</Label>
            <InputWithSuffix
              id="measured_length"
              type="number"
              suffix="m"
              value={formData.measured_length}
              onChange={(e) => setFormData({ ...formData, measured_length: e.target.value })}
              placeholder="e.g., 50"
            />
          </div>

          {/* Voltage Drop Display */}
          {calculatedVoltDrop !== null && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <span className="font-medium">Voltage Drop:</span>
                <span className={calculatedVoltDrop > 5 ? "text-destructive" : "text-foreground"}>
                  {calculatedVoltDrop.toFixed(2)}%
                </span>
              </div>
              {voltDropWarning && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {voltDropWarning}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
