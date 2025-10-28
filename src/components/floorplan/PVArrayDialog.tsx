import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PVArrayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { rows: number; columns: number; orientation: 'portrait' | 'landscape' }) => void;
  panelWattage?: number;
}

export const PVArrayDialog = ({ open, onOpenChange, onConfirm, panelWattage }: PVArrayDialogProps) => {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(8);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  const totalPanels = rows * columns;
  const totalkWp = panelWattage ? (totalPanels * panelWattage) / 1000 : 0;

  const handleConfirm = () => {
    if (rows <= 0 || columns <= 0) return;
    onConfirm({ rows, columns, orientation });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure PV Array</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set up the array configuration before placing it on the roof.
          </p>

          <div>
            <Label htmlFor="rows">Number of Rows *</Label>
            <Input
              id="rows"
              type="number"
              min="1"
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value))}
              placeholder="e.g., 3"
            />
          </div>

          <div>
            <Label htmlFor="columns">Number of Columns *</Label>
            <Input
              id="columns"
              type="number"
              min="1"
              value={columns}
              onChange={(e) => setColumns(parseInt(e.target.value))}
              placeholder="e.g., 8"
            />
          </div>

          <div>
            <Label htmlFor="orientation">Panel Orientation</Label>
            <Select value={orientation} onValueChange={(value: any) => setOrientation(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <div><strong>Total Panels:</strong> {totalPanels}</div>
            {panelWattage && <div><strong>Total Capacity:</strong> {totalkWp.toFixed(2)} kWp</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={rows <= 0 || columns <= 0}>
            Place Array
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
