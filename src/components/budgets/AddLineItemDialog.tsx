import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onSuccess: () => void;
}

export const AddLineItemDialog = ({
  open,
  onOpenChange,
  sectionId,
  onSuccess,
}: AddLineItemDialogProps) => {
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

  // Auto-calculate total when area and rates change
  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const baseRate = parseFloat(formData.base_rate) || 0;
    const tiRate = parseFloat(formData.ti_rate) || 0;
    
    let calculatedTotal = 0;
    if (area > 0 && (baseRate > 0 || tiRate > 0)) {
      calculatedTotal = area * (baseRate + tiRate);
    } else if (formData.total) {
      calculatedTotal = parseFloat(formData.total);
    }
    
    setFormData(prev => ({
      ...prev,
      total: calculatedTotal > 0 ? calculatedTotal.toFixed(2) : prev.total,
    }));
  }, [formData.area, formData.base_rate, formData.ti_rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("budget_line_items").insert({
        section_id: sectionId,
        item_number: formData.item_number || null,
        description: formData.description,
        area: formData.area ? parseFloat(formData.area) : null,
        base_rate: formData.base_rate ? parseFloat(formData.base_rate) : 0,
        ti_rate: formData.ti_rate ? parseFloat(formData.ti_rate) : 0,
        total: parseFloat(formData.total),
        display_order: 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item added successfully",
      });

      onSuccess();
      setFormData({
        item_number: "",
        description: "",
        area: "",
        base_rate: "",
        ti_rate: "",
        total: "",
      });
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
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_number">Item Number</Label>
              <Input
                id="item_number"
                value={formData.item_number}
                onChange={(e) =>
                  setFormData({ ...formData, item_number: e.target.value })
                }
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <Label htmlFor="area">Area (m²)</Label>
              <Input
                id="area"
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
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
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
              <Label htmlFor="base_rate">Base Rate (R)</Label>
              <Input
                id="base_rate"
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
              <Label htmlFor="ti_rate">TI Rate (R)</Label>
              <Input
                id="ti_rate"
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
            <Label htmlFor="total">Total (R) *</Label>
            <Input
              id="total"
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
