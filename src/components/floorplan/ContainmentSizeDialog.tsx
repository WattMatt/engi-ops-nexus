import { useState } from "react";
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
import { ContainmentSize } from "./types";

interface ContainmentSizeDialogProps {
  open: boolean;
  containmentType: string;
  onConfirm: (size: ContainmentSize) => void;
  onCancel: () => void;
}

export const ContainmentSizeDialog = ({ 
  open, 
  containmentType,
  onConfirm, 
  onCancel 
}: ContainmentSizeDialogProps) => {
  const [size, setSize] = useState<ContainmentSize>("150mm");

  const handleConfirm = () => {
    onConfirm(size);
    setSize("150mm");
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "cable-tray": "Cable Tray",
      "telkom-basket": "Telkom Basket",
      "security-basket": "Security Basket",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="bg-background max-w-sm">
        <DialogHeader>
          <DialogTitle>{getTypeLabel(containmentType)} Size</DialogTitle>
          <DialogDescription>
            Select the size for this containment route
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="size">Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as ContainmentSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50mm">50mm</SelectItem>
                <SelectItem value="100mm">100mm</SelectItem>
                <SelectItem value="150mm">150mm</SelectItem>
                <SelectItem value="200mm">200mm</SelectItem>
                <SelectItem value="300mm">300mm</SelectItem>
                <SelectItem value="450mm">450mm</SelectItem>
                <SelectItem value="600mm">600mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
