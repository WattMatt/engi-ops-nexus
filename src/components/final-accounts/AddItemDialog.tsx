import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  billId: string;
  accountId: string;
  editingItem?: any;
  onSuccess: () => void;
}

export function AddItemDialog({
  open,
  onOpenChange,
  sectionId,
  billId,
  accountId,
  editingItem,
  onSuccess,
}: AddItemDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    item_code: "",
    description: "",
    unit: "",
    contract_quantity: "",
    final_quantity: "",
    supply_rate: "",
    install_rate: "",
    is_rate_only: false,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        item_code: editingItem.item_code || "",
        description: editingItem.description || "",
        unit: editingItem.unit || "",
        contract_quantity: editingItem.contract_quantity?.toString() || "",
        final_quantity: editingItem.final_quantity?.toString() || "",
        supply_rate: editingItem.supply_rate?.toString() || "",
        install_rate: editingItem.install_rate?.toString() || "",
        is_rate_only: editingItem.is_rate_only || false,
        notes: editingItem.notes || "",
      });
    } else {
      setFormData({
        item_code: "",
        description: "",
        unit: "",
        contract_quantity: "",
        final_quantity: "",
        supply_rate: "",
        install_rate: "",
        is_rate_only: false,
        notes: "",
      });
    }
  }, [editingItem, open]);

  // Calculate amounts
  const supplyRate = parseFloat(formData.supply_rate) || 0;
  const installRate = parseFloat(formData.install_rate) || 0;
  const totalRate = supplyRate + installRate;
  const contractQty = parseFloat(formData.contract_quantity) || 0;
  const finalQty = parseFloat(formData.final_quantity) || 0;
  const contractAmount = formData.is_rate_only ? 0 : contractQty * totalRate;
  const finalAmount = formData.is_rate_only ? 0 : finalQty * totalRate;
  const variationAmount = finalAmount - contractAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const itemData = {
      section_id: sectionId,
      item_code: formData.item_code,
      description: formData.description,
      unit: formData.unit || null,
      contract_quantity: contractQty,
      final_quantity: finalQty,
      supply_rate: supplyRate,
      install_rate: installRate,
      contract_amount: contractAmount,
      final_amount: finalAmount,
      variation_amount: variationAmount,
      is_rate_only: formData.is_rate_only,
      notes: formData.notes || null,
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("final_account_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Item updated");
      } else {
        // Get display order
        const { data: existingItems } = await supabase
          .from("final_account_items")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        const nextOrder = (existingItems?.[0]?.display_order || 0) + 1;

        const { error } = await supabase
          .from("final_account_items")
          .insert({ ...itemData, display_order: nextOrder });

        if (error) throw error;
        toast.success("Item added");
      }

      queryClient.invalidateQueries({ queryKey: ["final-account-items", sectionId] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit" : "Add"} Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">Item Code *</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                placeholder="e.g., B2.1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., m, No, Sum"
              />
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_rate_only"
                  checked={formData.is_rate_only}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_rate_only: checked as boolean })
                  }
                />
                <Label htmlFor="is_rate_only" className="text-sm">
                  Rate Only (no quantities)
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supply_rate">Supply Rate (R)</Label>
              <Input
                id="supply_rate"
                type="number"
                step="0.01"
                value={formData.supply_rate}
                onChange={(e) => setFormData({ ...formData, supply_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="install_rate">Install Rate (R)</Label>
              <Input
                id="install_rate"
                type="number"
                step="0.01"
                value={formData.install_rate}
                onChange={(e) => setFormData({ ...formData, install_rate: e.target.value })}
              />
            </div>
          </div>

          {!formData.is_rate_only && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_quantity">Contract Quantity</Label>
                <Input
                  id="contract_quantity"
                  type="number"
                  step="0.01"
                  value={formData.contract_quantity}
                  onChange={(e) => setFormData({ ...formData, contract_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="final_quantity">Final Measured Quantity</Label>
                <Input
                  id="final_quantity"
                  type="number"
                  step="0.01"
                  value={formData.final_quantity}
                  onChange={(e) => setFormData({ ...formData, final_quantity: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Calculated amounts display */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Calculated Amounts</p>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Rate:</span>
                <p className="font-medium">R {totalRate.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contract Amount:</span>
                <p className="font-medium">R {contractAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Final Amount:</span>
                <p className="font-medium">R {finalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Variation:</span>
                <p className={`font-medium ${variationAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R {variationAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingItem ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
