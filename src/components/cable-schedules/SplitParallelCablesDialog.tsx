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

export function SplitParallelCablesDialog({
  open,
  onOpenChange,
  entry,
  onSuccess,
}: SplitParallelCablesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [numCables, setNumCables] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNumCables(2);
      setLoading(false);
    }
    onOpenChange(newOpen);
  };

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
      const loadPerCable = entry.load_amps;
      
      // Create new entries without id, created_at, updated_at
      const newEntries = [];
      for (let i = 1; i <= numCables; i++) {
        const { id, created_at, updated_at, ...rest } = entry;
        
        newEntries.push({
          ...rest,
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

      const { error: deleteError } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", entry.id);

      if (deleteError) {
        toast({
          title: "Warning",
          description: "Parallel cables created but failed to delete original",
          variant: "destructive",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

      toast({
        title: "Success",
        description: `Created ${numCables} parallel cables`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to split cable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split Cable into Parallel Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSplit} disabled={loading || numCables < 2 || numCables > 10}>
            {loading ? "Splitting..." : `Create ${numCables} Cables`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
