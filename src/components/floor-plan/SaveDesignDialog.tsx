import { useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
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
import { toast } from "sonner";
import { saveFloorPlanProject } from "@/lib/floor-plan/supabase-database";

interface SaveDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  canvas: FabricCanvas | null;
  pdfUrl: string | null;
  scale: number | null;
  onSaved: (id: string) => void;
}

export function SaveDesignDialog({
  open,
  onOpenChange,
  userId,
  canvas,
  pdfUrl,
  scale,
  onSaved,
}: SaveDesignDialogProps) {
  const [designName, setDesignName] = useState("");
  const [designPurpose, setDesignPurpose] = useState("Budget Markup");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!designName.trim()) {
      toast.error("Please enter a design name");
      return;
    }

    if (!pdfUrl) {
      toast.error("No PDF uploaded");
      return;
    }

    if (!canvas) {
      toast.error("Canvas not initialized");
      return;
    }

    setSaving(true);

    try {
      // Save canvas state
      const canvasState = canvas.toJSON();

      // Save to database
      const id = await saveFloorPlanProject({
        userId: userId,
        name: designName,
        purpose: designPurpose as any,
        pdfUrl: pdfUrl || '',
        canvasJson: canvasState,
        scaleInfo: scale ? { pixelDistance: null, realDistance: null, ratio: scale } : undefined,
      });

      onSaved(id);
      onOpenChange(false);
      setDesignName("");
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error("Failed to save design");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Design</DialogTitle>
          <DialogDescription>
            Enter a name for your floor plan design
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Design Name</Label>
              <Input
                id="name"
                placeholder="e.g., Office Level 1 Electrical"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Design Purpose</Label>
              <select
                id="purpose"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={designPurpose}
                onChange={(e) => setDesignPurpose(e.target.value)}
              >
                <option>Budget Markup</option>
                <option>Line Shop</option>
                <option>PV Design</option>
                <option>General Electrical</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Design"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
