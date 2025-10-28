import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ScaleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (metersPerPixel: number) => void;
  pixelLength: number;
}

export function ScaleDialog({ open, onClose, onConfirm, pixelLength }: ScaleDialogProps) {
  const [distance, setDistance] = useState('');

  const handleConfirm = () => {
    const meters = parseFloat(distance);
    if (!isNaN(meters) && meters > 0) {
      onConfirm(meters / pixelLength);
      onClose();
      setDistance('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Scale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You drew a line of {pixelLength.toFixed(2)} pixels.
            Enter the real-world distance in meters:
          </p>
          <div>
            <Label htmlFor="distance">Distance (meters)</Label>
            <Input
              id="distance"
              type="number"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g., 5.0"
            />
          </div>
          <Button onClick={handleConfirm} className="w-full">
            Set Scale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
