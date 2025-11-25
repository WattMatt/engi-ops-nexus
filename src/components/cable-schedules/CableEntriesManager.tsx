import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download, Users, RefreshCw, Split } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import { EditCableEntryDialog } from "./EditCableEntryDialog";
import { ImportFloorPlanCablesDialog } from "./ImportFloorPlanCablesDialog";
import { ImportTenantsDialog } from "./ImportTenantsDialog";
import { SplitParallelCablesDialog } from "./SplitParallelCablesDialog";
import { useToast } from "@/hooks/use-toast";
import { calculateCableSize } from "@/utils/cableSizing";
import { useCalculationSettings } from "@/hooks/useCalculationSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CableEntriesManagerProps {
  scheduleId: string;
}

export const CableEntriesManager = ({ scheduleId }: CableEntriesManagerProps) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportTenantsDialog, setShowImportTenantsDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  
  // Fetch calculation settings
  const { data: calcSettings } = useCalculationSettings(projectId);

  const { data: entries, refetch } = useQuery({
    queryKey: ["cable-entries", scheduleId],
    queryFn: async () => {
      // First get the schedule to get project_id
      const { data: schedule } = await supabase
        .from("cable_schedules")
        .select("project_id")
        .eq("id", scheduleId)
        .single();

      if (schedule) {
        setProjectId(schedule.project_id);
      }

      // Get all floor plan IDs for this project
      const { data: floorPlans } = await supabase
        .from("floor_plan_projects")
        .select("id")
        .eq("project_id", schedule?.project_id || "");

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      // Get cable entries linked to this schedule OR to floor plans in this project
      let query = supabase
        .from("cable_entries")
        .select("*");

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort by shop number extracted from to_location or cable_tag
      const sorted = (data || []).sort((a, b) => {
        // Extract shop numbers (e.g., "Shop 13" -> 13, "Shop 13/14 - MR DIY" -> 13)
        const shopRegex = /Shop\s+(\d+)/i;
        const matchA = (a.to_location || a.cable_tag).match(shopRegex);
        const matchB = (b.to_location || b.cable_tag).match(shopRegex);
        
        const numA = matchA ? parseInt(matchA[1], 10) : 9999;
        const numB = matchB ? parseInt(matchB[1], 10) : 9999;
        
        // If shop numbers are different, sort by number
        if (numA !== numB) {
          return numA - numB;
        }
        
        // If same shop number, sort alphabetically (handles Shop 17, Shop 17A, Shop 17B)
        return (a.to_location || a.cable_tag).localeCompare(
          b.to_location || b.cable_tag, 
          undefined, 
          { numeric: true }
        );
      });
      
      return sorted;
    },
    enabled: !!scheduleId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R 0.00";
    return `R ${value.toFixed(2)}`;
  };

  const totalCost = entries?.reduce((sum, entry) => sum + (entry.total_cost || 0), 0) || 0;

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setShowEditDialog(true);
  };

  const handleSplit = (entry: any) => {
    setSelectedEntry(entry);
    setShowSplitDialog(true);
  };

  const handleDeleteClick = (entry: any) => {
    setSelectedEntry(entry);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from("cable_entries")
        .delete()
        .eq("id", selectedEntry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cable entry deleted successfully",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedEntry(null);
    }
  };

  const handleRecalculateAll = async () => {
    if (!entries || entries.length === 0 || !calcSettings) return;

    setRecalculating(true);
    try {
      let updatedCount = 0;
      let skippedCount = 0;

      for (const entry of entries) {
        // Skip if missing required data
        if (!entry.load_amps || !entry.voltage) {
          skippedCount++;
          continue;
        }

        const material = entry.cable_type?.toLowerCase() === "copper" ? "copper" : "aluminium";
        const result = calculateCableSize({
          loadAmps: entry.load_amps,
          voltage: entry.voltage,
          totalLength: entry.total_length || 0,
          deratingFactor: 1.0,
          material: material as "copper" | "aluminium",
          installationMethod: entry.installation_method as 'air' | 'ducts' | 'ground' || 'air',
          safetyMargin: calcSettings.cable_safety_margin,
          voltageDropLimit: entry.voltage >= 400 ? calcSettings.voltage_drop_limit_400v : calcSettings.voltage_drop_limit_230v,
        });

        if (result) {
          const { error } = await supabase
            .from("cable_entries")
            .update({
              cable_size: result.recommendedSize,
              ohm_per_km: result.ohmPerKm,
              volt_drop: result.voltDrop,
              supply_cost: result.supplyCost,
              install_cost: result.installCost,
              total_cost: result.supplyCost + result.installCost,
            })
            .eq("id", entry.id);

          if (!error) {
            updatedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      toast({
        title: "Recalculation Complete",
        description: `Updated ${updatedCount} cable entries. ${skippedCount > 0 ? `Skipped ${skippedCount} entries (missing data).` : ''}`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cable Entries</CardTitle>
            <div className="flex gap-2">
              {entries && entries.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRecalculateAll}
                  disabled={recalculating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                  Recalculate All
                </Button>
              )}
              {projectId && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Import from Floor Plans
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowImportTenantsDialog(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Import Tenants
                  </Button>
                </>
              )}
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Cable Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!entries || entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cable entries yet. Add your first cable entry to get started.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-16 text-center border-b">Status</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-20 border-b">Cable #</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-44 border-b">Cable Tag</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-40 border-b">From</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-40 border-b">To</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-16 text-center border-b">Qty</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-24 border-b">Voltage</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-24 border-b">Load (A)</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-28 border-b">Cable Type</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-32 border-b">Install Method</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-28 border-b">Cable Size</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-28 border-b">Length (m)</TableHead>
                      <TableHead className="sticky top-0 bg-background z-20 px-4 py-3 w-32 text-right border-b">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {entries.map((entry) => {
                       const hasCompleteData = entry.voltage && entry.load_amps && entry.cable_size;
                       
                       // Calculate dynamic parallel cable display
                       let displayCableTag = entry.cable_tag;
                       let displayCableNumber = entry.cable_number || 1;
                       
                       if (entry.parallel_group_id && entry.parallel_total_count) {
                         // Use stored cable_number and parallel_total_count to preserve original numbering
                         const baseTag = entry.base_cable_tag || entry.cable_tag;
                         displayCableTag = `${baseTag} (${entry.cable_number}/${entry.parallel_total_count})`;
                         displayCableNumber = entry.cable_number;
                       }
                       
                       return (
                       <TableRow key={entry.id}>
                           <TableCell className="px-4 py-4 text-center">
                             {hasCompleteData ? (
                               <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Complete" />
                             ) : (
                               <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" title="Incomplete - needs voltage, load, or cable size" />
                             )}
                           </TableCell>
                           <TableCell className="px-4 py-4 font-medium">{displayCableNumber}</TableCell>
                           <TableCell className="px-4 py-4 font-medium">{displayCableTag}</TableCell>
                          <TableCell className="px-4 py-4">{entry.from_location}</TableCell>
                          <TableCell className="px-4 py-4">{entry.to_location}</TableCell>
                          <TableCell className="px-4 py-4 font-medium text-center">{entry.quantity || 1}</TableCell>
                          <TableCell className="px-4 py-4">{entry.voltage || "-"}</TableCell>
                          <TableCell className="px-4 py-4">{entry.load_amps || "-"}</TableCell>
                          <TableCell className="px-4 py-4">{entry.cable_type || "-"}</TableCell>
                          <TableCell className="px-4 py-4 capitalize">{entry.installation_method || "air"}</TableCell>
                          <TableCell className="px-4 py-4">{entry.cable_size || "-"}</TableCell>
                          <TableCell className="px-4 py-4">
                            {(entry.total_length || (entry.measured_length || 0) + (entry.extra_length || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSplit(entry)}
                                title="Split into parallel cables"
                              >
                                <Split className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(entry)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                    </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Card className="w-64">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total Cost:</span>
                      <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {projectId && (
        <>
          <ImportFloorPlanCablesDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            scheduleId={scheduleId}
            projectId={projectId}
            onSuccess={() => {
              refetch();
              setShowImportDialog(false);
            }}
          />
          <ImportTenantsDialog
            open={showImportTenantsDialog}
            onOpenChange={setShowImportTenantsDialog}
            scheduleId={scheduleId}
            projectId={projectId}
            onSuccess={() => {
              refetch();
              setShowImportTenantsDialog(false);
            }}
          />
        </>
      )}

      <AddCableEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        scheduleId={scheduleId}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
        }}
      />

      {selectedEntry && (
        <SplitParallelCablesDialog
          open={showSplitDialog}
          onOpenChange={setShowSplitDialog}
          entry={selectedEntry}
          onSuccess={refetch}
        />
      )}

      {selectedEntry && (
        <EditCableEntryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          entry={selectedEntry}
          onSuccess={() => {
            refetch();
            setShowEditDialog(false);
            setSelectedEntry(null);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cable Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cable entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
