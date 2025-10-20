import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScaleDialogProps {
  open: boolean;
  pixelLength: number;
  onConfirm: (metersValue: number) => void;
  onCancel: () => void;
}

export const ScaleDialog = ({ open, pixelLength, onConfirm, onCancel }: ScaleDialogProps) => {
  const [meters, setMeters] = useState("");

  const handleSubmit = () => {
    const value = parseFloat(meters);
    if (!isNaN(value) && value > 0) {
      onConfirm(value);
      setMeters("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Set Scale</DialogTitle>
          <DialogDescription>
            Enter the real-world length of the line you just drew (in meters)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="meters">Length in Meters</Label>
            <Input
              id="meters"
              type="number"
              step="0.1"
              min="0"
              value={meters}
              onChange={(e) => setMeters(e.target.value)}
              placeholder="e.g., 5.5"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <p className="text-sm text-muted-foreground">
            This will calibrate all future measurements on this drawing.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!meters || parseFloat(meters) <= 0}>
            Set Scale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
