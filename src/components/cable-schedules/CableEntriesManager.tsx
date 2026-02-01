import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, Users, RefreshCw, FileSpreadsheet, Loader2 } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import { EditCableEntryDialog } from "./EditCableEntryDialog";
import { ImportFloorPlanCablesDialog } from "./ImportFloorPlanCablesDialog";
import { ImportTenantsDialog } from "./ImportTenantsDialog";
import { ImportExcelCableDialog } from "./ImportExcelCableDialog";
import { SplitParallelCablesDialog } from "./SplitParallelCablesDialog";
import { VirtualizedCableTable } from "./VirtualizedCableTable";
import { PaginationControls } from "@/components/common/PaginationControls";
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

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
const DEFAULT_PAGE_SIZE = 100;

export const CableEntriesManager = ({ scheduleId }: CableEntriesManagerProps) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportTenantsDialog, setShowImportTenantsDialog] = useState(false);
  const [showImportExcelDialog, setShowImportExcelDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [floorPlanIds, setFloorPlanIds] = useState<string[]>([]);
  
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
      // Normalize shop number for matching (e.g., "Shop 45", "SHOP 11" -> "45", "11")
      const shopNumMatch = t.shop_number.match(/shop\s*(\d+[A-Za-z\/]*)/i);
      const shopNum = shopNumMatch ? shopNumMatch[1].toLowerCase() : t.shop_number.toLowerCase();
      
      // Add shop name mapping
      if (t.shop_name) {
        tenantNameMap.set(shopNum, t.shop_name);
      }
      
      // Add load mapping from db_size_scope_of_work
      if (t.db_size_scope_of_work) {
        const match = t.db_size_scope_of_work.match(/(\d+)/);
        if (match) {
          tenantLoadMap.set(shopNum, parseInt(match[1], 10));
        }
      }
    }
  });

  // First, fetch schedule info and floor plan IDs (cached)
  const { data: scheduleInfo } = useQuery({
    queryKey: ["cable-schedule-info", scheduleId],
    queryFn: async () => {
      const { data: schedule } = await supabase
        .from("cable_schedules")
        .select("project_id")
        .eq("id", scheduleId)
        .single();

      if (schedule) {
        setProjectId(schedule.project_id);
        
        // Get all floor plan IDs for this project
        const { data: floorPlans } = await supabase
          .from("floor_plan_projects")
          .select("id")
          .eq("project_id", schedule.project_id);

        const fpIds = floorPlans?.map(fp => fp.id) || [];
        setFloorPlanIds(fpIds);
        
        return { projectId: schedule.project_id, floorPlanIds: fpIds };
      }
      return null;
    },
    enabled: !!scheduleId,
    staleTime: 60000, // Cache for 1 minute
  });

  // Build OR filter for query
  const orFilter = floorPlanIds.length > 0 
    ? `schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})` 
    : undefined;

  // Get total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["cable-entries-count", scheduleId, floorPlanIds],
    queryFn: async () => {
      let query = supabase
        .from("cable_entries")
        .select("*", { count: 'exact', head: true });

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!scheduleId && !!scheduleInfo,
    staleTime: 30000,
  });

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Paginated cable entries query
  const { data: entries = [], refetch, isLoading, isFetching } = useQuery({
    queryKey: ["cable-entries", scheduleId, floorPlanIds, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("cable_entries")
        .select("*")
        .range(from, to)
        .order("display_order");

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort by shop number extracted from to_location or cable_tag, then by cable_number
      const sorted = (data || []).sort((a, b) => {
        const shopRegex = /Shop\s+(\d+)/i;
        const matchA = (a.to_location || a.cable_tag).match(shopRegex);
        const matchB = (b.to_location || b.cable_tag).match(shopRegex);
        
        const numA = matchA ? parseInt(matchA[1], 10) : 9999;
        const numB = matchB ? parseInt(matchB[1], 10) : 9999;
        
        if (numA !== numB) {
          return numA - numB;
        }
        
        const baseTagA = a.base_cable_tag || a.cable_tag;
        const baseTagB = b.base_cable_tag || b.cable_tag;
        const locationCompare = (a.to_location || baseTagA).localeCompare(
          b.to_location || baseTagB, 
          undefined, 
          { numeric: true }
        );
        
        if (locationCompare !== 0) {
          return locationCompare;
        }
        
        return (a.cable_number || 0) - (b.cable_number || 0);
      });
      
      return sorted;
    },
    enabled: !!scheduleId && !!scheduleInfo,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 10000,
  });

  // Get total cost across all pages
  const { data: totalCostData } = useQuery({
    queryKey: ["cable-entries-total-cost", scheduleId, floorPlanIds],
    queryFn: async () => {
      let query = supabase
        .from("cable_entries")
        .select("total_cost");

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return round(sum((data || []).map(e => e.total_cost)), 2);
    },
    enabled: !!scheduleId && !!scheduleInfo,
    staleTime: 30000,
  });

  const totalCost = totalCostData || 0;

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R 0.00";
    return `R ${round(value, 2).toFixed(2)}`;
  };

  

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
          // Extract shop number and normalize (handle "Shop 11", "SHOP 11", "shop 11", etc.)
          const shopMatch = entry.to_location.match(/Shop\s+(\d+[A-Za-z\/]*)/i);
          if (shopMatch) {
            const shopNum = shopMatch[1].toLowerCase();
            loadAmps = tenantLoadMap.get(shopNum) || null;
          }
        }

        // Default voltage to 400 if not set
        const voltage = entry.voltage || 400;

        // Skip if still missing load amps
        if (!loadAmps) {
          skippedCount++;
          continue;
        }

        const material = entry.cable_type?.toLowerCase() === "copper" ? "copper" : "aluminium";
        const result = calculateCableSize({
          loadAmps: loadAmps,
          voltage: voltage,
          totalLength: entry.total_length || entry.measured_length || 0,
          deratingFactor: 1.0,
          material: material as "copper" | "aluminium",
          installationMethod: entry.installation_method as 'air' | 'ducts' | 'ground' || 'air',
          safetyMargin: calcSettings.cable_safety_margin,
          voltageDropLimit: voltage >= 400 ? calcSettings.voltage_drop_limit_400v : calcSettings.voltage_drop_limit_230v,
        });

        if (result) {
          const { error } = await supabase
            .from("cable_entries")
            .update({
              voltage: voltage,
              load_amps: loadAmps,
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
            <CardTitle className="flex items-center gap-2">
              Cable Entries
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <div className="flex gap-2">
              {totalCount > 0 && (
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
                  <Button variant="outline" size="sm" onClick={() => setShowImportExcelDialog(true)}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import Excel
                  </Button>
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
            {/* Top Pagination Controls */}
            {totalCount > 0 && (
              <PaginationControls
                pagination={{
                  page,
                  pageSize,
                  totalCount,
                  totalPages,
                }}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                isLoading={isFetching}
              />
            )}

            {/* Loading state */}
            {isLoading && (!entries || entries.length === 0) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <VirtualizedCableTable
                entries={entries || []}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onSplit={handleSplit}
                tenantLoadMap={tenantLoadMap}
                tenantNameMap={tenantNameMap}
              />
            )}

            {/* Bottom: Pagination + Total Cost */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between">
                <PaginationControls
                  pagination={{
                    page,
                    pageSize,
                    totalCount,
                    totalPages,
                  }}
                  onPageChange={setPage}
                  showPageSizeSelector={false}
                  isLoading={isFetching}
                />
                <Card className="w-72">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Total Cost (All Pages):</span>
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
          <ImportExcelCableDialog
            open={showImportExcelDialog}
            onOpenChange={setShowImportExcelDialog}
            scheduleId={scheduleId}
            onSuccess={() => {
              refetch();
              setShowImportExcelDialog(false);
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
