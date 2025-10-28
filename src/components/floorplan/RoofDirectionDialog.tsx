import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RoofDirectionDialogProps {
  open: boolean;
  onConfirm: (pitch: number, direction?: number) => void;
  onCancel: () => void;
}

export const RoofDirectionDialog = ({ open, onConfirm, onCancel }: RoofDirectionDialogProps) => {
  const [pitch, setPitch] = useState("0");
  const [direction, setDirection] = useState("");

  const handleConfirm = () => {
    const pitchValue = parseFloat(pitch);
    const directionValue = direction ? parseFloat(direction) : undefined;
    
    if (!isNaN(pitchValue) && pitchValue >= 0 && pitchValue <= 90) {
      onConfirm(pitchValue, directionValue);
      setPitch("0");
      setDirection("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Roof Mask</DialogTitle>
          <DialogDescription>
            Set the roof pitch angle and optional azimuth direction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pitch">Roof Pitch (degrees)</Label>
            <Input
              id="pitch"
              type="number"
              min="0"
              max="90"
              step="1"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="0-90"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              0° = flat roof, 45° = typical pitched roof
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Azimuth Direction (optional)</Label>
            <Input
              id="direction"
              type="number"
              min="0"
              max="360"
              step="1"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="0-360"
            />
            <p className="text-xs text-muted-foreground">
              0° = North, 90° = East, 180° = South, 270° = West
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!pitch || parseFloat(pitch) < 0 || parseFloat(pitch) > 90}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
