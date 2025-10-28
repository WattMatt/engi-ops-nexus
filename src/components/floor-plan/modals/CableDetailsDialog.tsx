import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface CableDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (details: CableDetails) => void;
}

export interface CableDetails {
  fromLabel: string;
  toLabel: string;
  cableType: string;
  terminationCount: number;
  startHeight: number;
  endHeight: number;
  label?: string;
}

export function CableDetailsDialog({ open, onClose, onConfirm }: CableDetailsDialogProps) {
  const [details, setDetails] = useState<CableDetails>({
    fromLabel: '',
    toLabel: '',
    cableType: '3C+E 2.5mm²',
    terminationCount: 2,
    startHeight: 0,
    endHeight: 0,
    label: '',
  });

  const handleConfirm = () => {
    onConfirm(details);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cable Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              value={details.fromLabel}
              onChange={(e) => setDetails({ ...details, fromLabel: e.target.value })}
              placeholder="e.g., DB-01"
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={details.toLabel}
              onChange={(e) => setDetails({ ...details, toLabel: e.target.value })}
              placeholder="e.g., Socket-01"
            />
          </div>
          <div>
            <Label htmlFor="cableType">Cable Type</Label>
            <Select value={details.cableType} onValueChange={(v) => setDetails({ ...details, cableType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3C+E 2.5mm²">3C+E 2.5mm²</SelectItem>
                <SelectItem value="3C+E 4mm²">3C+E 4mm²</SelectItem>
                <SelectItem value="3C+E 6mm²">3C+E 6mm²</SelectItem>
                <SelectItem value="3C+E 10mm²">3C+E 10mm²</SelectItem>
                <SelectItem value="3C+E 16mm²">3C+E 16mm²</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="terminations">Termination Count</Label>
            <Input
              id="terminations"
              type="number"
              value={details.terminationCount}
              onChange={(e) => setDetails({ ...details, terminationCount: parseInt(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startHeight">Start Height (m)</Label>
              <Input
                id="startHeight"
                type="number"
                step="0.1"
                value={details.startHeight}
                onChange={(e) => setDetails({ ...details, startHeight: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="endHeight">End Height (m)</Label>
              <Input
                id="endHeight"
                type="number"
                step="0.1"
                value={details.endHeight}
                onChange={(e) => setDetails({ ...details, endHeight: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={details.label}
              onChange={(e) => setDetails({ ...details, label: e.target.value })}
            />
          </div>
          <Button onClick={handleConfirm} className="w-full">
            Save Cable
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
