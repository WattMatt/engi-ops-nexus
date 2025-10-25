import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  onSuccess?: () => void;
}

export function CreateInvoiceDialog({ open, onOpenChange, project, onSuccess }: CreateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    current_amount: "",
    notes: "",
  });

  const calculateVAT = (amount: number) => amount * 0.15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentAmount = parseFloat(formData.current_amount);
      const vatAmount = calculateVAT(currentAmount);
      const totalAmount = currentAmount + vatAmount;

      // Get the next claim number
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("claim_number")
        .eq("project_id", project.id)
        .order("claim_number", { ascending: false })
        .limit(1);

      const nextClaimNumber = existingInvoices && existingInvoices.length > 0
        ? existingInvoices[0].claim_number + 1
        : 1;

      // Create invoice
      const { error: invoiceError } = await supabase.from("invoices").insert([
        {
          invoice_number: formData.invoice_number,
          project_id: project.id,
          claim_number: nextClaimNumber,
          invoice_date: formData.invoice_date,
          previously_invoiced: project.total_invoiced,
          current_amount: currentAmount,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          payment_status: "pending",
          notes: formData.notes || null,
          created_by: user.id,
        },
      ]);

      if (invoiceError) throw invoiceError;

      // Update project totals
      const newTotalInvoiced = project.total_invoiced + currentAmount;
      const newOutstanding = project.agreed_fee - newTotalInvoiced;

      const { error: updateError } = await supabase
        .from("invoice_projects")
        .update({
          total_invoiced: newTotalInvoiced,
          outstanding_amount: newOutstanding,
          status: newOutstanding <= 0 ? "completed" : "active",
        })
        .eq("id", project.id);

      if (updateError) throw updateError;

      toast({ title: "Invoice created successfully" });
      onOpenChange(false);
      onSuccess?.();
      setFormData({
        invoice_number: "",
        invoice_date: new Date().toISOString().split("T")[0],
        current_amount: "",
        notes: "",
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

  const currentAmount = parseFloat(formData.current_amount) || 0;
  const vatAmount = calculateVAT(currentAmount);
  const totalAmount = currentAmount + vatAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Generate a new invoice for {project?.project_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Agreed Fee:</span>
                <span className="font-medium">R {project?.agreed_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Previously Invoiced:</span>
                <span className="font-medium">R {project?.total_invoiced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Still Outstanding:</span>
                <span>R {project?.outstanding_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="4459"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_amount">Current Invoice Amount (R)</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                value={formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                placeholder="235000.00"
                required
              />
            </div>

            {currentAmount > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sub Total:</span>
                  <span className="font-medium">R {currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT 15%:</span>
                  <span className="font-medium">R {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Total Amount Due:</span>
                  <span>R {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
