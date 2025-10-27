import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ruler, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScaleEditDialogProps {
  open: boolean;
  currentScale: number; // meters per pixel
  calibrationPoints?: { x: number; y: number }[];
  onConfirm: (newScale: number) => void;
  onCancel: () => void;
}

export const ScaleEditDialog = ({ 
  open, 
  currentScale, 
  calibrationPoints,
  onConfirm, 
  onCancel 
}: ScaleEditDialogProps) => {
  const [scaleMeters, setScaleMeters] = useState(currentScale.toString());
  const [error, setError] = useState("");

  useEffect(() => {
    setScaleMeters(currentScale.toFixed(6));
  }, [currentScale]);

  const handleConfirm = () => {
    const value = parseFloat(scaleMeters);
    if (isNaN(value) || value <= 0) {
      setError("Please enter a valid positive number");
      return;
    }
    onConfirm(value);
  };

  const pixelsPerMeter = currentScale > 0 ? (1 / currentScale).toFixed(2) : "N/A";
  const scaleFactor = currentScale > 0 ? `1:${Math.round(1 / currentScale)}` : "N/A";

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Edit Scale Calibration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Changing the scale will automatically resize all equipment and recalculate cable lengths.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Current Scale</Label>
                <Badge variant="secondary" className="mt-1 text-sm">
                  {currentScale.toFixed(6)} m/px
                </Badge>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Scale Factor</Label>
                <Badge variant="secondary" className="mt-1 text-sm">
                  {scaleFactor}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Pixels per Meter</Label>
              <Badge variant="outline" className="mt-1 text-sm">
                {pixelsPerMeter} px/m
              </Badge>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="scale-value">
              New Scale (meters per pixel)
            </Label>
            <Input
              id="scale-value"
              type="number"
              step="0.000001"
              value={scaleMeters}
              onChange={(e) => {
                setScaleMeters(e.target.value);
                setError("");
              }}
              placeholder="e.g., 0.01"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {calibrationPoints && calibrationPoints.length === 2 && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <p className="font-medium mb-1">Calibration Reference Points:</p>
              <p>Point 1: ({calibrationPoints[0].x.toFixed(0)}, {calibrationPoints[0].y.toFixed(0)})</p>
              <p>Point 2: ({calibrationPoints[1].x.toFixed(0)}, {calibrationPoints[1].y.toFixed(0)})</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply New Scale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
