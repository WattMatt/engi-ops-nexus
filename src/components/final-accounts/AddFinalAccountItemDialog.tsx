import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddFinalAccountItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  editingItem?: any;
  onSuccess: () => void;
}

export function AddFinalAccountItemDialog({
  open,
  onOpenChange,
  accountId,
  editingItem,
  onSuccess,
}: AddFinalAccountItemDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    item_number: "",
    description: "",
    unit: "",
    contract_quantity: "",
    final_quantity: "",
    rate: "",
    contract_amount: "",
    final_amount: "",
    variation_amount: "",
    notes: "",
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item_number: editingItem.item_number || "",
        description: editingItem.description || "",
        unit: editingItem.unit || "",
        contract_quantity: editingItem.contract_quantity || "",
        final_quantity: editingItem.final_quantity || "",
        rate: editingItem.rate || "",
        contract_amount: editingItem.contract_amount || "",
        final_amount: editingItem.final_amount || "",
        variation_amount: editingItem.variation_amount || "",
        notes: editingItem.notes || "",
      });
    } else {
      setFormData({
        item_number: "",
        description: "",
        unit: "",
        contract_quantity: "",
        final_quantity: "",
        rate: "",
        contract_amount: "",
        final_amount: "",
        variation_amount: "",
        notes: "",
      });
    }
  }, [editingItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      final_account_id: accountId,
      item_number: formData.item_number || null,
      description: formData.description,
      unit: formData.unit || null,
      contract_quantity: formData.contract_quantity ? parseFloat(formData.contract_quantity) : null,
      final_quantity: formData.final_quantity ? parseFloat(formData.final_quantity) : null,
      rate: formData.rate ? parseFloat(formData.rate) : null,
      contract_amount: formData.contract_amount ? parseFloat(formData.contract_amount) : null,
      final_amount: formData.final_amount ? parseFloat(formData.final_amount) : null,
      variation_amount: formData.variation_amount ? parseFloat(formData.variation_amount) : null,
      notes: formData.notes || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("final_account_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Failed to update item");
        return;
      }
      toast.success("Item updated");
    } else {
      const { error } = await supabase
        .from("final_account_items")
        .insert(itemData);

      if (error) {
        toast.error("Failed to add item");
        return;
      }
      toast.success("Item added");
    }

    queryClient.invalidateQueries({ queryKey: ["final-account-items", accountId] });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit" : "Add"} Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_number">Item Number</Label>
              <Input
                id="item_number"
                value={formData.item_number}
                onChange={(e) =>
                  setFormData({ ...formData, item_number: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_quantity">Contract Qty</Label>
              <Input
                id="contract_quantity"
                type="number"
                step="0.01"
                value={formData.contract_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, contract_quantity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final_quantity">Final Qty</Label>
              <Input
                id="final_quantity"
                type="number"
                step="0.01"
                value={formData.final_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, final_quantity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) =>
                  setFormData({ ...formData, rate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_amount">Contract Amount</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                value={formData.contract_amount}
                onChange={(e) =>
                  setFormData({ ...formData, contract_amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final_amount">Final Amount</Label>
              <Input
                id="final_amount"
                type="number"
                step="0.01"
                value={formData.final_amount}
                onChange={(e) =>
                  setFormData({ ...formData, final_amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variation_amount">Variation Amount</Label>
              <Input
                id="variation_amount"
                type="number"
                step="0.01"
                value={formData.variation_amount}
                onChange={(e) =>
                  setFormData({ ...formData, variation_amount: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingItem ? "Update" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
