import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Package, Calendar, FileText, MapPin, ClipboardList } from "lucide-react";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string | null;
  supplier_name: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  po_number: string | null;
  tracking_number: string | null;
  priority: string | null;
  notes: string | null;
  location_group: string | null;
  instruction_date?: string | null;
  order_date?: string | null;
}

interface ContractorEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcurementItem;
  contractorName: string;
  onSuccess: () => void;
}

export function ContractorEditItemDialog({
  open,
  onOpenChange,
  item,
  contractorName,
  onSuccess
}: ContractorEditItemDialogProps) {
  const queryClient = useQueryClient();
  const [orderDate, setOrderDate] = useState(item.order_date || '');
  const [expectedDelivery, setExpectedDelivery] = useState(item.expected_delivery || '');
  const [notes, setNotes] = useState(item.notes || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Determine status based on dates
      let newStatus = 'instructed';
      if (orderDate) {
        newStatus = 'ordered';
      }
      
      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          order_date: orderDate || null,
          expected_delivery: expectedDelivery || null,
          notes: notes || null,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-procurement'] });
      toast.success("Item updated successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update item");
    }
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Update Procurement Item
          </DialogTitle>
          <DialogDescription>
            Enter order date and expected delivery information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info (Read-only) */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              {item.priority && item.priority !== 'normal' && (
                <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'}>
                  {item.priority}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {item.category && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {item.category}
                </span>
              )}
              {item.location_group && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location_group}
                </span>
              )}
            </div>
          </div>

          {/* Instruction Date (Read-only) */}
          <div className="rounded-lg border p-3 bg-primary/5">
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="font-medium">Instruction Tabled:</span>
              <span>{formatDate(item.instruction_date)}</span>
            </div>
          </div>

          <Separator />

          {/* Editable Fields - Contractor populates these */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Order Given Date
              </Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Date the order was placed with the supplier
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expected Delivery Date
              </Label>
              <Input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When the item is expected to arrive on site
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this item (supplier info, delivery instructions, etc.)"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
