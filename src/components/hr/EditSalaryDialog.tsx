import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditSalaryDialogProps {
  employee: any;
  currentPayroll?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditSalaryDialog({
  employee,
  currentPayroll,
  open,
  onOpenChange,
  onSuccess,
}: EditSalaryDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    salary_amount: "",
    payment_frequency: "monthly",
    salary_currency: "ZAR",
    effective_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (currentPayroll && open) {
      setFormData({
        salary_amount: currentPayroll.salary_amount?.toString() || "",
        payment_frequency: currentPayroll.payment_frequency || "monthly",
        salary_currency: currentPayroll.salary_currency || "ZAR",
        effective_date: new Date().toISOString().split("T")[0],
      });
    } else if (open) {
      setFormData({
        salary_amount: "",
        payment_frequency: "monthly",
        salary_currency: "ZAR",
        effective_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [currentPayroll, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const salaryAmount = parseFloat(formData.salary_amount);
      
      if (isNaN(salaryAmount) || salaryAmount <= 0) {
        throw new Error("Please enter a valid salary amount");
      }

      // End the current payroll record if it exists
      if (currentPayroll) {
        const { error: endError } = await supabase
          .from("payroll_records")
          .update({ end_date: formData.effective_date })
          .eq("id", currentPayroll.id)
          .is("end_date", null);

        if (endError) throw endError;
      }

      // Create new payroll record
      const { error: insertError } = await supabase
        .from("payroll_records")
        .insert({
          employee_id: employee.id,
          salary_amount: salaryAmount,
          payment_frequency: formData.payment_frequency,
          salary_currency: formData.salary_currency,
          effective_date: formData.effective_date,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Salary updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary",
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
          <DialogTitle>Edit Salary</DialogTitle>
          <DialogDescription>
            Update salary for {employee?.first_name} {employee?.last_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salary_amount">Salary Amount</Label>
              <Input
                id="salary_amount"
                type="number"
                step="0.01"
                value={formData.salary_amount}
                onChange={(e) =>
                  setFormData({ ...formData, salary_amount: e.target.value })
                }
                required
                placeholder="Enter salary amount"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_currency">Currency</Label>
                <Select
                  value={formData.salary_currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, salary_currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (R)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_frequency">Frequency</Label>
                <Select
                  value={formData.payment_frequency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData({ ...formData, effective_date: e.target.value })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Salary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
