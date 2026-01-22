import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  id: string;
  item_number: string | null;
  description: string;
  area: number | null;
  area_unit: string | null;
  base_rate: number | null;
  ti_rate: number | null;
  total: number;
}

interface EditLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: LineItem | null;
  onSuccess: () => void;
}

export const EditLineItemDialog = ({
  open,
  onOpenChange,
  lineItem,
  onSuccess,
}: EditLineItemDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_number: "",
    description: "",
    area: "",
    base_rate: "",
    ti_rate: "",
    total: "",
  });

  // Populate form when lineItem changes
  useEffect(() => {
    if (lineItem) {
      setFormData({
        item_number: lineItem.item_number || "",
        description: lineItem.description || "",
        area: lineItem.area?.toString() || "",
        base_rate: lineItem.base_rate?.toString() || "",
        ti_rate: lineItem.ti_rate?.toString() || "",
        total: lineItem.total?.toString() || "",
      });
    }
  }, [lineItem]);

  // Auto-calculate total when area and rates change
  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const baseRate = parseFloat(formData.base_rate) || 0;
    const tiRate = parseFloat(formData.ti_rate) || 0;
    
    if (area > 0 && (baseRate > 0 || tiRate > 0)) {
      const calculatedTotal = area * (baseRate + tiRate);
      setFormData(prev => ({
        ...prev,
        total: calculatedTotal.toFixed(2),
      }));
    }
  }, [formData.area, formData.base_rate, formData.ti_rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineItem) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("budget_line_items")
        .update({
          item_number: formData.item_number || null,
          description: formData.description,
          area: formData.area ? parseFloat(formData.area) : null,
          base_rate: formData.base_rate ? parseFloat(formData.base_rate) : 0,
          ti_rate: formData.ti_rate ? parseFloat(formData.ti_rate) : 0,
          total: parseFloat(formData.total),
        })
        .eq("id", lineItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lineItem) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from("budget_line_items")
        .delete()
        .eq("id", lineItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item deleted successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_item_number">Item Number</Label>
              <Input
                id="edit_item_number"
                value={formData.item_number}
                onChange={(e) =>
                  setFormData({ ...formData, item_number: e.target.value })
                }
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <Label htmlFor="edit_area">Area (m²)</Label>
              <Input
                id="edit_area"
                type="number"
                step="0.01"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit_description">Description *</Label>
            <Input
              id="edit_description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Item description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_base_rate">Base Rate (R)</Label>
              <Input
                id="edit_base_rate"
                type="number"
                step="0.01"
                value={formData.base_rate}
                onChange={(e) =>
                  setFormData({ ...formData, base_rate: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit_ti_rate">TI Rate (R)</Label>
              <Input
                id="edit_ti_rate"
                type="number"
                step="0.01"
                value={formData.ti_rate}
                onChange={(e) =>
                  setFormData({ ...formData, ti_rate: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit_total">Total (R) *</Label>
            <Input
              id="edit_total"
              type="number"
              step="0.01"
              value={formData.total}
              onChange={(e) =>
                setFormData({ ...formData, total: e.target.value })
              }
              placeholder="Auto-calculated or manual"
              required
            />
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
