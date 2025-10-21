import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSuccess: () => void;
}

export const AddLineItemDialog = ({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: AddLineItemDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    original_budget: "",
    previous_report: "",
    anticipated_final: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("cost_line_items").insert({
        category_id: categoryId,
        code: formData.code,
        description: formData.description,
        original_budget: parseFloat(formData.original_budget) || 0,
        previous_report: parseFloat(formData.previous_report) || 0,
        anticipated_final: parseFloat(formData.anticipated_final) || 0,
        display_order: 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item added successfully",
      });

      onSuccess();
      setFormData({
        code: "",
        description: "",
        original_budget: "",
        previous_report: "",
        anticipated_final: "",
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
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="A1, B2..."
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Bulk Contributions"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="original_budget">Original Budget</Label>
            <Input
              id="original_budget"
              type="number"
              step="0.01"
              value={formData.original_budget}
              onChange={(e) =>
                setFormData({ ...formData, original_budget: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="previous_report">Previous Report</Label>
            <Input
              id="previous_report"
              type="number"
              step="0.01"
              value={formData.previous_report}
              onChange={(e) =>
                setFormData({ ...formData, previous_report: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="anticipated_final">Anticipated Final Cost</Label>
            <Input
              id="anticipated_final"
              type="number"
              step="0.01"
              value={formData.anticipated_final}
              onChange={(e) =>
                setFormData({ ...formData, anticipated_final: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Line Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
