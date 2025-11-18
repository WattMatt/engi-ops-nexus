import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Zap, DollarSign, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EditCableEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  onSuccess: () => void;
}

export const EditCableEntryDialog = ({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: EditCableEntryDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [warning, setWarning] = useState<string>("");
  const [manualOverride, setManualOverride] = useState(false);
  
  // Store the recommended cable configuration from calculation
  const calculationRef = useRef<{ 
    cableSize: string; 
    recommendedQuantity: number;
    maxCurrent: number;
    baseCosts: { supply: number; install: number };
  } | null>(null);
  const [formData, setFormData] = useState({
    cable_tag: "",
    from_location: "",
    to_location: "",
    voltage: "",
    load_amps: "",
    cable_type: "",
    installation_method: "air",
    ohm_per_km: "",
    cable_number: "",
    quantity: "",
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

  // Fetch tenants for auto-population
  useEffect(() => {
    if (open && entry) {
      const fetchTenants = async () => {
        const { data: schedule } = await supabase
          .from("cable_schedules")
          .select("project_id")
          .eq("id", entry.schedule_id)
          .maybeSingle();

        if (schedule?.project_id) {
          const { data: tenantsData } = await supabase
            .from("tenants")
            .select("id, shop_number, shop_name, db_size_allowance")
            .eq("project_id", schedule.project_id);

          if (tenantsData) {
            setTenants(sortTenantsByShopNumber(tenantsData));
          }
        }
      };

      fetchTenants();
    }
  }, [open, entry]);

  // Initialize form data only once when dialog opens with new entry
  useEffect(() => {
    if (open && entry) {
      console.log("Initializing form with entry:", entry.cable_tag);
      setFormData({
        cable_tag: entry.cable_tag || "",
        from_location: entry.from_location || "",
        to_location: entry.to_location || "",
        voltage: entry.voltage?.toString() || "",
        load_amps: entry.load_amps?.toString() || "",
        cable_type: entry.cable_type || "",
        installation_method: entry.installation_method || "air",
        ohm_per_km: entry.ohm_per_km?.toString() || "",
        cable_number: entry.cable_number?.toString() || "",
        quantity: entry.quantity?.toString() || "1",
        extra_length: entry.extra_length?.toString() || "",
        measured_length: entry.measured_length?.toString() || "",
        total_length: entry.total_length?.toString() || "",
        volt_drop: entry.volt_drop?.toString() || "",
        notes: entry.notes || "",
        cable_size: entry.cable_size || "",
        supply_cost: entry.supply_cost?.toString() || "",
        install_cost: entry.install_cost?.toString() || "",
        total_cost: entry.total_cost?.toString() || "",
      });
    }
  }, [entry?.id, open]); // Only re-init when entry ID changes or dialog opens

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

  // Auto-calculate cable sizing based on load, voltage, and length (only if not manually overridden)
  useEffect(() => {
    // Skip auto-calculation if user has manually set cable size
    if (manualOverride) {
      console.log("Manual override active, skipping auto-calculation");
      return;
    }

    const loadAmps = parseFloat(formData.load_amps);
    const voltage = parseFloat(formData.voltage);
    const totalLength = parseFloat(formData.total_length);
    const userQuantity = parseInt(formData.quantity) || 1;

    console.log("Cable calc triggered:", { loadAmps, voltage, totalLength, userQuantity });

    // Calculate if we have at least load and voltage
    if (loadAmps && voltage) {
      const material = formData.cable_type?.toLowerCase() === "copper" ? "copper" : "aluminium";
      
      // Call calculator with FULL load - it will determine parallel cables automatically
      const result = calculateCableSize({
        loadAmps: loadAmps, // Full load, not divided
        voltage,
        totalLength: totalLength || 0,
        deratingFactor: 1.0,
        material: material as "copper" | "aluminium",
        installationMethod: formData.installation_method as 'air' | 'ducts' | 'ground',
      });

      if (result) {
        console.log("Calculation result:", {
          size: result.recommendedSize,
          recommendedParallel: result.cablesInParallel,
          loadPerCable: result.loadPerCable,
          voltDrop: result.voltDrop,
          userQuantity
        });
        
        // Store recommended configuration
        const baseCostPerCable = result.supplyCost / result.cablesInParallel;
        const baseInstallPerCable = result.installCost / result.cablesInParallel;
        
        calculationRef.current = {
          cableSize: result.recommendedSize,
          recommendedQuantity: result.cablesInParallel,
          maxCurrent: result.loadPerCable * result.cablesInParallel,
          baseCosts: {
            supply: baseCostPerCable,
            install: baseInstallPerCable
          }
        };
        
        // Check if user's quantity matches recommendation
        let warningMsg = "";
        if (userQuantity < result.cablesInParallel) {
          warningMsg = `⚠️ ${userQuantity} cable(s) insufficient! Minimum ${result.cablesInParallel} required for ${loadAmps}A`;
        } else if (userQuantity > result.cablesInParallel) {
          warningMsg = `ℹ️ ${userQuantity} cables will be oversized. ${result.cablesInParallel} sufficient for ${loadAmps}A`;
        }
        setWarning(warningMsg);
        
        // Use user's quantity for costs, but show the calculated cable size
        setFormData((prev) => ({
          ...prev,
          cable_size: result.recommendedSize,
          ohm_per_km: result.ohmPerKm.toString(),
          volt_drop: result.voltDrop.toString(),
          supply_cost: (baseCostPerCable * userQuantity).toString(),
          install_cost: (baseInstallPerCable * userQuantity).toString(),
        }));
        
        // Auto-update quantity to recommended if user still has default value
        if (userQuantity === 1 && result.cablesInParallel > 1) {
          setFormData(prev => ({ ...prev, quantity: result.cablesInParallel.toString() }));
        }
      }
    }
  }, [formData.load_amps, formData.voltage, formData.total_length, formData.cable_type, formData.installation_method, formData.quantity, manualOverride]);

  // Calculate volt drop and costs based on manual cable size selection
  useEffect(() => {
    if (!manualOverride || !formData.cable_size) return;

    const loadAmps = parseFloat(formData.load_amps);
    const voltage = parseFloat(formData.voltage);
    const totalLength = parseFloat(formData.total_length);
    const quantity = parseInt(formData.quantity) || 1;

    if (!loadAmps || !voltage || !totalLength) return;

    const material = formData.cable_type?.toLowerCase() === "copper" ? "copper" : "aluminium";
    const cableTable = material === "copper" ? 
      require("@/utils/cableSizing").COPPER_CABLE_TABLE : 
      require("@/utils/cableSizing").ALUMINIUM_CABLE_TABLE;

    const selectedCable = cableTable.find((c: any) => c.size === formData.cable_size);
    if (!selectedCable) return;

    // Calculate per-cable load and volt drop
    const loadPerCable = loadAmps / quantity;
    const voltDrop3Phase = selectedCable.voltDrop3Phase;
    const voltDrop = (loadPerCable * totalLength * voltDrop3Phase) / 1000;

    setFormData(prev => ({
      ...prev,
      ohm_per_km: selectedCable.impedance.toString(),
      volt_drop: voltDrop.toString(),
      supply_cost: (selectedCable.supplyCost * totalLength * quantity).toString(),
      install_cost: (selectedCable.installCost * totalLength * quantity).toString(),
    }));

    // Set warning if cable is undersized
    const installationMethod = formData.installation_method as 'air' | 'ducts' | 'ground';
    const cableRating = installationMethod === 'air' ? selectedCable.currentRatingAir :
                        installationMethod === 'ground' ? selectedCable.currentRatingGround :
                        selectedCable.currentRatingDucts;
    
    if (loadPerCable > cableRating) {
      setWarning(`⚠️ UNDERSIZED! ${formData.cable_size} rated ${cableRating}A but carrying ${loadPerCable.toFixed(1)}A`);
    } else if (loadPerCable > cableRating * 0.85) {
      setWarning(`⚠️ High utilization: ${((loadPerCable / cableRating) * 100).toFixed(0)}% of cable rating`);
    } else {
      setWarning("");
    }
  }, [formData.cable_size, formData.load_amps, formData.voltage, formData.total_length, formData.quantity, formData.cable_type, formData.installation_method, manualOverride]);

  // Auto-calculate total_cost
  useEffect(() => {
    const supply = parseFloat(formData.supply_cost) || 0;
    const install = parseFloat(formData.install_cost) || 0;
    setFormData((prev) => ({
      ...prev,
      total_cost: (supply + install).toString(),
    }));
  }, [formData.supply_cost, formData.install_cost]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("cable_entries")
        .update({
          cable_tag: formData.cable_tag,
          from_location: formData.from_location,
          to_location: formData.to_location,
          quantity: formData.quantity ? parseInt(formData.quantity) : 1,
          voltage: formData.voltage ? parseFloat(formData.voltage) : null,
          load_amps: formData.load_amps ? parseFloat(formData.load_amps) : null,
          cable_type: formData.cable_type || null,
          installation_method: formData.installation_method || 'air',
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
        })
        .eq("id", entry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable entry updated successfully",
      });

      onSuccess();
      onOpenChange(false);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Interactive Cable Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Left Column - Input Parameters */}
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Cable Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cable_tag" className="flex items-center gap-2">
                      Cable Tag
                      <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                    </Label>
                    <Input
                      id="cable_tag"
                      value={formData.cable_tag}
                      readOnly
                      className="bg-muted font-mono"
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
                    <Label htmlFor="from_location">From Location *</Label>
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
                    <Label htmlFor="to_location">To Location *</Label>
                    <Input
                      id="to_location"
                      value={formData.to_location}
                      onChange={(e) =>
                        setFormData({ ...formData, to_location: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Electrical Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="voltage" className="cursor-help">Voltage (V)</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Operating voltage (e.g., 230V, 400V)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Input
                      id="voltage"
                      type="number"
                      step="0.01"
                      value={formData.voltage}
                      onChange={(e) =>
                        setFormData({ ...formData, voltage: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="load_amps" className="cursor-help">Load (Amps)</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Full load current - drives cable size calculation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Input
                      id="load_amps"
                      type="number"
                      step="0.01"
                      value={formData.load_amps}
                      onChange={(e) =>
                        setFormData({ ...formData, load_amps: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="quantity" className="cursor-help">Quantity</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cables in parallel reduce voltage drop</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cable_type">Cable Material</Label>
                    <Select
                      value={formData.cable_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cable_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aluminium">Aluminium</SelectItem>
                        <SelectItem value="Copper">Copper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installation_method">Installation Method</Label>
                    <Select
                      value={formData.installation_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, installation_method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="air">Air</SelectItem>
                        <SelectItem value="ducts">Ducts</SelectItem>
                        <SelectItem value="ground">Ground</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cable Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
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
                      className="font-mono"
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
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Total Length (m)
                      <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                    </Label>
                    <Input
                      type="number"
                      value={formData.total_length}
                      readOnly
                      className="bg-muted font-mono font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Calculations */}
          <div className="space-y-4">
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculated Results
                  {calculationRef.current && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      Recommended: {calculationRef.current.recommendedQuantity}× cables
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {warning && (
                  <div className={`p-3 rounded-lg border text-xs font-medium ${
                    warning.includes('insufficient') 
                      ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {warning}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="cable_size_input" className="flex items-center gap-2">
                      Cable Size
                      {manualOverride && <Badge variant="secondary" className="text-[10px]">Manual</Badge>}
                      {!manualOverride && calculationRef.current && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="cable_size_input"
                        value={formData.cable_size}
                        onChange={(e) => {
                          setManualOverride(true);
                          setFormData({ ...formData, cable_size: e.target.value });
                        }}
                        placeholder="e.g., 185mm²"
                        className="font-mono font-bold text-lg"
                      />
                      {manualOverride && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setManualOverride(false)}
                          title="Use auto-calculation"
                        >
                          Auto
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Voltage Drop</div>
                    <div className="text-xl font-bold font-mono flex items-center gap-2">
                      {formData.volt_drop ? `${parseFloat(formData.volt_drop).toFixed(2)}V` : "-"}
                      {formData.volt_drop && parseFloat(formData.volt_drop) > 10 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>High voltage drop - consider larger cable</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {formData.voltage && formData.volt_drop && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {((parseFloat(formData.volt_drop) / parseFloat(formData.voltage)) * 100).toFixed(2)}% drop
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">Resistance</div>
                    <div className="text-lg font-mono">
                      {formData.ohm_per_km ? `${parseFloat(formData.ohm_per_km).toFixed(4)} Ω/km` : "-"}
                    </div>
                  </div>

                    {formData.quantity && parseInt(formData.quantity) > 1 && calculationRef.current && (
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
                          Parallel Configuration
                        </div>
                        <div className="text-sm space-y-0.5">
                          <div>{formData.quantity}× {formData.cable_size || "cables"} in parallel</div>
                          <div className="text-xs text-muted-foreground">
                            {formData.load_amps && `${(parseFloat(formData.load_amps) / parseInt(formData.quantity)).toFixed(1)}A per cable`}
                          </div>
                          {calculationRef.current.recommendedQuantity !== parseInt(formData.quantity) && (
                            <div className="text-[10px] pt-1 border-t border-blue-500/20 mt-1">
                              System recommends: {calculationRef.current.recommendedQuantity}× cables
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/50 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Supply Cost</span>
                  <span className="font-mono font-bold">
                    R {formData.supply_cost ? parseFloat(formData.supply_cost).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Install Cost</span>
                  <span className="font-mono font-bold">
                    R {formData.install_cost ? parseFloat(formData.install_cost).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Cost</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400 font-mono">
                      R {formData.total_cost ? parseFloat(formData.total_cost).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
                {formData.quantity && parseInt(formData.quantity) > 1 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    Cost per cable: R {formData.total_cost && (parseFloat(formData.total_cost) / parseInt(formData.quantity)).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <div className="font-semibold mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Calculation Info
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <p>• Cable sizing per SANS 10142-1</p>
                <p>• Derating factor: 1.0</p>
                <p>• Material: {formData.cable_type || "Not set"}</p>
                <p>• Method: {formData.installation_method || "air"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
