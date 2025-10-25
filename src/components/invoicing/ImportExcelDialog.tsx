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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportExcelDialog({ open, onOpenChange, onSuccess }: ImportExcelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseExcelData = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const excelData = await parseExcelData(file) as any[];
      
      // Handle column name variations (case-insensitive matching)
      const getColumnValue = (row: any, possibleNames: string[]) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().trim() === name.toLowerCase().trim()
          );
          if (key && row[key]) return row[key];
        }
        return null;
      };

      const projectsToImport = excelData.map((row: any) => {
        // Get project name from various possible column names
        const projectNameRaw = getColumnValue(row, ['NAME', 'Project', 'PROJECT', 'Project Name', 'PROJECT NAME']) || 
                               row[Object.keys(row)[0]]; // Fallback to first column
        const projectName = projectNameRaw ? String(projectNameRaw).trim() : '';
        
        // Get agreed fee
        const agreedFeeValue = getColumnValue(row, ['AGREED FEE', 'Agreed Fee', 'AGREED_FEE', 'Fee']);
        const agreedFee = typeof agreedFeeValue === 'string' 
          ? parseFloat(agreedFeeValue.replace(/[R,\s]/g, '')) 
          : parseFloat(agreedFeeValue || 0);

        // Get invoiced to date (previous billing)
        const invoicedValue = getColumnValue(row, ['INVOICED TO DATE', 'Previous Billing', 'PREVIOUS BILLING', 'Invoiced']);
        const invoicedToDate = typeof invoicedValue === 'string'
          ? parseFloat(invoicedValue.replace(/[R,\s]/g, ''))
          : parseFloat(invoicedValue || 0);

        // Client name - use project name if not provided
        const clientNameRaw = getColumnValue(row, ['Client', 'CLIENT', 'Client Name', 'CLIENT NAME']);
        const clientName = clientNameRaw 
          ? String(clientNameRaw).trim()
          : (projectName.includes('-') ? projectName.split('-')[0].trim() : projectName || 'Unknown Client');

        return {
          project_name: projectName,
          client_name: clientName,
          client_vat_number: getColumnValue(row, ['VAT No', 'VAT NO', 'VAT Number', 'VAT_NUMBER']),
          client_address: getColumnValue(row, ['Address', 'CLIENT ADDRESS', 'Client Address']),
          agreed_fee: agreedFee,
          total_invoiced: invoicedToDate,
          outstanding_amount: agreedFee - invoicedToDate,
          status: "active",
          created_by: user.id,
        };
      });

      // Filter out invalid rows
      const validProjects = projectsToImport.filter(p => 
        p.project_name && 
        !p.project_name.toString().includes('TOTAL') && 
        !p.project_name.toString().includes('NAME:') &&
        p.agreed_fee > 0
      );

      if (validProjects.length === 0) {
        throw new Error("No valid project data found in Excel file. Please check column names and data format.");
      }

      // Import projects
      const { data: insertedProjects, error: projectError } = await supabase
        .from("invoice_projects")
        .insert(validProjects)
        .select();

      if (projectError) throw projectError;

      // Import current invoices if data exists
      let invoiceCount = 0;
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const project = insertedProjects?.find((p, idx) => idx === i);
        
        if (!project) continue;

        // Get column value helper
        const getVal = (names: string[]) => getColumnValue(row, names);

        const claimNoValue = getVal(['INVOICE NUMBER', 'Claim No', 'CLAIM NO', 'Invoice No']);
        const currentInvoiceValue = getVal(['CURRENT INVOICE', 'Current Billing', 'CURRENT BILLING']);
        const invoicedToDateValue = getVal(['INVOICED TO DATE', 'Previous Billing', 'PREVIOUS BILLING']);

        const claimNo = typeof claimNoValue === 'string' 
          ? parseInt(claimNoValue.replace(/[^\d]/g, '')) 
          : parseInt(claimNoValue || 0);
          
        const currentInvoice = typeof currentInvoiceValue === 'string'
          ? parseFloat(currentInvoiceValue.replace(/[R,\s]/g, ''))
          : parseFloat(currentInvoiceValue || 0);
          
        const previouslyInvoiced = typeof invoicedToDateValue === 'string'
          ? parseFloat(invoicedToDateValue.replace(/[R,\s]/g, ''))
          : parseFloat(invoicedToDateValue || 0);

        if (claimNo && currentInvoice > 0) {
          const vatAmount = currentInvoice * 0.15;
          const totalAmount = currentInvoice + vatAmount;

          const { error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              project_id: project.id,
              invoice_number: `INV${String(claimNo).padStart(4, '0')}`,
              claim_number: claimNo,
              invoice_date: new Date().toISOString().split('T')[0],
              previously_invoiced: previouslyInvoiced,
              current_amount: currentInvoice,
              vat_amount: vatAmount,
              total_amount: totalAmount,
              payment_status: "pending",
              created_by: user.id,
            });

          if (!invoiceError) invoiceCount++;
        }
      }

      toast({
        title: "Import successful",
        description: `Imported ${validProjects.length} projects${invoiceCount > 0 ? ` and ${invoiceCount} invoices` : ''}`,
      });

      onOpenChange(false);
      onSuccess?.();
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Import failed",
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
          <DialogTitle>Import from Excel</DialogTitle>
          <DialogDescription>
            Upload your billing Excel file to import projects and invoices
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className="text-sm font-medium">
                  {file ? file.name : "Choose Excel file"}
                </div>
                <div className="text-xs text-muted-foreground">
                  .xlsx or .xls format
                </div>
              </label>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById("excel-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Supported column names (case-insensitive):</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li><strong>Project:</strong> NAME, Project, Project Name</li>
              <li><strong>Client:</strong> Client, Client Name (optional - uses project name if missing)</li>
              <li><strong>Agreed Fee:</strong> AGREED FEE, Agreed Fee, Fee</li>
              <li><strong>Invoiced:</strong> INVOICED TO DATE, Previous Billing</li>
              <li><strong>Claim No:</strong> INVOICE NUMBER, Claim No</li>
              <li><strong>Current:</strong> CURRENT INVOICE, Current Billing (optional)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || !file}>
            {loading ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
