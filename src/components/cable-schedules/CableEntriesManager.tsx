import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Plus, Pencil, Trash2, Download, Users, RefreshCw } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import { EditCableEntryDialog } from "./EditCableEntryDialog";
import { ImportFloorPlanCablesDialog } from "./ImportFloorPlanCablesDialog";
import { ImportTenantsDialog } from "./ImportTenantsDialog";
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
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);
  
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

  const rowVirtualizer = useVirtualizer({
    count: entries?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53,
    overscan: 10,
  });

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setShowEditDialog(true);
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
              <div 
                ref={parentRef}
                className="rounded-md border overflow-auto"
                style={{ height: '600px' }}
              >
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Cable #</TableHead>
                      <TableHead>Cable Tag</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Voltage</TableHead>
                      <TableHead>Load (A)</TableHead>
                      <TableHead>Cable Type</TableHead>
                      <TableHead>Install Method</TableHead>
                      <TableHead>Cable Size</TableHead>
                      <TableHead>Length (m)</TableHead>
                      <TableHead>Supply Cost</TableHead>
                      <TableHead>Install Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                      <td style={{ position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const entry = entries[virtualRow.index];
                          return (
                            <TableRow
                              key={entry.id}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <TableCell className="font-medium">{entry.cable_number || "1"}</TableCell>
                              <TableCell className="font-medium">{entry.cable_tag}</TableCell>
                              <TableCell>{entry.from_location}</TableCell>
                              <TableCell>{entry.to_location}</TableCell>
                              <TableCell className="font-medium">{entry.quantity || 1}</TableCell>
                              <TableCell>{entry.voltage || "-"}</TableCell>
                              <TableCell>{entry.load_amps || "-"}</TableCell>
                              <TableCell>{entry.cable_type || "-"}</TableCell>
                              <TableCell className="capitalize">{entry.installation_method || "air"}</TableCell>
                              <TableCell>{entry.cable_size || "-"}</TableCell>
                              <TableCell>
                                {(entry.total_length || (entry.measured_length || 0) + (entry.extra_length || 0)).toFixed(2)}
                              </TableCell>
                              <TableCell>{formatCurrency(entry.supply_cost)}</TableCell>
                              <TableCell>{formatCurrency(entry.install_cost)}</TableCell>
                              <TableCell>{formatCurrency(entry.total_cost)}</TableCell>
                              <TableCell>{entry.notes || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(entry)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(entry)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </td>
                    </tr>
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
