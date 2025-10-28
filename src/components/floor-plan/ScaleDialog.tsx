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
  onOpenChange: (open: boolean) => void;
  onSetScale: (scale: number) => void;
}

export function ScaleDialog({ open, onOpenChange, onSetScale }: ScaleDialogProps) {
  const [scaleValue, setScaleValue] = useState("100");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scale = parseFloat(scaleValue);
    if (scale > 0) {
      onSetScale(scale);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Drawing Scale</DialogTitle>
          <DialogDescription>
            Enter the scale of the floor plan (e.g., 1:100 means enter 100)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scale">Scale Ratio (1:X)</Label>
              <Input
                id="scale"
                type="number"
                placeholder="100"
                value={scaleValue}
                onChange={(e) => setScaleValue(e.target.value)}
                min="1"
                step="any"
              />
              <p className="text-sm text-muted-foreground">
                Common scales: 50, 100, 200
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Set Scale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
