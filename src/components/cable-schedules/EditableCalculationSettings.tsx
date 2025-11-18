import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap, Save, Edit, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

      const { error } = settings
        ? await supabase
            .from("cable_calculation_settings")
            .update(dataToSave)
            .eq("id", settings.id)
        : await supabase.from("cable_calculation_settings").insert(dataToSave);

      if (error) throw error;

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

  if (loading) {
    return <div>Loading calculation settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Calculation Settings</h2>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Settings
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditing(false);
              loadSettings();
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline">
              {formData.calculation_standard}
            </Badge>
            Design Standard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-2">
              <Label>Calculation Standard</Label>
              <Select
                value={formData.calculation_standard}
                onValueChange={(value) =>
                  setFormData({ ...formData, calculation_standard: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANS 10142-1">SANS 10142-1</SelectItem>
                  <SelectItem value="IEC 60364">IEC 60364</SelectItem>
                  <SelectItem value="BS 7671">BS 7671</SelectItem>
                  <SelectItem value="NEC">NEC (USA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              South African National Standard for the wiring of premises
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Voltage Drop Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>400V Maximum Drop (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.voltage_drop_limit_400v}
              onChange={(e) =>
                setFormData({ ...formData, voltage_drop_limit_400v: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>230V Maximum Drop (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.voltage_drop_limit_230v}
              onChange={(e) =>
                setFormData({ ...formData, voltage_drop_limit_230v: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Default Power Factors</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Power Circuits</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.power_factor_power}
              onChange={(e) =>
                setFormData({ ...formData, power_factor_power: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Lighting Circuits</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.power_factor_lighting}
              onChange={(e) =>
                setFormData({ ...formData, power_factor_lighting: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Motor Circuits</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.power_factor_motor}
              onChange={(e) =>
                setFormData({ ...formData, power_factor_motor: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>HVAC Circuits</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.power_factor_hvac}
              onChange={(e) =>
                setFormData({ ...formData, power_factor_hvac: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Derating Factors</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ambient Temperature Baseline (°C)</Label>
            <Input
              type="number"
              value={formData.ambient_temp_baseline}
              onChange={(e) =>
                setFormData({ ...formData, ambient_temp_baseline: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>2 Circuits Grouped</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.grouping_factor_2_circuits}
              onChange={(e) =>
                setFormData({ ...formData, grouping_factor_2_circuits: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>3 Circuits Grouped</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.grouping_factor_3_circuits}
              onChange={(e) =>
                setFormData({ ...formData, grouping_factor_3_circuits: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>4+ Circuits Grouped</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.grouping_factor_4plus_circuits}
              onChange={(e) =>
                setFormData({ ...formData, grouping_factor_4plus_circuits: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cable Sizing Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Safety Margin (multiplier)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.cable_safety_margin}
              onChange={(e) =>
                setFormData({ ...formData, cable_safety_margin: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground">e.g., 1.15 = 15% safety margin</p>
          </div>
          <div className="space-y-2">
            <Label>Max Amps per Cable</Label>
            <Input
              type="number"
              value={formData.max_amps_per_cable}
              onChange={(e) =>
                setFormData({ ...formData, max_amps_per_cable: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred Amps per Cable</Label>
            <Input
              type="number"
              value={formData.preferred_amps_per_cable}
              onChange={(e) =>
                setFormData({ ...formData, preferred_amps_per_cable: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground">Target for parallel cables</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Short Circuit Constants (k-factors)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Copper k-factor</Label>
            <Input
              type="number"
              value={formData.k_factor_copper}
              onChange={(e) =>
                setFormData({ ...formData, k_factor_copper: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Aluminium k-factor</Label>
            <Input
              type="number"
              value={formData.k_factor_aluminium}
              onChange={(e) =>
                setFormData({ ...formData, k_factor_aluminium: e.target.value })
              }
              disabled={!editing}
              className={!editing ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Default Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cable Material</Label>
            <Select
              value={formData.default_cable_material}
              onValueChange={(value) =>
                setFormData({ ...formData, default_cable_material: value })
              }
              disabled={!editing}
            >
              <SelectTrigger className={!editing ? "bg-muted" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Copper">Copper</SelectItem>
                <SelectItem value="Aluminium">Aluminium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Installation Method</Label>
            <Select
              value={formData.default_installation_method}
              onValueChange={(value) =>
                setFormData({ ...formData, default_installation_method: value })
              }
              disabled={!editing}
            >
              <SelectTrigger className={!editing ? "bg-muted" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="ducts">Ducts</SelectItem>
                <SelectItem value="ground">Ground</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Insulation Type</Label>
            <Select
              value={formData.default_insulation_type}
              onValueChange={(value) =>
                setFormData({ ...formData, default_insulation_type: value })
              }
              disabled={!editing}
            >
              <SelectTrigger className={!editing ? "bg-muted" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PVC">PVC</SelectItem>
                <SelectItem value="XLPE">XLPE</SelectItem>
                <SelectItem value="EPR">EPR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
            Important:
          </p>
          <p className="text-sm text-muted-foreground">
            These settings will be applied to all new cable calculations in this project. 
            Existing cable entries will not be automatically recalculated.
          </p>
        </div>
      )}
    </div>
  );
};
