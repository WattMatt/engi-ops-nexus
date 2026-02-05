import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  FileCheck, 
  CheckCircle2, 
  ShoppingCart, 
  Truck, 
  Package, 
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
  CircleDashed
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  po_number: string | null;
  tracking_number: string | null;
  priority: string | null;
  location_group: string | null;
  source_type: string;
  quoted_amount: number | null;
  actual_amount: number | null;
  quote_valid_until: string | null;
  assigned_to: string | null;
  notes: string | null;
  instruction_date: string | null;
  order_date: string | null;
}

interface ProcurementItemsTableProps {
  items: ProcurementItem[];
  onEdit: (item: ProcurementItem) => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'No Status', icon: <CircleDashed className="h-3 w-3" />, color: 'bg-muted text-muted-foreground' },
  instructed: { label: 'Instructed', icon: <Clock className="h-3 w-3" />, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-3 w-3" />, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  delivered: { label: 'Delivered', icon: <Package className="h-3 w-3" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  cancelled: { label: 'Cancelled', icon: <XCircle className="h-3 w-3" />, color: 'bg-destructive/10 text-destructive' },
};

const statusOptions = [
  { value: 'pending', label: 'No Status' },
  { value: 'instructed', label: 'Instructed' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  normal: 'border-l-transparent',
  low: 'border-l-slate-300',
};

export function ProcurementItemsTable({ items, onEdit, onRefresh }: ProcurementItemsTableProps) {
  const queryClient = useQueryClient();
  const [deleteItem, setDeleteItem] = useState<ProcurementItem | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('project_procurement_items')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to update status");
      console.error(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_procurement_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      setDeleteItem(null);
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to delete item");
      console.error(error);
    }
  });

  // Group by location
  const itemsByLocation = items.reduce((acc, item) => {
    const location = item.location_group || 'General';
    if (!acc[location]) acc[location] = [];
    acc[location].push(item);
    return acc;
  }, {} as Record<string, ProcurementItem[]>);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No procurement items found</p>
          <p className="text-sm mt-1">Add items to start tracking procurement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Item</TableHead>
                <TableHead>Instructed</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(itemsByLocation).map(([location, locationItems]) => (
                <>
                  <TableRow key={`header-${location}`} className="bg-muted/50">
                    <TableCell colSpan={6} className="py-2">
                      <span className="font-medium text-sm">{location}</span>
                      <Badge variant="secondary" className="ml-2">{locationItems.length}</Badge>
                    </TableCell>
                  </TableRow>
                  {locationItems.map((item) => {
                        const status = item.status || 'pending';
                        const config = statusConfig[status] || statusConfig.pending;
                    const priorityBorder = priorityColors[item.priority || 'normal'];
                    
                    return (
                      <TableRow 
                        key={item.id} 
                        className={cn("border-l-4", priorityBorder)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {item.priority === 'critical' && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                              {item.priority === 'high' && (
                                <Badge variant="secondary" className="text-xs">High</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.instruction_date ? (
                            <span className="text-sm">
                              {new Date(item.instruction_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.order_date ? (
                            <span className="text-sm text-primary font-medium">
                              {new Date(item.order_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.expected_delivery ? (
                            <span className="text-sm">
                              {new Date(item.expected_delivery).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(value) => updateStatusMutation.mutate({ id: item.id, status: value })}
                          >
                            <SelectTrigger className={cn("h-8 text-xs", config.color)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteItem(item)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Procurement Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
