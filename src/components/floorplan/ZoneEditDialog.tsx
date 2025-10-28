import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getZoneColor, getZoneStrokeColor } from "@/lib/zoneUtils";

interface ZoneEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: {
    id: string;
    type: 'supply' | 'exclusion' | 'roof';
    name?: string;
    areaSqm?: number;
  } | null;
  onConfirm: (data: { type: 'supply' | 'exclusion' | 'roof'; name: string }) => void;
}

export const ZoneEditDialog = ({ open, onOpenChange, zone, onConfirm }: ZoneEditDialogProps) => {
  const [type, setType] = useState<'supply' | 'exclusion' | 'roof'>(zone?.type || 'supply');
  const [name, setName] = useState(zone?.name || '');

  const handleConfirm = () => {
    onConfirm({ type, name });
    onOpenChange(false);
  };

  if (!zone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Zone</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Zone Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter zone name"
            />
          </div>

          <div>
            <Label>Zone Type</Label>
            <Select value={type} onValueChange={(val) => setType(val as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supply">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: getZoneColor('supply'), borderColor: getZoneStrokeColor('supply') }}
                    />
                    Supply Zone
                  </div>
                </SelectItem>
                <SelectItem value="exclusion">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: getZoneColor('exclusion'), borderColor: getZoneStrokeColor('exclusion') }}
                    />
                    Exclusion Zone
                  </div>
                </SelectItem>
                <SelectItem value="roof">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: getZoneColor('roof'), borderColor: getZoneStrokeColor('roof') }}
                    />
                    Roof Zone
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {zone.areaSqm && (
            <div>
              <Label>Area</Label>
              <div className="text-2xl font-bold text-primary">
                {zone.areaSqm.toFixed(2)} m²
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
