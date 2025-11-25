import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SplitParallelCablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  onSuccess: () => void;
}

export const SplitParallelCablesDialog = ({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: SplitParallelCablesDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [numCables, setNumCables] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleSplit = async () => {
    if (numCables < 2 || numCables > 10) {
      toast({
        title: "Invalid Number",
        description: "Please enter a number between 2 and 10",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate divided load per cable
      const loadPerCable = entry.load_amps ? entry.load_amps / numCables : null;
      
      // Delete the original entry
      const { error: deleteError } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", entry.id);

      if (deleteError) throw deleteError;

      // Create new parallel cable entries
      const newEntries = [];
      for (let i = 1; i <= numCables; i++) {
        const { id, created_at, updated_at, ...entryWithoutIds } = entry;
        newEntries.push({
          ...entryWithoutIds,
          cable_tag: `${entry.cable_tag} (${i}/${numCables})`,
          cable_number: i,
          load_amps: loadPerCable,
          notes: entry.notes 
            ? `${entry.notes} | Parallel cable ${i} of ${numCables}`
            : `Parallel cable ${i} of ${numCables}`,
        });
      }

      const { error: insertError } = await supabase
        .from("cable_entries")
        .insert(newEntries);

      if (insertError) throw insertError;

      // Invalidate all cable-entries queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

      toast({
        title: "Success",
        description: `Split into ${numCables} parallel cables with ${loadPerCable?.toFixed(2)}A per cable`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split into Parallel Cables</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Split <span className="font-semibold">{entry?.cable_tag}</span> into multiple parallel cables.
            </p>
            <p className="text-sm text-muted-foreground">
              Current load: <span className="font-semibold">{entry?.load_amps?.toFixed(2)}A</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numCables">Number of Parallel Cables (2-10)</Label>
            <Input
              id="numCables"
              type="number"
              min={2}
              max={10}
              value={numCables}
              onChange={(e) => setNumCables(parseInt(e.target.value) || 2)}
            />
          </div>
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="text-sm font-medium">Result:</p>
            <p className="text-sm text-muted-foreground">
              {numCables} cables × {entry?.load_amps ? (entry.load_amps / numCables).toFixed(2) : 0}A per cable
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSplit} disabled={loading}>
            {loading ? "Splitting..." : "Split Cables"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
