import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  floor_plan_name: string;
  cable_entry_id: string | null;
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
      const { data: cables, error } = await supabase
        .from("floor_plan_cables")
        .select(`
          id,
          cable_type,
          label,
          from_label,
          to_label,
          length_meters,
          cable_entry_id,
          floor_plan_projects!inner(name, project_id)
        `)
        .eq("floor_plan_projects.project_id", projectId);

      if (error) throw error;

      const formattedCables = cables?.map((cable: any) => ({
        id: cable.id,
        cable_type: cable.cable_type,
        label: cable.label,
        from_label: cable.from_label,
        to_label: cable.to_label,
        length_meters: cable.length_meters,
        cable_entry_id: cable.cable_entry_id,
        floor_plan_name: cable.floor_plan_projects.name,
      })) || [];

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
      const cablesToImport = floorPlanCables.filter((cable) =>
        selectedCables.has(cable.id)
      );

      // Create cable entries for selected cables
      const entries = cablesToImport.map((cable) => ({
        schedule_id: scheduleId,
        floor_plan_cable_id: cable.id,
        cable_tag: cable.label || `${cable.from_label || "?"}-${cable.to_label || "?"}`,
        from_location: cable.from_label || "",
        to_location: cable.to_label || "",
        cable_type: cable.cable_type,
        measured_length: cable.length_meters || 0,
        extra_length: 0,
        total_length: cable.length_meters || 0,
      }));

      const { error: insertError } = await supabase
        .from("cable_entries")
        .insert(entries);

      if (insertError) throw insertError;

      // Update floor plan cables to link them
      const { error: updateError } = await supabase
        .from("floor_plan_cables")
        .update({ cable_entry_id: scheduleId })
        .in("id", Array.from(selectedCables));

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Imported ${selectedCables.size} cable(s) from floor plans`,
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

  const availableCables = floorPlanCables.filter((cable) => !cable.cable_entry_id);
  const linkedCables = floorPlanCables.filter((cable) => cable.cable_entry_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Cables from Floor Plans</DialogTitle>
          <DialogDescription>
            Select cables from floor plan drawings to import into this cable schedule.
            Cable lengths and routing will be automatically populated.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Loading floor plan cables...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableCables.length === 0 && linkedCables.length === 0 ? (
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
                      <h4 className="font-medium">Available Cables ({availableCables.length})</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCables(new Set(availableCables.map((c) => c.id)))}
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
                            <TableRow key={cable.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedCables.has(cable.id)}
                                  onCheckedChange={() => toggleCableSelection(cable.id)}
                                />
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

                {linkedCables.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground">
                      Already Imported ({linkedCables.length})
                    </h4>
                    <ScrollArea className="h-[200px] border rounded-md">
                      <Table>
                        <TableBody>
                          {linkedCables.map((cable) => (
                            <TableRow key={cable.id}>
                              <TableCell className="font-medium">{cable.floor_plan_name}</TableCell>
                              <TableCell>{cable.label || "-"}</TableCell>
                              <TableCell>{cable.from_label || "-"}</TableCell>
                              <TableCell>{cable.to_label || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">Imported</Badge>
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
            {importing ? "Importing..." : `Import ${selectedCables.size} Cable(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
