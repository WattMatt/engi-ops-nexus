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
import { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE } from "@/utils/cableSizing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

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
  });

  useEffect(() => {
    if (entry && open) {
      setFormData({
        cable_tag: entry.cable_tag || "",
        from_location: entry.from_location || "",
        to_location: entry.to_location || "",
        voltage: entry.voltage?.toString() || "400",
        load_amps: entry.load_amps?.toString() || "",
        cable_type: entry.cable_type || "Aluminium",
        installation_method: entry.installation_method || "air",
        cable_size: entry.cable_size || "",
        measured_length: entry.measured_length?.toString() || "",
        notes: entry.notes || "",
      });
    }
  }, [entry, open]);

  // Auto-suggest cable size when load changes
  useEffect(() => {
    if (formData.load_amps) {
      const loadAmps = parseFloat(formData.load_amps);
      if (!isNaN(loadAmps) && loadAmps > 0) {
        const cableTable = formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE;
        const installMethod = formData.installation_method as 'ground' | 'ducts' | 'air';
        
        const suitableCable = cableTable.find(cable => {
          const rating = installMethod === 'ground' ? cable.currentRatingGround :
                        installMethod === 'ducts' ? cable.currentRatingDucts :
                        cable.currentRatingAir;
          return rating >= loadAmps * 1.15;
        });
        
        if (suitableCable) {
          setSuggestedCableSize(suitableCable.size);
        }
      }
    }
  }, [formData.load_amps, formData.cable_type, formData.installation_method]);

  // Calculate voltage drop
  useEffect(() => {
    if (formData.cable_size && formData.measured_length && formData.load_amps && formData.voltage) {
      const cableTable = formData.cable_type === "Copper" ? COPPER_CABLE_TABLE : ALUMINIUM_CABLE_TABLE;
      const selectedCable = cableTable.find(c => c.size === formData.cable_size);
      
      if (selectedCable) {
        const length = parseFloat(formData.measured_length);
        const loadAmps = parseFloat(formData.load_amps);
        const voltage = parseFloat(formData.voltage);
        
        if (!isNaN(length) && !isNaN(loadAmps) && !isNaN(voltage)) {
          const voltDropValue = voltage === 400 ? selectedCable.voltDrop3Phase : selectedCable.voltDrop1Phase;
          const voltDrop = (voltDropValue * loadAmps * length) / 1000;
          const voltDropPercent = (voltDrop / voltage) * 100;
          
          setCalculatedVoltDrop(voltDropPercent);
          
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
      const { error } = await supabase
        .from("cable_entries")
        .update({
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Cable Entry</DialogTitle>
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
              />
            </div>

            <div>
              <Label htmlFor="from_location">From Location *</Label>
              <Input
                id="from_location"
                value={formData.from_location}
                onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="to_location">To Location *</Label>
            <Input
              id="to_location"
              value={formData.to_location}
              onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
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
                <SelectContent>
                  <SelectItem value="230">230V (Single Phase)</SelectItem>
                  <SelectItem value="400">400V (Three Phase)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="load_amps">Load (Amps) *</Label>
              <Input
                id="load_amps"
                type="number"
                value={formData.load_amps}
                onChange={(e) => setFormData({ ...formData, load_amps: e.target.value })}
              />
            </div>
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
                <SelectContent>
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
                <SelectContent>
                  <SelectItem value="ground">Underground</SelectItem>
                  <SelectItem value="ducts">In Ducts</SelectItem>
                  <SelectItem value="air">In Air / On Tray</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cable Size with Suggestion */}
          <div>
            <Label htmlFor="cable_size">Cable Size (mm²)</Label>
            {suggestedCableSize && suggestedCableSize !== formData.cable_size && (
              <Badge variant="secondary" className="ml-2">
                Suggested: {suggestedCableSize}
              </Badge>
            )}
            <Input
              id="cable_size"
              value={formData.cable_size}
              onChange={(e) => setFormData({ ...formData, cable_size: e.target.value })}
              placeholder={suggestedCableSize ? `Suggested: ${suggestedCableSize}` : "e.g., 16"}
            />
          </div>

          {/* Length */}
          <div>
            <Label htmlFor="measured_length">Cable Length (m)</Label>
            <Input
              id="measured_length"
              type="number"
              value={formData.measured_length}
              onChange={(e) => setFormData({ ...formData, measured_length: e.target.value })}
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
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
