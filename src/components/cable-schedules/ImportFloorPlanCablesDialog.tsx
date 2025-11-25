import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FloorPlanCable {
  id: string;
  cable_type: string;
  label: string | null;
  from_label: string | null;
  to_label: string | null;
  length_meters: number | null;
  original_length: number | null;
  floor_plan_name: string;
  schedule_id: string | null;
  is_in_this_schedule: boolean;
}

interface ImportFloorPlanCablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  projectId: string;
  onSuccess: () => void;
}

export const ImportFloorPlanCablesDialog = ({
  open,
  onOpenChange,
  scheduleId,
  projectId,
  onSuccess,
}: ImportFloorPlanCablesDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [floorPlanCables, setFloorPlanCables] = useState<FloorPlanCable[]>([]);
  const [selectedCables, setSelectedCables] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchFloorPlanCables();
    }
  }, [open, projectId]);

  const fetchFloorPlanCables = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all cable entries from floor plans for this project
      const { data: cables, error } = await supabase
        .from("cable_entries")
        .select(`
          id,
          cable_tag,
          from_location,
          to_location,
          cable_type,
          measured_length,
          total_length,
          schedule_id,
          floor_plan_id,
          floor_plan_projects!floor_plan_id(id, name, project_id)
        `)
        .eq("created_from", "floor_plan")
        .not("floor_plan_id", "is", null);

      if (error) throw error;

      // Filter cables that belong to this project
      const projectCables = cables?.filter((cable: any) => 
        cable.floor_plan_projects?.project_id === projectId
      ) || [];

      const formattedCables = projectCables.map((cable: any) => ({
        id: cable.id,
        cable_type: cable.cable_type || "Unknown",
        label: cable.cable_tag,
        from_label: cable.from_location,
        to_label: cable.to_location,
        length_meters: cable.total_length,
        original_length: cable.total_length,
        schedule_id: cable.schedule_id,
        is_in_this_schedule: cable.schedule_id === scheduleId,
        floor_plan_name: cable.floor_plan_projects?.name || "Unknown",
      }));

      setFloorPlanCables(formattedCables);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load floor plan cables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCableSelection = (cableId: string) => {
    const newSelection = new Set(selectedCables);
    if (newSelection.has(cableId)) {
      newSelection.delete(cableId);
    } else {
      newSelection.add(cableId);
    }
    setSelectedCables(newSelection);
  };

  const handleImport = async () => {
    if (selectedCables.size === 0) {
      toast({
        title: "No cables selected",
        description: "Please select at least one cable to import",
      });
      return;
    }

    setImporting(true);
    try {
      // Simply update the cable_entries to link them to this schedule
      const { error: updateError } = await supabase
        .from("cable_entries")
        .update({ schedule_id: scheduleId })
        .in("id", Array.from(selectedCables));

    if (updateError) throw updateError;

    // Invalidate queries to force refetch
    await queryClient.invalidateQueries({ queryKey: ["cable-entries", scheduleId] });

    toast({
      title: "Success",
      description: `Linked ${selectedCables.size} cable(s) from floor plans to this schedule`,
    });

    onSuccess();
    setSelectedCables(new Set());
    onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Cables available to import (not in this schedule)
  const availableCables = floorPlanCables.filter((cable) => !cable.is_in_this_schedule);
  
  // Cables already in this schedule
  const cablesInSchedule = floorPlanCables.filter((cable) => cable.is_in_this_schedule);
  
  // Cables in other schedules
  const cablesInOtherSchedules = availableCables.filter((cable) => cable.schedule_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Cables from Floor Plans</DialogTitle>
          <DialogDescription>
            Link cables from floor plan drawings to this cable schedule.
            Lengths and routing from the floor plan will be automatically populated.
            Each cable exists only once - linking it here makes it appear in this schedule.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Loading floor plan cables...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {floorPlanCables.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No cables found in floor plans for this project.
                <br />
                Create cables in the Floor Plan tool first.
              </div>
            ) : (
              <>
                {availableCables.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Available to Import ({availableCables.filter(c => !c.schedule_id).length})
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCables(new Set(availableCables.filter(c => !c.schedule_id).map((c) => c.id)))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCables(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[400px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Floor Plan</TableHead>
                            <TableHead>Label</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Length (m)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableCables.map((cable) => (
                            <TableRow key={cable.id} className={cable.schedule_id ? "opacity-60" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedCables.has(cable.id)}
                                  onCheckedChange={() => toggleCableSelection(cable.id)}
                                  disabled={!!cable.schedule_id}
                                />
                              </TableCell>
                              <TableCell>
                                {cable.schedule_id ? (
                                  <Badge variant="secondary">In Other Schedule</Badge>
                                ) : (
                                  <Badge variant="outline">New</Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{cable.floor_plan_name}</TableCell>
                              <TableCell>{cable.label || "-"}</TableCell>
                              <TableCell>{cable.from_label || "-"}</TableCell>
                              <TableCell>{cable.to_label || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{cable.cable_type}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {cable.length_meters?.toFixed(2) || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}

                {cablesInSchedule.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">
                      Already in This Schedule ({cablesInSchedule.length})
                    </h4>
                    <ScrollArea className="h-[200px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Floor Plan</TableHead>
                            <TableHead>Label</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead className="text-right">Length (m)</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cablesInSchedule.map((cable) => (
                            <TableRow key={cable.id}>
                              <TableCell className="font-medium">{cable.floor_plan_name}</TableCell>
                              <TableCell>{cable.label || "-"}</TableCell>
                              <TableCell>{cable.from_label || "-"}</TableCell>
                              <TableCell>{cable.to_label || "-"}</TableCell>
                              <TableCell className="text-right">
                                {cable.length_meters?.toFixed(2) || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-600">Loaded</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selectedCables.size === 0}
          >
            {importing ? "Linking..." : `Link ${selectedCables.size} Cable(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
