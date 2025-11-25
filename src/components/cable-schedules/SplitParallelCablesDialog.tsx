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
      
      const newEntries = [];
      for (let i = 1; i <= numCables; i++) {
        const { id, created_at, updated_at, ...entryWithoutMetadata } = entry;
        
        newEntries.push({
          ...entryWithoutMetadata,
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

      if (insertError) {
        throw insertError;
      }

      const { error: deleteError } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", entry.id);

      if (deleteError) {
        toast({
          title: "Warning",
          description: "Parallel cables created but failed to delete original entry",
          variant: "destructive",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

      toast({
        title: "Success",
        description: `Created ${numCables} parallel cables${loadPerCable ? ` - each carrying ${loadPerCable.toFixed(2)}A` : ''}`,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Split Cable into Parallel Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium text-foreground mb-2">Original Cable:</p>
              <div className="space-y-1 text-muted-foreground pl-3 border-l-2 border-border">
                <p><span className="font-medium">Tag:</span> {entry?.cable_tag || 'N/A'}</p>
                <p><span className="font-medium">From:</span> {entry?.from_location || 'N/A'}</p>
                <p><span className="font-medium">To:</span> {entry?.to_location || 'N/A'}</p>
                {entry?.load_amps && (
                  <p><span className="font-medium">Total Load:</span> {entry.load_amps.toFixed(2)}A</p>
                )}
                {entry?.cable_size && (
                  <p><span className="font-medium">Cable Size:</span> {entry.cable_size}</p>
                )}
              </div>
            </div>
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
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Each parallel cable will carry an equal share of the load
            </p>
          </div>
          
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Parallel Configuration:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• {numCables} parallel cables will be created</p>
              {entry?.load_amps && (
                <p>• Each cable carries: {entry.load_amps.toFixed(2)}A</p>
              )}
              <p>• Cable tags: {entry?.cable_tag || 'CABLE'} (1/{numCables}), (2/{numCables}), etc.</p>
              {entry?.load_amps && (
                <p>• Total system load: {(entry.load_amps * numCables).toFixed(2)}A</p>
              )}
              <p className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                ⚠️ The original cable entry will be replaced with {numCables} new parallel entries
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSplit} 
            disabled={loading || numCables < 2 || numCables > 10 || !entry}
          >
            {loading ? "Splitting..." : `Create ${numCables} Parallel Cables`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
