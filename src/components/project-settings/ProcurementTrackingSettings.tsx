import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Package, GripVertical } from "lucide-react";
import { AddProcurementItemDialog } from "./AddProcurementItemDialog";
import { EditProcurementItemDialog } from "./EditProcurementItemDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ProcurementTrackingSettingsProps {
  projectId: string;
}

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  source_item_id: string | null;
  supplier_name: string | null;
  expected_delivery: string | null;
  status: string;
  notes: string | null;
  display_order: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: 'Not Started', variant: 'outline' },
  pending_quote: { label: 'Pending Quote', variant: 'secondary' },
  quote_received: { label: 'Quote Received', variant: 'secondary' },
  pending_approval: { label: 'Pending Approval', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  ordered: { label: 'Ordered', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function ProcurementTrackingSettings({ projectId }: ProcurementTrackingSettingsProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const { data: procurementItems, isLoading } = useQuery({
    queryKey: ['project-procurement-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_procurement_items')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as ProcurementItem[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('project_procurement_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-procurement-items', projectId] });
      toast.success('Procurement item deleted');
      setDeleteItemId(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete item: ' + error.message);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Procurement Tracking
              </CardTitle>
              <CardDescription>
                Configure items to track in the Contractor Portal procurement tab
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {procurementItems && procurementItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procurementItems.map((item) => {
                  const config = statusConfig[item.status] || statusConfig.not_started;
                  return (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingItem(item)}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.name}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.source_type === 'final_account' ? 'PC Item' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.supplier_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.expected_delivery 
                          ? new Date(item.expected_delivery).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteItemId(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No procurement items configured</p>
              <p className="text-sm mt-1">
                Add items to track them in the Contractor Portal
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddProcurementItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['project-procurement-items', projectId] });
          setAddDialogOpen(false);
        }}
      />

      {editingItem && (
        <EditProcurementItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['project-procurement-items', projectId] });
            setEditingItem(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Procurement Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from tracking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteItemId && deleteMutation.mutate(deleteItemId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
