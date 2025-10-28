import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoofMaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pitch: number) => void;
}

export const RoofMaskDialog = ({ open, onOpenChange, onConfirm }: RoofMaskDialogProps) => {
  const [pitch, setPitch] = useState(10);

  const handleConfirm = () => {
    if (pitch < 0 || pitch > 90) return;
    onConfirm(pitch);
    onOpenChange(false);
    setPitch(10);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roof Pitch Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the roof pitch angle for the area you just drew.
          </p>

          <div>
            <Label htmlFor="pitch">Roof Pitch (degrees) *</Label>
            <Input
              id="pitch"
              type="number"
              min="0"
              max="90"
              step="0.5"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              0° = flat roof, 45° = steep pitch
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <strong>Next Step:</strong> Use the "Roof Direction" tool to click the highest point, then the lowest point to set azimuth.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={pitch < 0 || pitch > 90}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
