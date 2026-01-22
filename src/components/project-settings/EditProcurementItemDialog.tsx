import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  supplier_name: string | null;
  expected_delivery: string | null;
  status: string;
  notes: string | null;
}

interface EditProcurementItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcurementItem;
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
  { value: 'cancelled', label: 'Cancelled' },
];

export function EditProcurementItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditProcurementItemDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    supplier_name: '',
    expected_delivery: '',
    status: 'not_started',
    notes: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        supplier_name: item.supplier_name || '',
        expected_delivery: item.expected_delivery || '',
        status: item.status || 'not_started',
        notes: item.notes || '',
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          name: formData.name,
          description: formData.description || null,
          supplier_name: formData.supplier_name || null,
          expected_delivery: formData.expected_delivery || null,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq('id', item.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Procurement item updated');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to update item: ' + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Procurement Item</DialogTitle>
          <DialogDescription>
            Update item details and tracking status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Item Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">Supplier Name</Label>
              <Input
                id="edit-supplier"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="Enter supplier..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-delivery">Expected Delivery</Label>
              <Input
                id="edit-delivery"
                type="date"
                value={formData.expected_delivery}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
