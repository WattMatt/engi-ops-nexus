import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, Users, RefreshCw } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import { EditCableEntryDialog } from "./EditCableEntryDialog";
import { ImportFloorPlanCablesDialog } from "./ImportFloorPlanCablesDialog";
import { ImportTenantsDialog } from "./ImportTenantsDialog";
import { SplitParallelCablesDialog } from "./SplitParallelCablesDialog";
import { VirtualizedCableTable } from "./VirtualizedCableTable";
import { useToast } from "@/hooks/use-toast";
import { calculateCableSize } from "@/utils/cableSizing";
import { useCalculationSettings } from "@/hooks/useCalculationSettings";
import { round, sum } from "@/utils/decimalPrecision";
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

  // Fetch tenants for the project to get SOW load values and shop names
  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-cables", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("shop_number, shop_name, db_size_scope_of_work")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Create lookup maps: shop number -> SOW load and shop number -> shop name
  const tenantLoadMap = new Map<string, number>();
  const tenantNameMap = new Map<string, string>();
  tenants?.forEach(t => {
    if (t.shop_number) {
      // Normalize shop number for matching (e.g., "Shop 45" -> "45")
      const shopNum = t.shop_number.replace(/^shop\s*/i, '').trim().toLowerCase();
      
      // Add shop name mapping
      if (t.shop_name) {
        tenantNameMap.set(shopNum, t.shop_name);
      }
      
      // Add load mapping
      if (t.db_size_scope_of_work) {
        const match = t.db_size_scope_of_work.match(/(\d+)/);
        if (match) {
          tenantLoadMap.set(shopNum, parseInt(match[1], 10));
        }
      }
    }
  });

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
      
      // Sort by shop number extracted from to_location or cable_tag, then by cable_number
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
        
        // If same shop number, compare the base tags or full locations
        const baseTagA = a.base_cable_tag || a.cable_tag;
        const baseTagB = b.base_cable_tag || b.cable_tag;
        const locationCompare = (a.to_location || baseTagA).localeCompare(
          b.to_location || baseTagB, 
          undefined, 
          { numeric: true }
        );
        
        // If locations/base tags are different, sort by location
        if (locationCompare !== 0) {
          return locationCompare;
        }
        
        // If same location/base tag (parallel cables), sort by cable_number
        return (a.cable_number || 0) - (b.cable_number || 0);
      });
      
      return sorted;
    },
    enabled: !!scheduleId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R 0.00";
    return `R ${round(value, 2).toFixed(2)}`;
  };

  const totalCost = round(sum(entries?.map(entry => entry.total_cost) || []), 2);

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
        // Try to get load_amps from tenant data if not set on entry
        let loadAmps = entry.load_amps;
        if (!loadAmps && entry.to_location) {
          const shopMatch = entry.to_location.match(/Shop\s+(\d+[A-Za-z]*)/i);
          if (shopMatch) {
            const shopNum = shopMatch[1].toLowerCase();
            loadAmps = tenantLoadMap.get(shopNum) || null;
          }
        }

        // Skip if still missing required data
        if (!loadAmps || !entry.voltage) {
          skippedCount++;
          continue;
        }

        const material = entry.cable_type?.toLowerCase() === "copper" ? "copper" : "aluminium";
        const result = calculateCableSize({
          loadAmps: loadAmps,
          voltage: entry.voltage,
          totalLength: entry.total_length || entry.measured_length || 0,
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
              load_amps: loadAmps, // Also save the load if it was pulled from tenant
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
          <div className="space-y-4">
            <VirtualizedCableTable
              entries={entries || []}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onSplit={handleSplit}
              tenantLoadMap={tenantLoadMap}
              tenantNameMap={tenantNameMap}
            />
            {entries && entries.length > 0 && (
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
            )}
          </div>
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
        onSuccess={async () => {
          await refetch();
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
          tenantLoadMap={tenantLoadMap}
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
