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
      
      // Generate a unique group ID for this set of parallel cables
      const parallelGroupId = crypto.randomUUID();
      
      // Extract base cable tag (remove any existing parallel numbers)
      const baseCableTag = entry.base_cable_tag || 
        entry.cable_tag.replace(/\s*\(\d+\/\d+\)(\s*\(\d+\/\d+\))*\s*$/, '');
      
      // Create new entries without id, created_at, updated_at
      const newEntries = [];
      for (let i = 1; i <= numCables; i++) {
        const { id, created_at, updated_at, ...rest } = entry;
        
        newEntries.push({
          ...rest,
          cable_tag: baseCableTag, // Store base tag without numbers
          base_cable_tag: baseCableTag,
          parallel_group_id: parallelGroupId,
          cable_number: i,
          parallel_total_count: numCables, // Store original total
          load_amps: loadPerCable,
          notes: entry.notes 
            ? `${entry.notes} | Parallel cable ${i} of ${numCables}`
            : `Parallel cable ${i} of ${numCables}`,
        });
      }

      // CRITICAL: Insert new entries first and verify success
      const { data: insertedData, error: insertError } = await supabase
        .from("cable_entries")
        .insert(newEntries)
        .select();

      if (insertError) {
        throw new Error(`Failed to create parallel cables: ${insertError.message}`);
      }

      // Verify all entries were created
      if (!insertedData || insertedData.length !== numCables) {
        throw new Error(`Expected ${numCables} entries but only ${insertedData?.length || 0} were created`);
      }

      // Only delete original after successful insert and verification
      const { error: deleteError } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", entry.id);

      if (deleteError) {
        // Critical: If delete fails after successful insert, warn user but don't fail
        toast({
          title: "Partial Success",
          description: `Created ${numCables} parallel cables, but original cable could not be removed. Please delete it manually.`,
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
      // Ensure original cable is NOT deleted if anything fails
      toast({
        title: "Error",
        description: error.message || "Failed to split cable. Original cable preserved.",
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
