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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { CableType } from "./types";

interface LineEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineData: {
    type: string;
    cableType?: CableType;
    cableSize?: string;
    cableCount?: number;
    containmentSize?: string;
  };
  onConfirm: (data: {
    type: string;
    cableType?: CableType;
    cableSize?: string;
    cableCount?: number;
    containmentSize?: string;
  }) => void;
  onDelete: () => void;
}

export const LineEditDialog = ({
  open,
  onOpenChange,
  lineData,
  onConfirm,
  onDelete,
}: LineEditDialogProps) => {
  const [type, setType] = useState(lineData.type);
  const [cableType, setCableType] = useState<CableType | undefined>(lineData.cableType);
  const [cableSize, setCableSize] = useState(lineData.cableSize || "");
  const [cableCount, setCableCount] = useState(lineData.cableCount || 1);
  const [containmentSize, setContainmentSize] = useState(lineData.containmentSize || "");

  useEffect(() => {
    setType(lineData.type);
    setCableType(lineData.cableType);
    setCableSize(lineData.cableSize || "");
    setCableCount(lineData.cableCount || 1);
    setContainmentSize(lineData.containmentSize || "");
  }, [lineData]);

  const handleSave = () => {
    onConfirm({
      type,
      cableType,
      cableSize: cableSize || undefined,
      cableCount: cableCount || undefined,
      containmentSize: containmentSize || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this line?")) {
      onDelete();
      onOpenChange(false);
    }
  };

  const isLineType = type.startsWith("line-");
  const isContainmentType = ["cable-tray", "telkom-basket", "security-basket", "sleeves", "powerskirting", "p2000", "p8000", "p9000"].includes(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Edit Line</DialogTitle>
          <DialogDescription>
            Modify the line properties or delete it
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Line Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line-mv">Line (MV)</SelectItem>
                <SelectItem value="line-lv">Line (LV / AC)</SelectItem>
                <SelectItem value="line-dc">Line (DC)</SelectItem>
                <SelectItem value="cable-tray">Cable Tray</SelectItem>
                <SelectItem value="telkom-basket">Telkom Basket</SelectItem>
                <SelectItem value="security-basket">Security Basket</SelectItem>
                <SelectItem value="sleeves">Sleeves</SelectItem>
                <SelectItem value="powerskirting">Powerskirting</SelectItem>
                <SelectItem value="p2000">P2000 Trunking</SelectItem>
                <SelectItem value="p8000">P8000 Trunking</SelectItem>
                <SelectItem value="p9000">P9000 Trunking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLineType && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="cableType">Cable Type</Label>
                <Select value={cableType} onValueChange={(val) => setCableType(val as CableType)}>
                  <SelectTrigger id="cableType">
                    <SelectValue placeholder="Select cable type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="fire_alarm">Fire Alarm</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="lighting">Lighting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cableSize">Cable Size</Label>
                <Input
                  id="cableSize"
                  value={cableSize}
                  onChange={(e) => setCableSize(e.target.value)}
                  placeholder="e.g., 2.5mm², 4mm²"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cableCount">Number of Cables</Label>
                <Input
                  id="cableCount"
                  type="number"
                  min="1"
                  value={cableCount}
                  onChange={(e) => setCableCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </>
          )}

          {isContainmentType && (
            <div className="grid gap-2">
              <Label htmlFor="containmentSize">Containment Size</Label>
              <Select value={containmentSize} onValueChange={setContainmentSize}>
                <SelectTrigger id="containmentSize">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50mm">50mm</SelectItem>
                  <SelectItem value="100mm">100mm</SelectItem>
                  <SelectItem value="150mm">150mm</SelectItem>
                  <SelectItem value="225mm">225mm</SelectItem>
                  <SelectItem value="300mm">300mm</SelectItem>
                  <SelectItem value="450mm">450mm</SelectItem>
                  <SelectItem value="600mm">600mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
