import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableCalculationSettingsProps {
  projectId: string;
}

export const EditableCalculationSettings = ({ projectId }: EditableCalculationSettingsProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    voltage_drop_limit_400v: "5.0",
    voltage_drop_limit_230v: "3.0",
    power_factor_power: "0.85",
    power_factor_lighting: "0.95",
    power_factor_motor: "0.80",
    power_factor_hvac: "0.85",
    ambient_temp_baseline: "30",
    grouping_factor_2_circuits: "0.80",
    grouping_factor_3_circuits: "0.70",
    grouping_factor_4plus_circuits: "0.65",
    cable_safety_margin: "1.15",
    max_amps_per_cable: "400",
    preferred_amps_per_cable: "300",
    k_factor_copper: "115",
    k_factor_aluminium: "76",
    calculation_standard: "SANS 10142-1",
    default_installation_method: "air",
    default_cable_material: "Aluminium",
    default_insulation_type: "PVC",
  });

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cable_calculation_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings(data);
        setFormData({
          voltage_drop_limit_400v: data.voltage_drop_limit_400v?.toString() || "5.0",
          voltage_drop_limit_230v: data.voltage_drop_limit_230v?.toString() || "3.0",
          power_factor_power: data.power_factor_power?.toString() || "0.85",
          power_factor_lighting: data.power_factor_lighting?.toString() || "0.95",
          power_factor_motor: data.power_factor_motor?.toString() || "0.80",
          power_factor_hvac: data.power_factor_hvac?.toString() || "0.85",
          ambient_temp_baseline: data.ambient_temp_baseline?.toString() || "30",
          grouping_factor_2_circuits: data.grouping_factor_2_circuits?.toString() || "0.80",
          grouping_factor_3_circuits: data.grouping_factor_3_circuits?.toString() || "0.70",
          grouping_factor_4plus_circuits: data.grouping_factor_4plus_circuits?.toString() || "0.65",
          cable_safety_margin: data.cable_safety_margin?.toString() || "1.15",
          max_amps_per_cable: data.max_amps_per_cable?.toString() || "400",
          preferred_amps_per_cable: data.preferred_amps_per_cable?.toString() || "300",
          k_factor_copper: data.k_factor_copper?.toString() || "115",
          k_factor_aluminium: data.k_factor_aluminium?.toString() || "76",
          calculation_standard: data.calculation_standard || "SANS 10142-1",
          default_installation_method: data.default_installation_method || "air",
          default_cable_material: data.default_cable_material || "Aluminium",
          default_insulation_type: data.default_insulation_type || "PVC",
        });
      }
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

  const handleSave = async () => {
    try {
      const dataToSave = {
        project_id: projectId,
        voltage_drop_limit_400v: parseFloat(formData.voltage_drop_limit_400v),
        voltage_drop_limit_230v: parseFloat(formData.voltage_drop_limit_230v),
        power_factor_power: parseFloat(formData.power_factor_power),
        power_factor_lighting: parseFloat(formData.power_factor_lighting),
        power_factor_motor: parseFloat(formData.power_factor_motor),
        power_factor_hvac: parseFloat(formData.power_factor_hvac),
        ambient_temp_baseline: parseInt(formData.ambient_temp_baseline),
        grouping_factor_2_circuits: parseFloat(formData.grouping_factor_2_circuits),
        grouping_factor_3_circuits: parseFloat(formData.grouping_factor_3_circuits),
        grouping_factor_4plus_circuits: parseFloat(formData.grouping_factor_4plus_circuits),
        cable_safety_margin: parseFloat(formData.cable_safety_margin),
        max_amps_per_cable: parseInt(formData.max_amps_per_cable),
        preferred_amps_per_cable: parseInt(formData.preferred_amps_per_cable),
        k_factor_copper: parseInt(formData.k_factor_copper),
        k_factor_aluminium: parseInt(formData.k_factor_aluminium),
        calculation_standard: formData.calculation_standard,
        default_installation_method: formData.default_installation_method,
        default_cable_material: formData.default_cable_material,
        default_insulation_type: formData.default_insulation_type,
      };

      if (settings) {
        const { error } = await supabase
          .from("cable_calculation_settings")
          .update(dataToSave)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cable_calculation_settings")
          .insert([dataToSave]);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Calculation settings saved successfully",
      });
      setEditing(false);
      loadSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {loading && <p className="text-muted-foreground">Loading settings...</p>}
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculation Standards & Formulas
          </h3>
          <p className="text-sm text-muted-foreground">SANS 10142-1 compliant calculations</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit Settings
          </Button>
        ) : (
          <div className="space-x-2">
            <Button onClick={() => setEditing(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </div>

      {/* Standard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">{formData.calculation_standard}</Badge>
            Design Standard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!editing ? (
            <p className="text-sm text-muted-foreground">
              South African National Standard for the wiring of premises
            </p>
          ) : (
            <Input
              value={formData.calculation_standard}
              onChange={(e) => setFormData({ ...formData, calculation_standard: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      {/* Current Carrying Capacity - only in view mode */}
      {!editing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Current Carrying Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-1">
              <div><span className="text-primary font-bold">I<sub>z</sub></span> = Design Current (A)</div>
              <div><span className="text-primary font-bold">I<sub>b</sub></span> = Load Current (A)</div>
              <div><span className="text-primary font-bold">I<sub>n</sub></span> = Protection Device Rating (A)</div>
              <div className="pt-2 border-t border-border/50">
                Required: <span className="text-primary font-bold">I<sub>z</sub> ≥ I<sub>n</sub> ≥ I<sub>b</sub></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cable must handle protection device rating, which must be ≥ load current
            </p>
          </CardContent>
        </Card>
      )}

      {/* Derating */}
      <Card>
        <CardHeader>
          <CardTitle>Derating Factors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editing ? (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs">
                <div className="text-primary font-bold mb-2">Effective Rating = I<sub>rated</sub> × C<sub>a</sub> × C<sub>g</sub> × C<sub>i</sub></div>
                <div className="space-y-1 text-muted-foreground">
                  <div>C<sub>a</sub> = Ambient Temperature Factor</div>
                  <div>C<sub>g</sub> = Grouping Factor (multiple circuits)</div>
                  <div>C<sub>i</sub> = Thermal Insulation Factor</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background p-2 rounded border">
                  <div className="text-muted-foreground">Ambient Temp</div>
                  <div className="font-semibold">{formData.ambient_temp_baseline}°C baseline</div>
                  <div className="text-[10px] text-muted-foreground">+5°C = 0.91×, +10°C = 0.82×</div>
                </div>
                <div className="bg-background p-2 rounded border">
                  <div className="text-muted-foreground">Grouping</div>
                  <div className="font-semibold">2 circuits = {formData.grouping_factor_2_circuits}×</div>
                  <div className="text-[10px] text-muted-foreground">3 = {formData.grouping_factor_3_circuits}×, 4+ = {formData.grouping_factor_4plus_circuits}×</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ambient Temp (°C)</Label>
                <Input
                  type="number"
                  value={formData.ambient_temp_baseline}
                  onChange={(e) => setFormData({ ...formData, ambient_temp_baseline: e.target.value })}
                />
              </div>
              <div>
                <Label>2 circuits</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.grouping_factor_2_circuits}
                  onChange={(e) => setFormData({ ...formData, grouping_factor_2_circuits: e.target.value })}
                />
              </div>
              <div>
                <Label>3 circuits</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.grouping_factor_3_circuits}
                  onChange={(e) => setFormData({ ...formData, grouping_factor_3_circuits: e.target.value })}
                />
              </div>
              <div>
                <Label>4+ circuits</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.grouping_factor_4plus_circuits}
                  onChange={(e) => setFormData({ ...formData, grouping_factor_4plus_circuits: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voltage Drop */}
      <Card>
        <CardHeader>
          <CardTitle>Voltage Drop Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editing ? (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
                <div>
                  <div className="text-amber-600 dark:text-amber-400 font-bold mb-1">3-Phase Circuits:</div>
                  <div>Vd = √3 × I<sub>b</sub> × L × (R×cos φ + X×sin φ)</div>
                </div>
                <div>
                  <div className="text-amber-600 dark:text-amber-400 font-bold mb-1">Single-Phase Circuits:</div>
                  <div>Vd = 2 × I<sub>b</sub> × L × (R×cos φ + X×sin φ)</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">400V Max Drop</p>
                  <p className="font-semibold">{formData.voltage_drop_limit_400v}%</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground">230V Max Drop</p>
                  <p className="font-semibold">{formData.voltage_drop_limit_230v}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>400V Limit (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.voltage_drop_limit_400v}
                  onChange={(e) => setFormData({ ...formData, voltage_drop_limit_400v: e.target.value })}
                />
              </div>
              <div>
                <Label>230V Limit (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.voltage_drop_limit_230v}
                  onChange={(e) => setFormData({ ...formData, voltage_drop_limit_230v: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Power Factor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!editing ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground">Typical</p>
                <p className="font-semibold">{formData.power_factor_power}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground">Lighting</p>
                <p className="font-semibold">{formData.power_factor_lighting}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground">Motors</p>
                <p className="font-semibold">{formData.power_factor_motor}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground">HVAC</p>
                <p className="font-semibold">{formData.power_factor_hvac}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Power</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.power_factor_power}
                  onChange={(e) => setFormData({ ...formData, power_factor_power: e.target.value })}
                />
              </div>
              <div>
                <Label>Lighting</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.power_factor_lighting}
                  onChange={(e) => setFormData({ ...formData, power_factor_lighting: e.target.value })}
                />
              </div>
              <div>
                <Label>Motors</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.power_factor_motor}
                  onChange={(e) => setFormData({ ...formData, power_factor_motor: e.target.value })}
                />
              </div>
              <div>
                <Label>HVAC</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.power_factor_hvac}
                  onChange={(e) => setFormData({ ...formData, power_factor_hvac: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Short Circuit */}
      <Card>
        <CardHeader>
          <CardTitle>Short Circuit Protection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!editing ? (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs">
                <div className="font-bold mb-1">k²S² ≥ I²<sub>f</sub> × t</div>
                <div className="text-muted-foreground space-y-1">
                  <div>k = Material constant (Cu: {formData.k_factor_copper}, Al: {formData.k_factor_aluminium})</div>
                  <div>S = Cross-sectional area (mm²)</div>
                  <div>I<sub>f</sub> = Fault current (A)</div>
                  <div>t = Disconnection time (s)</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cable must withstand fault current until protection device operates
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Copper k</Label>
                <Input
                  type="number"
                  value={formData.k_factor_copper}
                  onChange={(e) => setFormData({ ...formData, k_factor_copper: e.target.value })}
                />
              </div>
              <div>
                <Label>Aluminium k</Label>
                <Input
                  type="number"
                  value={formData.k_factor_aluminium}
                  onChange={(e) => setFormData({ ...formData, k_factor_aluminium: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parallel Cables */}
      {!editing && (
        <Card>
          <CardHeader>
            <CardTitle>Parallel Cable Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
              <div>Load per Cable = I<sub>total</sub> / n</div>
              <div>Vd<sub>,parallel</sub> = Vd<sub>,single</sub> / n</div>
              <div className="text-muted-foreground pt-2 border-t border-border/50">
                <div>n = Number of parallel cables</div>
                <div className="mt-2"><strong>Important:</strong></div>
                <ul className="list-disc list-inside space-y-1">
                  <li>All parallel cables must be same type, size, length</li>
                  <li>Each cable must have independent protection</li>
                  <li>Maximum {formData.max_amps_per_cable}A per cable (preferred: {formData.preferred_amps_per_cable}A)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sizing Parameters - only in edit mode */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Cable Sizing Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>Safety Margin</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cable_safety_margin}
                onChange={(e) => setFormData({ ...formData, cable_safety_margin: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Amps/Cable</Label>
              <Input
                type="number"
                value={formData.max_amps_per_cable}
                onChange={(e) => setFormData({ ...formData, max_amps_per_cable: e.target.value })}
              />
            </div>
            <div>
              <Label>Preferred Amps/Cable</Label>
              <Input
                type="number"
                value={formData.preferred_amps_per_cable}
                onChange={(e) => setFormData({ ...formData, preferred_amps_per_cable: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Defaults - only in edit mode */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>Material</Label>
              <Select
                value={formData.default_cable_material}
                onValueChange={(value) => setFormData({ ...formData, default_cable_material: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Copper">Copper</SelectItem>
                  <SelectItem value="Aluminium">Aluminium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Installation</Label>
              <Select
                value={formData.default_installation_method}
                onValueChange={(value) => setFormData({ ...formData, default_installation_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="ground">Ground</SelectItem>
                  <SelectItem value="ducts">Ducts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Insulation</Label>
              <Select
                value={formData.default_insulation_type}
                onValueChange={(value) => setFormData({ ...formData, default_insulation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PVC">PVC</SelectItem>
                  <SelectItem value="XLPE">XLPE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost */}
      {!editing && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-2">
              <div className="font-bold">Total Cost = (Supply + Install) × Length × Quantity</div>
              <div className="text-muted-foreground space-y-1">
                <div>Supply = Material cost (R/m)</div>
                <div>Install = Labor + accessories (R/m)</div>
                <div>Length = Total cable run (m)</div>
                <div>Quantity = Number of parallel cables</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
