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
import { Plus, Pencil, Trash2, BookOpen, Download } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import { EditCableEntryDialog } from "./EditCableEntryDialog";
import { CableSizingReference } from "./CableSizingReference";
import { ImportFloorPlanCablesDialog } from "./ImportFloorPlanCablesDialog";
import { useToast } from "@/hooks/use-toast";
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
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

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

      // Then get the cable entries
      const { data, error } = await supabase
        .from("cable_entries")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    enabled: !!scheduleId,
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cable Entries</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReferenceDialog(true)}>
                <BookOpen className="mr-2 h-4 w-4" />
                View Cable Tables
              </Button>
              {projectId && (
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Import from Floor Plans
                </Button>
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
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cable Tag</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Voltage</TableHead>
                      <TableHead>Load (A)</TableHead>
                      <TableHead>Cable Type</TableHead>
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
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.cable_tag}</TableCell>
                        <TableCell>{entry.from_location}</TableCell>
                        <TableCell>{entry.to_location}</TableCell>
                        <TableCell>{entry.voltage || "-"}</TableCell>
                        <TableCell>{entry.load_amps || "-"}</TableCell>
                        <TableCell>{entry.cable_type || "-"}</TableCell>
                        <TableCell>{entry.cable_size || "-"}</TableCell>
                        <TableCell>{entry.total_length?.toFixed(2) || "0.00"}</TableCell>
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
                    ))}
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

      <CableSizingReference
        open={showReferenceDialog}
        onOpenChange={setShowReferenceDialog}
      />

      {projectId && (
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
