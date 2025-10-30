import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface InvoiceEntry {
  id: string;
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  description: string;
  amount: string;
  vat_amount: string;
}

export function BulkInvoiceImport() {
  const [invoices, setInvoices] = useState<InvoiceEntry[]>([
    { id: crypto.randomUUID(), invoice_number: "", invoice_date: "", client_name: "", description: "", amount: "", vat_amount: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addInvoice = () => {
    setInvoices([...invoices, { 
      id: crypto.randomUUID(), 
      invoice_number: "", 
      invoice_date: "", 
      client_name: "", 
      description: "", 
      amount: "", 
      vat_amount: "" 
    }]);
  };

  const removeInvoice = (id: string) => {
    if (invoices.length > 1) {
      setInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  const updateInvoice = (id: string, field: keyof InvoiceEntry, value: string) => {
    setInvoices(invoices.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invoiceData = invoices.map(inv => ({
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        client_name: inv.client_name,
        description: inv.description || '',
        amount: parseFloat(inv.amount) || 0,
        vat_amount: parseFloat(inv.vat_amount) || 0,
        total_amount: (parseFloat(inv.amount) || 0) + (parseFloat(inv.vat_amount) || 0),
        status: 'paid'
      }));

      const { error } = await supabase
        .from('invoices')
        .insert(invoiceData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${invoices.length} invoice(s) imported successfully`
      });

      setInvoices([{ 
        id: crypto.randomUUID(), 
        invoice_number: "", 
        invoice_date: "", 
        client_name: "", 
        description: "", 
        amount: "", 
        vat_amount: "" 
      }]);

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Import Historical Invoices</h3>
          <p className="text-sm text-muted-foreground">
            Add historical invoices from 2020 onwards to build your database
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {invoices.map((invoice, index) => (
            <Card key={invoice.id} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Invoice {index + 1}</h4>
                {invoices.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInvoice(invoice.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Invoice Number</Label>
                  <Input
                    required
                    value={invoice.invoice_number}
                    onChange={(e) => updateInvoice(invoice.id, 'invoice_number', e.target.value)}
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    required
                    type="date"
                    value={invoice.invoice_date}
                    onChange={(e) => updateInvoice(invoice.id, 'invoice_date', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Client Name</Label>
                  <Input
                    required
                    value={invoice.client_name}
                    onChange={(e) => updateInvoice(invoice.id, 'client_name', e.target.value)}
                    placeholder="Client name"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={invoice.description}
                    onChange={(e) => updateInvoice(invoice.id, 'description', e.target.value)}
                    placeholder="Invoice description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Amount (excl. VAT)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={invoice.amount}
                    onChange={(e) => updateInvoice(invoice.id, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>VAT Amount</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={invoice.vat_amount}
                    onChange={(e) => updateInvoice(invoice.id, 'vat_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addInvoice}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Invoice
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Importing..." : `Import ${invoices.length} Invoice(s)`}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
