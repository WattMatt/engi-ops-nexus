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
      
      // Expected columns: Project, Client, VAT No, Agreed Fee, Previous Billing, Claim No, Current Billing
      const projectsToImport = excelData.map((row: any) => ({
        project_name: row.Project || row.PROJECT || "",
        client_name: row.Client || row.CLIENT || "",
        client_vat_number: row["VAT No"] || row["VAT NO"] || null,
        client_address: null,
        agreed_fee: parseFloat(row["Agreed Fee"] || row["AGREED FEE"] || 0),
        total_invoiced: parseFloat(row["Previous Billing"] || row["PREVIOUS BILLING"] || 0),
        outstanding_amount: 0,
        status: "active",
        created_by: user.id,
      }));

      // Filter out empty rows
      const validProjects = projectsToImport.filter(p => p.project_name && p.client_name);

      if (validProjects.length === 0) {
        throw new Error("No valid project data found in Excel file");
      }

      // Import projects
      const { data: insertedProjects, error: projectError } = await supabase
        .from("invoice_projects")
        .insert(validProjects)
        .select();

      if (projectError) throw projectError;

      // Import invoices if claim data exists
      let invoiceCount = 0;
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const project = insertedProjects?.[i];
        
        if (!project) continue;

        const claimNo = row["Claim No"] || row["CLAIM NO"];
        const currentBilling = parseFloat(row["Current Billing"] || row["CURRENT BILLING"] || 0);
        const previousBilling = parseFloat(row["Previous Billing"] || row["PREVIOUS BILLING"] || 0);

        if (claimNo && currentBilling > 0) {
          const vatAmount = currentBilling * 0.15;
          const totalAmount = currentBilling + vatAmount;

          const { error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              project_id: project.id,
              invoice_number: `INV${String(claimNo).padStart(4, '0')}`,
              claim_number: parseInt(claimNo),
              invoice_date: new Date().toISOString().split('T')[0],
              previously_invoiced: previousBilling,
              current_amount: currentBilling,
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
        description: `Imported ${validProjects.length} projects and ${invoiceCount} invoices`,
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
            <p className="font-medium">Expected columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Project</li>
              <li>Client</li>
              <li>VAT No (optional)</li>
              <li>Agreed Fee</li>
              <li>Previous Billing</li>
              <li>Claim No</li>
              <li>Current Billing</li>
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
