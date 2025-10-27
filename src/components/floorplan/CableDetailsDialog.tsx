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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CableType } from "./types";

interface CableDetailsDialogProps {
  open: boolean;
  onConfirm: (details: {
    supplyFrom: string;
    supplyTo: string;
    cableType: CableType;
    startHeight: number;
    endHeight: number;
    terminations: string;
    label?: string;
  }) => void;
  onCancel: () => void;
}

export const CableDetailsDialog = ({ open, onConfirm, onCancel }: CableDetailsDialogProps) => {
  const [supplyFrom, setSupplyFrom] = useState("");
  const [supplyTo, setSupplyTo] = useState("");
  const [cableType, setCableType] = useState<CableType>("2.5mm");
  const [startHeight, setStartHeight] = useState("0");
  const [endHeight, setEndHeight] = useState("0");
  const [terminations, setTerminations] = useState("");
  const [label, setLabel] = useState("");

  const handleConfirm = () => {
    onConfirm({
      supplyFrom,
      supplyTo,
      cableType,
      startHeight: parseFloat(startHeight) || 0,
      endHeight: parseFloat(endHeight) || 0,
      terminations,
      label: label || undefined,
    });
    
    // Reset form
    setSupplyFrom("");
    setSupplyTo("");
    setCableType("2.5mm");
    setStartHeight("0");
    setEndHeight("0");
    setTerminations("");
    setLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="bg-background max-w-md">
        <DialogHeader>
          <DialogTitle>LV/AC Cable Details</DialogTitle>
          <DialogDescription>
            Enter cable route information for the schedule
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="supplyFrom">Supply From</Label>
            <Input
              id="supplyFrom"
              value={supplyFrom}
              onChange={(e) => setSupplyFrom(e.target.value)}
              placeholder="e.g., Main Board A"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="supplyTo">Supply To</Label>
            <Input
              id="supplyTo"
              value={supplyTo}
              onChange={(e) => setSupplyTo(e.target.value)}
              placeholder="e.g., Sub Board B"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cableType">Cable Type</Label>
            <Select value={cableType} onValueChange={(v) => setCableType(v as CableType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.5mm">1.5mm²</SelectItem>
                <SelectItem value="2.5mm">2.5mm²</SelectItem>
                <SelectItem value="4mm">4mm²</SelectItem>
                <SelectItem value="6mm">6mm²</SelectItem>
                <SelectItem value="10mm">10mm²</SelectItem>
                <SelectItem value="16mm">16mm²</SelectItem>
                <SelectItem value="25mm">25mm²</SelectItem>
                <SelectItem value="35mm">35mm²</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startHeight">Start Height (m)</Label>
              <Input
                id="startHeight"
                type="number"
                step="0.1"
                value={startHeight}
                onChange={(e) => setStartHeight(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="endHeight">End Height (m)</Label>
              <Input
                id="endHeight"
                type="number"
                step="0.1"
                value={endHeight}
                onChange={(e) => setEndHeight(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="terminations">Terminations</Label>
            <Input
              id="terminations"
              value={terminations}
              onChange={(e) => setTerminations(e.target.value)}
              placeholder="e.g., Lugs, MCB"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Cable #1"
            />
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
