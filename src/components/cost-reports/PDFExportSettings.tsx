import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";
import { useState } from "react";

export interface PDFMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface PDFExportSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  margins: PDFMargins;
  onMarginsChange: (margins: PDFMargins) => void;
  onApply: () => void;
}

const DEFAULT_MARGINS: PDFMargins = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
};

export const PDFExportSettings = ({
  open,
  onOpenChange,
  margins,
  onMarginsChange,
  onApply,
}: PDFExportSettingsProps) => {
  const [localMargins, setLocalMargins] = useState<PDFMargins>(margins);

  const handleMarginChange = (key: keyof PDFMargins, value: string) => {
    const numValue = parseFloat(value) || 0;
    const validValue = Math.max(0, Math.min(50, numValue)); // Limit between 0-50mm
    setLocalMargins({ ...localMargins, [key]: validValue });
  };

  const handleApply = () => {
    onMarginsChange(localMargins);
    onApply();
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalMargins(DEFAULT_MARGINS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>PDF Export Settings</DialogTitle>
          <DialogDescription>
            Configure page margins for the PDF export. Values are in millimeters (mm).
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="top-margin">Top Margin (mm)</Label>
              <Input
                id="top-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.top}
                onChange={(e) => handleMarginChange("top", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bottom-margin">Bottom Margin (mm)</Label>
              <Input
                id="bottom-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.bottom}
                onChange={(e) => handleMarginChange("bottom", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="left-margin">Left Margin (mm)</Label>
              <Input
                id="left-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.left}
                onChange={(e) => handleMarginChange("left", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="right-margin">Right Margin (mm)</Label>
              <Input
                id="right-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.right}
                onChange={(e) => handleMarginChange("right", e.target.value)}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative border-2 border-muted rounded-lg h-48 bg-background">
              <div 
                className="absolute bg-primary/10 border-2 border-dashed border-primary/30 rounded"
                style={{
                  top: `${(localMargins.top / 297) * 100}%`,
                  bottom: `${(localMargins.bottom / 297) * 100}%`,
                  left: `${(localMargins.left / 210) * 100}%`,
                  right: `${(localMargins.right / 210) * 100}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Content Area
                </div>
              </div>
              <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                {localMargins.top}mm
              </div>
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                {localMargins.bottom}mm
              </div>
              <div className="absolute top-2 left-2 text-xs text-muted-foreground" style={{ writingMode: 'vertical-lr' }}>
                {localMargins.left}mm
              </div>
              <div className="absolute top-2 right-2 text-xs text-muted-foreground" style={{ writingMode: 'vertical-lr' }}>
                {localMargins.right}mm
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleApply}>
            Apply Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DEFAULT_MARGINS };
