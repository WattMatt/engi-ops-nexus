import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedInvoice {
  invoice_number: string;
  invoice_month: string;
  job_name: string;
  client_details: string;
  vat_number: string;
  amount_excl_vat: number | null;
  amount_incl_vat: number | null;
  selected: boolean;
}

interface InvoiceHistoryImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceHistoryImporter({ open, onOpenChange }: InvoiceHistoryImporterProps) {
  const [parsedInvoices, setParsedInvoices] = useState<ParsedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const parseAmount = (value: any): number | null => {
    if (!value) return null;
    const str = String(value).replace(/[R,\s]/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const parseMonth = (monthStr: string): string => {
    // Handle various month formats: "JAN 2025:", "FEB 2025:", "Mar-25", "Apr-25", "June 2025"
    const cleaned = monthStr.replace(":", "").trim();
    
    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      january: "01", february: "02", march: "03", april: "04", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
    };
    
    // Try "Mar-25" format
    const dashMatch = cleaned.match(/^([a-zA-Z]+)-(\d{2})$/i);
    if (dashMatch) {
      const monthNum = monthMap[dashMatch[1].toLowerCase()];
      if (monthNum) {
        return `20${dashMatch[2]}-${monthNum}`;
      }
    }
    
    // Try "JAN 2025" or "June 2025" format
    const spaceMatch = cleaned.match(/^([a-zA-Z]+)\s*(\d{4})$/i);
    if (spaceMatch) {
      const monthNum = monthMap[spaceMatch[1].toLowerCase()];
      if (monthNum) {
        return `${spaceMatch[2]}-${monthNum}`;
      }
    }
    
    return cleaned;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      const invoices: ParsedInvoice[] = [];
      let currentMonth = "";

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || "").trim();
        
        // Check if this is a month header row
        if (firstCell && !firstCell.match(/^\d+$/) && (
          firstCell.includes("2025") || 
          firstCell.includes("2024") || 
          firstCell.match(/^[A-Z]{3}-\d{2}/i) ||
          firstCell.match(/^[A-Z]+\s*\d{4}/i)
        )) {
          currentMonth = parseMonth(firstCell);
          continue;
        }

        // Check if this is an invoice row (has invoice number)
        const invNumber = String(row[0] || "").trim();
        if (invNumber && invNumber.match(/^\d+$/)) {
          const jobName = String(row[2] || "").trim();
          const clientDetails = String(row[3] || "").trim();
          const vatNumber = String(row[4] || "").trim();
          const amountExcl = parseAmount(row[5]);
          const amountIncl = parseAmount(row[6]);

          if (jobName) {
            invoices.push({
              invoice_number: invNumber,
              invoice_month: currentMonth,
              job_name: jobName,
              client_details: clientDetails,
              vat_number: vatNumber,
              amount_excl_vat: amountExcl,
              amount_incl_vat: amountIncl,
              selected: true,
            });
          }
        }
      }

      setParsedInvoices(invoices);
      toast.success(`Parsed ${invoices.length} invoices from Excel`);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error("Failed to parse Excel file");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleInvoice = (index: number) => {
    setParsedInvoices(prev => prev.map((inv, i) => 
      i === index ? { ...inv, selected: !inv.selected } : inv
    ));
  };

  const toggleAll = (selected: boolean) => {
    setParsedInvoices(prev => prev.map(inv => ({ ...inv, selected })));
  };

  const handleSave = async () => {
    const selectedInvoices = parsedInvoices.filter(inv => inv.selected);
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice to import");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const invoicesToInsert = selectedInvoices.map(inv => ({
        invoice_number: inv.invoice_number,
        invoice_month: inv.invoice_month,
        job_name: inv.job_name,
        client_details: inv.client_details || null,
        vat_number: inv.vat_number || null,
        amount_excl_vat: inv.amount_excl_vat,
        amount_incl_vat: inv.amount_incl_vat,
        created_by: userData.user?.id || null,
      }));

      const { error } = await supabase
        .from("invoice_history")
        .insert(invoicesToInsert);

      if (error) throw error;

      toast.success(`Imported ${selectedInvoices.length} invoices`);
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
      setParsedInvoices([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save invoices");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const selectedCount = parsedInvoices.filter(inv => inv.selected).length;
  const totalAmount = parsedInvoices
    .filter(inv => inv.selected)
    .reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Invoice History from Excel</DialogTitle>
          <DialogDescription>
            Upload your invoice schedule Excel file to import historical records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {parsedInvoices.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="history-file" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="font-medium">Click to upload Excel file</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx and .xls files
                  </p>
                </div>
                <Input
                  id="history-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
              </Label>
              {loading && <p className="mt-4 text-sm text-muted-foreground">Parsing file...</p>}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedCount === parsedInvoices.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <span className="text-sm">
                    {selectedCount} of {parsedInvoices.length} selected
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-4 space-y-2">
                  {parsedInvoices.map((invoice, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                        invoice.selected ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={invoice.selected}
                        onCheckedChange={() => toggleInvoice(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">#{invoice.invoice_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {invoice.invoice_month}
                          </Badge>
                        </div>
                        <p className="text-sm truncate">{invoice.job_name}</p>
                        {invoice.client_details && (
                          <p className="text-xs text-muted-foreground truncate">
                            {invoice.client_details.split("-")[0]}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {invoice.amount_excl_vat !== null ? (
                          <>
                            <p className="font-medium">{formatCurrency(invoice.amount_excl_vat)}</p>
                            <p className="text-xs text-muted-foreground">excl. VAT</p>
                          </>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No amount
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setParsedInvoices([])}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Different File
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
          >
            {saving ? "Importing..." : `Import ${selectedCount} Invoices`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
