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

  // Reset state when dialog closes
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
      // Calculate divided load per cable
      const loadPerCable = entry.load_amps ? entry.load_amps / numCables : null;
      
      // Create new parallel cable entries BEFORE deleting original
      // This ensures we don't lose data if the insert fails
      const newEntries = [];
      for (let i = 1; i <= numCables; i++) {
        // Explicitly build the new entry object, copying only database fields
        const newEntry: any = {
          // Required fields
          cable_tag: `${entry.cable_tag} (${i}/${numCables})`,
          from_location: entry.from_location,
          to_location: entry.to_location,
          installation_method: entry.installation_method,
          
          // Modified fields for parallel configuration
          cable_number: i,
          load_amps: loadPerCable,
          notes: entry.notes 
            ? `${entry.notes} | Parallel cable ${i} of ${numCables}`
            : `Parallel cable ${i} of ${numCables}`,
          
          // Copy all other database fields
          schedule_id: entry.schedule_id,
          voltage: entry.voltage,
          cable_type: entry.cable_type,
          ohm_per_km: entry.ohm_per_km,
          extra_length: entry.extra_length,
          measured_length: entry.measured_length,
          total_length: entry.total_length,
          volt_drop: entry.volt_drop,
          cable_size: entry.cable_size,
          supply_cost: entry.supply_cost,
          install_cost: entry.install_cost,
          total_cost: entry.total_cost,
          display_order: entry.display_order,
          floor_plan_cable_id: entry.floor_plan_cable_id,
          quantity: entry.quantity,
          created_from: entry.created_from,
          floor_plan_id: entry.floor_plan_id,
          power_factor: entry.power_factor,
          ambient_temperature: entry.ambient_temperature,
          grouping_factor: entry.grouping_factor,
          thermal_insulation_factor: entry.thermal_insulation_factor,
          voltage_drop_limit: entry.voltage_drop_limit,
          circuit_type: entry.circuit_type,
          number_of_phases: entry.number_of_phases,
          core_configuration: entry.core_configuration,
          protection_device_rating: entry.protection_device_rating,
          max_demand_factor: entry.max_demand_factor,
          starting_current: entry.starting_current,
          fault_level: entry.fault_level,
          earth_fault_loop_impedance: entry.earth_fault_loop_impedance,
          calculation_method: entry.calculation_method,
          insulation_type: entry.insulation_type,
        };
        
        newEntries.push(newEntry);
      }

      // Insert new entries first
      const { data: insertedData, error: insertError } = await supabase
        .from("cable_entries")
        .insert(newEntries)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to create parallel cables: ${insertError.message}`);
      }

      console.log("Successfully inserted parallel cables:", insertedData);

      // Only delete the original entry after successful insert
      const { error: deleteError } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", entry.id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        // This is less critical - the new entries are already created
        toast({
          title: "Warning",
          description: "Parallel cables created but failed to delete original entry",
          variant: "destructive",
        });
      }

      // Invalidate all cable-entries queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["cable-entries"] });

      toast({
        title: "Success",
        description: `Split into ${numCables} parallel cables${loadPerCable ? ` with ${loadPerCable.toFixed(2)}A per cable` : ''}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Split cable error:", error);
      toast({
        title: "Error Splitting Cable",
        description: error.message || "Failed to split cable into parallel configuration",
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
            <p className="text-sm font-medium text-foreground">Split Configuration:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• {numCables} parallel cables will be created</p>
              {entry?.load_amps && (
                <p>• Each cable: {(entry.load_amps / numCables).toFixed(2)}A ({((entry.load_amps / numCables) / entry.load_amps * 100).toFixed(0)}% of total)</p>
              )}
              <p>• Cable tags: {entry?.cable_tag || 'CABLE'} (1/{numCables}), (2/{numCables}), etc.</p>
              <p className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                ⚠️ The original cable entry will be replaced with {numCables} new entries
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
