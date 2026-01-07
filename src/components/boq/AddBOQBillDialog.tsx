import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AddBOQBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boqId: string;
  editingBill?: any;
  existingBillNumbers: number[];
  onSuccess: () => void;
}

export function AddBOQBillDialog({
  open,
  onOpenChange,
  boqId,
  editingBill,
  existingBillNumbers,
  onSuccess,
}: AddBOQBillDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bill_number: "",
    bill_name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize the max bill number to avoid recalculating on every render
  const nextBillNumber = useMemo(() => {
    return existingBillNumbers.length > 0 
      ? Math.max(...existingBillNumbers) + 1 
      : 1;
  }, [existingBillNumbers]);

  useEffect(() => {
    if (editingBill) {
      setFormData({
        bill_number: editingBill.bill_number?.toString() || "",
        bill_name: editingBill.bill_name || "",
        description: editingBill.description || "",
      });
    } else {
      setFormData({
        bill_number: nextBillNumber.toString(),
        bill_name: "",
        description: "",
      });
    }
  }, [editingBill, open, nextBillNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const billNumber = parseInt(formData.bill_number);

    // Validate duplicate bill numbers
    if (editingBill) {
      // Check if bill number has changed and if the new number already exists
      const numberChanged = billNumber !== editingBill.bill_number;
      if (numberChanged && existingBillNumbers.includes(billNumber)) {
        toast.error("Bill number already exists");
        setIsSubmitting(false);
        return;
      }
    } else {
      // Check if bill number already exists for new bills
      if (existingBillNumbers.includes(billNumber)) {
        toast.error("Bill number already exists");
        setIsSubmitting(false);
        return;
      }
    }

    // For new bills, use bill_number as display_order
    // For editing, preserve the original display_order (including 0)
    const displayOrder = editingBill 
      ? (editingBill.display_order ?? billNumber)
      : billNumber;

    const billData = {
      project_boq_id: boqId,
      bill_number: billNumber,
      bill_name: formData.bill_name,
      description: formData.description || null,
      display_order: displayOrder,
    };

    try {
      if (editingBill) {
        const { error } = await supabase
          .from("boq_bills")
          .update(billData)
          .eq("id", editingBill.id);

        if (error) throw error;
        toast.success("Bill updated");
      } else {
        const { error } = await supabase
          .from("boq_bills")
          .insert(billData);

        if (error) throw error;
        toast.success("Bill added");
      }

      queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingBill ? "Edit" : "Add"} Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bill_number">Bill Number *</Label>
              <Input
                id="bill_number"
                type="number"
                min="1"
                value={formData.bill_number}
                onChange={(e) =>
                  setFormData({ ...formData, bill_number: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill_name">Bill Name *</Label>
              <Input
                id="bill_name"
                value={formData.bill_name}
                onChange={(e) =>
                  setFormData({ ...formData, bill_name: e.target.value })
                }
                placeholder="e.g., Mall Portion, Tenant, etc."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description for this bill"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingBill ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

