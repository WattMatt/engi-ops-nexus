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
          
          // Parse with header row detection - skip initial rows
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: "",
            raw: false // Get formatted values
          });
          
          console.log('Raw Excel data:', jsonData.slice(0, 3));
          console.log('First row keys:', Object.keys(jsonData[0] || {}));
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
      
      console.log('Total rows parsed:', excelData.length);
      console.log('Sample rows:', excelData.slice(0, 5));
      
      // Handle column name variations (case-insensitive matching)
      const getColumnValue = (row: any, possibleNames: string[]) => {
        // First try direct key match
        for (const name of possibleNames) {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().trim() === name.toLowerCase().trim()
          );
          if (key && row[key]) return row[key];
        }
        // Try partial match for keys like "AGREED FEE:" 
        for (const name of possibleNames) {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes(name.toLowerCase().split(' ')[0])
          );
          if (key && row[key]) return row[key];
        }
        return null;
      };

      const projectsToImport = excelData.map((row: any, index: number) => {
        // Get project name - try various columns, including unnamed first column
        const firstColumnKey = Object.keys(row)[0]; // Often the unnamed column with project names
        const projectNameRaw = getColumnValue(row, ['NAME', 'Project', 'PROJECT', 'Project Name', 'PROJECT NAME']) || 
                               row[firstColumnKey] ||
                               row['__EMPTY']; // XLSX sometimes uses __EMPTY for unnamed columns
        const projectName = projectNameRaw ? String(projectNameRaw).trim() : '';
        
        console.log(`Row ${index}: Project="${projectName}", First col key="${firstColumnKey}", Value="${row[firstColumnKey]}"`);

        // Get agreed fee - handle various formats
        const agreedFeeValue = getColumnValue(row, ['AGREED FEE', 'Agreed Fee', 'AGREED_FEE', 'Fee']);
        let agreedFee = 0;
        if (agreedFeeValue) {
          const cleanValue = String(agreedFeeValue).replace(/[R,\s]/g, '');
          agreedFee = parseFloat(cleanValue) || 0;
        }

        // Get invoiced to date (previous billing)
        const invoicedValue = getColumnValue(row, ['INVOICED TO DATE', 'Previous Billing', 'PREVIOUS BILLING', 'Invoiced']);
        let invoicedToDate = 0;
        if (invoicedValue) {
          const cleanValue = String(invoicedValue).replace(/[R,\s]/g, '');
          invoicedToDate = parseFloat(cleanValue) || 0;
        }

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
          outstanding_amount: Math.max(0, agreedFee - invoicedToDate),
          status: "active",
          created_by: user.id,
        };
      });

      // Filter out invalid rows - be more lenient
      const validProjects = projectsToImport.filter(p => {
        const hasName = p.project_name && 
                       p.project_name.length > 0 &&
                       !p.project_name.includes('TOTAL') && 
                       !p.project_name.includes('NAME:') &&
                       !p.project_name.startsWith('||');
        const hasFee = !isNaN(p.agreed_fee) && p.agreed_fee > 0;
        return hasName && hasFee;
      });

      console.log('Total rows:', excelData.length);
      console.log('Valid projects:', validProjects.length);
      console.log('Sample valid project:', validProjects[0]);

      if (validProjects.length === 0) {
        throw new Error(`No valid project data found. Checked ${excelData.length} rows. Please ensure your Excel has columns: NAME, AGREED FEE, and valid numeric fee values.`);
      }

      // Import projects
      const { data: insertedProjects, error: projectError } = await supabase
        .from("invoice_projects")
        .insert(validProjects)
        .select();

      if (projectError) throw projectError;

      // Import monthly payments from Excel columns
      const monthColumns = Object.keys(excelData[0] || {}).filter(key => 
        /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(key)
      );

      console.log('Found month columns:', monthColumns);

      let paymentCount = 0;
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const project = insertedProjects?.find((p, idx) => idx === i);
        if (!project) continue;

        // Import monthly payments
        for (const monthCol of monthColumns) {
          const amountRaw = row[monthCol];
          if (!amountRaw) continue;

          const amount = typeof amountRaw === 'string'
            ? parseFloat(amountRaw.replace(/[R,\s]/g, ''))
            : parseFloat(amountRaw || 0);

          if (amount > 0) {
            // Parse month from column name (e.g., "FEB 2025" or "MARCH 2024")
            const monthMatch = monthCol.match(/(\w+)\s*(\d{4})?/);
            if (monthMatch) {
              const monthName = monthMatch[1];
              const year = monthMatch[2] || new Date().getFullYear().toString();
              
              const monthMap: Record<string, number> = {
                JAN: 0, FEB: 1, MAR: 2, MARCH: 2, APR: 3, APRIL: 3,
                MAY: 4, MEI: 4, JUN: 5, JUNE: 5, JUL: 6, JULY: 6,
                AUG: 7, AUGUST: 7, SEP: 8, SEPT: 8, SEPTEMBER: 8,
                OCT: 9, OCTOBER: 9, NOV: 10, DEC: 11
              };

              const monthNum = monthMap[monthName.toUpperCase()];
              if (monthNum !== undefined) {
                const paymentDate = new Date(parseInt(year), monthNum, 1);
                
                const { error: paymentError } = await supabase
                  .from("monthly_payments")
                  .insert({
                    project_id: project.id,
                    payment_month: paymentDate.toISOString().split('T')[0],
                    amount: amount,
                  });

                if (!paymentError) paymentCount++;
              }
            }
          }
        }

        }
      }

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
        description: `Imported ${validProjects.length} projects, ${invoiceCount} invoices, and ${paymentCount} scheduled payments`,
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
