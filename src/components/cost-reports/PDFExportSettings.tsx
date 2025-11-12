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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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

type MarginPreset = 'normal' | 'narrow' | 'wide' | 'custom';

const MARGIN_PRESETS: Record<Exclude<MarginPreset, 'custom'>, PDFMargins> = {
  normal: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  narrow: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  wide: {
    top: 30,
    bottom: 30,
    left: 30,
    right: 30,
  },
};

const DEFAULT_MARGINS: PDFMargins = MARGIN_PRESETS.normal;

export const PDFExportSettings = ({
  open,
  onOpenChange,
  margins,
  onMarginsChange,
  onApply,
}: PDFExportSettingsProps) => {
  const [localMargins, setLocalMargins] = useState<PDFMargins>(margins);
  const [selectedPreset, setSelectedPreset] = useState<MarginPreset>('custom');

  // Detect which preset is currently selected
  useEffect(() => {
    const isPreset = (preset: Exclude<MarginPreset, 'custom'>) => {
      const presetMargins = MARGIN_PRESETS[preset];
      return (
        localMargins.top === presetMargins.top &&
        localMargins.bottom === presetMargins.bottom &&
        localMargins.left === presetMargins.left &&
        localMargins.right === presetMargins.right
      );
    };

    if (isPreset('normal')) {
      setSelectedPreset('normal');
    } else if (isPreset('narrow')) {
      setSelectedPreset('narrow');
    } else if (isPreset('wide')) {
      setSelectedPreset('wide');
    } else {
      setSelectedPreset('custom');
    }
  }, [localMargins]);

  const handleMarginChange = (key: keyof PDFMargins, value: string) => {
    const numValue = parseFloat(value) || 0;
    const validValue = Math.max(0, Math.min(50, numValue)); // Limit between 0-50mm
    setLocalMargins({ ...localMargins, [key]: validValue });
  };

  const handlePresetSelect = (preset: Exclude<MarginPreset, 'custom'>) => {
    setLocalMargins(MARGIN_PRESETS[preset]);
    setSelectedPreset(preset);
  };

  const handleApply = () => {
    onMarginsChange(localMargins);
    onApply();
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalMargins(DEFAULT_MARGINS);
    setSelectedPreset('normal');
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
          {/* Preset Selection */}
          <div className="space-y-3">
            <Label>Margin Presets</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedPreset === 'normal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('normal')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'normal' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={selectedPreset === 'narrow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('narrow')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'narrow' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Narrow
              </Button>
              <Button
                type="button"
                variant={selectedPreset === 'wide' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('wide')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'wide' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Wide
              </Button>
            </div>
            {selectedPreset === 'custom' && (
              <p className="text-xs text-muted-foreground">
                Custom margins detected. Adjust values below or select a preset.
              </p>
            )}
            {selectedPreset !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                {selectedPreset === 'normal' && 'Standard 20mm margins on all sides'}
                {selectedPreset === 'narrow' && 'Compact 12mm margins for more content'}
                {selectedPreset === 'wide' && 'Generous 30mm margins for formal documents'}
              </p>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Custom Values
              </span>
            </div>
          </div>
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
