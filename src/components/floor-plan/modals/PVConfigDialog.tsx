import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PVConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: { panelLengthM: number; panelWidthM: number; panelWattage: number }) => void;
}

export function PVConfigDialog({ open, onClose, onConfirm }: PVConfigDialogProps) {
  const [config, setConfig] = useState({
    panelLengthM: 1.6,
    panelWidthM: 1.0,
    panelWattage: 400,
  });

  const handleConfirm = () => {
    onConfirm(config);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PV Panel Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="length">Panel Length (m)</Label>
            <Input
              id="length"
              type="number"
              step="0.01"
              value={config.panelLengthM}
              onChange={(e) => setConfig({ ...config, panelLengthM: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="width">Panel Width (m)</Label>
            <Input
              id="width"
              type="number"
              step="0.01"
              value={config.panelWidthM}
              onChange={(e) => setConfig({ ...config, panelWidthM: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="wattage">Panel Wattage (W)</Label>
            <Input
              id="wattage"
              type="number"
              value={config.panelWattage}
              onChange={(e) => setConfig({ ...config, panelWattage: parseInt(e.target.value) })}
            />
          </div>
          <Button onClick={handleConfirm} className="w-full">
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
