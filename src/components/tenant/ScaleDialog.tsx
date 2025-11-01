import { useState, useEffect } from "react";
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
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (distance: number) => void;
}

export const ScaleDialog = ({ isOpen, onClose, onSubmit }: ScaleDialogProps) => {
  const [distance, setDistance] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDistance("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numDistance = parseFloat(distance);
    if (!isNaN(numDistance) && numDistance > 0) {
      onSubmit(numDistance);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Drawing Scale</DialogTitle>
          <DialogDescription>
            Enter the real-world length for the line you just drew to calibrate the scale.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Length (in meters)</Label>
              <Input
                id="distance"
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g., 10.5"
                autoFocus
                step="any"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!distance || parseFloat(distance) <= 0}>
              Set Scale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
