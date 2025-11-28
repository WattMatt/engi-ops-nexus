import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface InvoiceHistoryRecord {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  invoice_month: string;
  job_name: string;
  client_details: string | null;
  vat_number: string | null;
  amount_excl_vat: number | null;
  amount_incl_vat: number | null;
  notes: string | null;
  project_id: string | null;
}

interface InvoiceHistoryEditDialogProps {
  invoice: InvoiceHistoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceHistoryEditDialog({ invoice, open, onOpenChange }: InvoiceHistoryEditDialogProps) {
  const [form, setForm] = useState({
    invoice_number: "",
    invoice_date: "",
    invoice_month: "",
    job_name: "",
    client_details: "",
    vat_number: "",
    amount_excl_vat: "",
    amount_incl_vat: "",
    notes: "",
    project_id: "",
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("project_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number || "",
        invoice_date: invoice.invoice_date || "",
        invoice_month: invoice.invoice_month || "",
        job_name: invoice.job_name || "",
        client_details: invoice.client_details || "",
        vat_number: invoice.vat_number || "",
        amount_excl_vat: invoice.amount_excl_vat?.toString() || "",
        amount_incl_vat: invoice.amount_incl_vat?.toString() || "",
        notes: invoice.notes || "",
        project_id: invoice.project_id || "",
      });
    }
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoice_history")
        .update({
          invoice_number: form.invoice_number,
          invoice_date: form.invoice_date || null,
          invoice_month: form.invoice_month,
          job_name: form.job_name,
          client_details: form.client_details || null,
          vat_number: form.vat_number || null,
          amount_excl_vat: form.amount_excl_vat ? parseFloat(form.amount_excl_vat) : null,
          amount_incl_vat: form.amount_incl_vat ? parseFloat(form.amount_incl_vat) : null,
          notes: form.notes || null,
          project_id: form.project_id || null,
        })
        .eq("id", invoice.id);

      if (error) throw error;
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const calculateVat = () => {
    const excl = parseFloat(form.amount_excl_vat);
    if (!isNaN(excl)) {
      const incl = excl * 1.15;
      setForm(prev => ({ ...prev, amount_incl_vat: incl.toFixed(2) }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Invoice #{form.invoice_number}</DialogTitle>
          <DialogDescription>
            Update invoice details, link to project, and correct any information
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project_id">Link to Project</Label>
            <Select 
              value={form.project_id} 
              onValueChange={(v) => setForm(prev => ({ ...prev, project_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project (unlinked)</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name} - {project.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={form.invoice_number}
                onChange={(e) => setForm(prev => ({ ...prev, invoice_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm(prev => ({ ...prev, invoice_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_month">Invoice Month</Label>
              <Input
                id="invoice_month"
                type="month"
                value={form.invoice_month}
                onChange={(e) => setForm(prev => ({ ...prev, invoice_month: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_name">Job / Project Name</Label>
            <Input
              id="job_name"
              value={form.job_name}
              onChange={(e) => setForm(prev => ({ ...prev, job_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_details">Client Details</Label>
            <Textarea
              id="client_details"
              value={form.client_details}
              onChange={(e) => setForm(prev => ({ ...prev, client_details: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_number">Client VAT Number</Label>
            <Input
              id="vat_number"
              value={form.vat_number}
              onChange={(e) => setForm(prev => ({ ...prev, vat_number: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_excl_vat">Amount (Excl. VAT)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount_excl_vat"
                  type="number"
                  step="0.01"
                  value={form.amount_excl_vat}
                  onChange={(e) => setForm(prev => ({ ...prev, amount_excl_vat: e.target.value }))}
                />
                <Button type="button" variant="outline" size="sm" onClick={calculateVat}>
                  Calc VAT
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_incl_vat">Amount (Incl. VAT)</Label>
              <Input
                id="amount_incl_vat"
                type="number"
                step="0.01"
                value={form.amount_incl_vat}
                onChange={(e) => setForm(prev => ({ ...prev, amount_incl_vat: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
