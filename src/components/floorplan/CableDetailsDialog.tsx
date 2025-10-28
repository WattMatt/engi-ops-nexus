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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CableType, EquipmentItem } from "./types";

interface CableDetailsDialogProps {
  open: boolean;
  equipment: EquipmentItem[]; // Pass equipment list for from/to selection
  onConfirm: (details: {
    from: string;
    to: string;
    cableType: string;
    terminationCount?: number;
    startHeight: number;
    endHeight: number;
    label: string;
  }) => void;
  onCancel: () => void;
}

export const CableDetailsDialog = ({ open, equipment, onConfirm, onCancel }: CableDetailsDialogProps) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cableType, setCableType] = useState<CableType>("2.5mm");
  const [startHeight, setStartHeight] = useState("0");
  const [endHeight, setEndHeight] = useState("0");
  const [terminations, setTerminations] = useState("0");
  const [label, setLabel] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Build equipment list with names for dropdowns
  const equipmentOptions = equipment.map(eq => ({
    value: eq.id,
    label: `${eq.type} (${eq.id.substring(0, 8)}...)`
  }));

  // Add "Custom" option
  const fromOptions = [{ value: "custom", label: "Custom..." }, ...equipmentOptions];
  const toOptions = [{ value: "custom", label: "Custom..." }, ...equipmentOptions];

  const handleConfirm = () => {
    const finalFrom = from === "custom" ? customFrom : equipment.find(e => e.id === from)?.type || from;
    const finalTo = to === "custom" ? customTo : equipment.find(e => e.id === to)?.type || to;
    
    onConfirm({
      from: finalFrom,
      to: finalTo,
      cableType,
      terminationCount: parseInt(terminations) || 0,
      startHeight: parseFloat(startHeight) || 0,
      endHeight: parseFloat(endHeight) || 0,
      label: label || `${finalFrom} → ${finalTo}`,
    });
    
    // Reset form
    setFrom("");
    setTo("");
    setCustomFrom("");
    setCustomTo("");
    setCableType("2.5mm");
    setStartHeight("0");
    setEndHeight("0");
    setTerminations("0");
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
            <Label htmlFor="from">Supply From</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Select source equipment" />
              </SelectTrigger>
              <SelectContent>
                {fromOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {from === "custom" && (
              <Input
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                placeholder="Enter custom source name"
                className="mt-2"
              />
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="to">Supply To</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination equipment" />
              </SelectTrigger>
              <SelectContent>
                {toOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {to === "custom" && (
              <Input
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="Enter custom destination name"
                className="mt-2"
              />
            )}
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
            <Label htmlFor="terminations">Termination Count</Label>
            <Input
              id="terminations"
              type="number"
              value={terminations}
              onChange={(e) => setTerminations(e.target.value)}
              placeholder="0"
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
