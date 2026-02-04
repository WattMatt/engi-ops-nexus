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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Package, Truck, Calendar, FileText, MapPin } from "lucide-react";

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
}

interface ContractorEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcurementItem;
  contractorName: string;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending_quote', label: 'Pending Quote' },
  { value: 'quote_received', label: 'Quote Received' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

export function ContractorEditItemDialog({
  open,
  onOpenChange,
  item,
  contractorName,
  onSuccess
}: ContractorEditItemDialogProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(item.status || 'not_started');
  const [trackingNumber, setTrackingNumber] = useState(item.tracking_number || '');
  const [expectedDelivery, setExpectedDelivery] = useState(item.expected_delivery || '');
  const [actualDelivery, setActualDelivery] = useState(item.actual_delivery || '');
  const [notes, setNotes] = useState(item.notes || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          status,
          tracking_number: trackingNumber || null,
          expected_delivery: expectedDelivery || null,
          actual_delivery: actualDelivery || null,
          notes: notes || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Update Procurement Item
          </DialogTitle>
          <DialogDescription>
            Update status, tracking info, and notes for this item
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
              {item.supplier_name && (
                <span>Supplier: {item.supplier_name}</span>
              )}
              {item.po_number && (
                <span>PO: {item.po_number}</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tracking Number
              </Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Delivery
                </Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Actual Delivery
                </Label>
                <Input
                  type="date"
                  value={actualDelivery}
                  onChange={(e) => setActualDelivery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this item (delivery instructions, issues, etc.)"
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
