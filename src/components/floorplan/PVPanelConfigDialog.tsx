import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PVPanelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { length: number; width: number; wattage: number }) => void;
  initialConfig?: { length: number; width: number; wattage: number };
}

export const PVPanelConfigDialog = ({ open, onOpenChange, onConfirm, initialConfig }: PVPanelConfigDialogProps) => {
  const [length, setLength] = useState(initialConfig?.length || 1.7);
  const [width, setWidth] = useState(initialConfig?.width || 1.0);
  const [wattage, setWattage] = useState(initialConfig?.wattage || 400);

  const handleConfirm = () => {
    if (length <= 0 || width <= 0 || wattage <= 0) return;
    onConfirm({ length, width, wattage });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PV Panel Specifications</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure the solar panel specifications for this design.
          </p>

          <div>
            <Label htmlFor="length">Panel Length (meters) *</Label>
            <Input
              id="length"
              type="number"
              step="0.01"
              value={length}
              onChange={(e) => setLength(parseFloat(e.target.value))}
              placeholder="e.g., 1.7"
            />
          </div>

          <div>
            <Label htmlFor="width">Panel Width (meters) *</Label>
            <Input
              id="width"
              type="number"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value))}
              placeholder="e.g., 1.0"
            />
          </div>

          <div>
            <Label htmlFor="wattage">Panel Wattage (Wp) *</Label>
            <Input
              id="wattage"
              type="number"
              value={wattage}
              onChange={(e) => setWattage(parseInt(e.target.value))}
              placeholder="e.g., 400"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <strong>Panel Area:</strong> {(length * width).toFixed(2)} m²
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={length <= 0 || width <= 0 || wattage <= 0}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
